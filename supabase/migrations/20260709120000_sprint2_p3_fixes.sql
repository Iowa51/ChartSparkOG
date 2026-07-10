-- ============================================================
-- GATED MANUAL APPLY -- do not replay blindly.
--
-- Sprint 2 / P3-FIXES -- remediates CODEX-REVIEW-P3 (CRIT-1, CRIT-2, HIGH-4,
-- MED-6 DB portions). Additive amendment to:
--   * 20260708120000_sprint2_p3_reconciliation.sql  (portal_submit_intake RPC)
--   * 20260706120002 / 20260707150000              (enforce_intake_submission_state)
--   * 20260611120000_patient_portal_foundation.sql (invites/users tables)
-- NEITHER reviewed file is rewritten (mirrors the P1/P2-FIXES amendment pattern).
-- Idempotent: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS before CREATE,
-- re-runnable REVOKE/GRANT.
--
-- DEPENDS ON (must be applied first):
--   * 20260706120000..120003, 20260707120000..150000, 20260708120000
--   * 20260611120000 (patient_portal role + invites/users tables)
--
-- Findings addressed:
--   P3-CRIT-1: portal_submit_intake is now concurrency-safe. The parent row is
--     locked (SELECT ... FOR UPDATE) BEFORE the idempotency check, serializing
--     concurrent submits; a `materialized_at` conditional claim (checked atomically)
--     is the structural single-materialization backstop.
--   P3-CRIT-2: enforce_intake_submission_state now gates the state machine on
--     reconciliation readiness -- provider_review requires submitted_at; reconciled
--     and signed require EVERY first-class row (problems/medications/allergies) to be
--     resolved (rejected OR reconciled-and-coded). The signed snapshot now records
--     ALL first-class rows WITH their disposition (accepted AND rejected) so the
--     legal record shows disposition, not omission.
--   P3-HIGH-4 / P3-MED-6: SECURITY DEFINER public.validate_portal_invite(text) and
--     public.claim_portal_invite(text,uuid,text) move invite read + claim DB writes
--     off the service role and onto a least-privilege, single-use, atomic path.
-- ============================================================

-- =========================================================================
-- P3-CRIT-1: concurrency-safe materialization RPC.
--   Re-derived VERBATIM from 20260708120000 with TWO changes:
--     1. SELECT ... FOR UPDATE locks the parent submission BEFORE the idempotency
--        check, so two concurrent patient_portal submits serialize: the second
--        blocks on the row lock, then re-reads with materialized_at set and returns
--        already_submitted=true -- it never re-materializes.
--     2. A conditional `materialized_at` claim (UPDATE ... WHERE materialized_at IS
--        NULL, row-count checked) runs before any child insert. It is the STRUCTURAL
--        backstop: even a caller that bypassed the FOR UPDATE serialization cannot
--        double-materialize because the claim matches 0 rows the second time.
--   Everything else (ownership guard, state guard, per-domain materialization,
--   NKDA suppression, code-less flagging, transactional rollback) is unchanged.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.portal_submit_intake(p_submission_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_patient UUID;
  v_sub            public.intake_submissions%ROWTYPE;
  v_responses      jsonb;
  v_item           jsonb;
  v_coded          jsonb;
  v_code           TEXT;
  v_display        TEXT;
  v_system         TEXT;
  v_sh             jsonb;
  v_val            jsonb;
  v_finding        TEXT;
  v_sys            TEXT;
  v_counts         jsonb;
  v_claimed        INT;
  n_problems       INT := 0;
  n_medications    INT := 0;
  n_allergies      INT := 0;
  n_family         INT := 0;
  n_social         INT := 0;
  n_ros            INT := 0;
  n_immun          INT := 0;
  ROS_SYSTEMS CONSTANT TEXT[] := ARRAY[
    'constitutional','eyes','ent','cardiovascular','respiratory','gi','gu',
    'musculoskeletal','integumentary','neurological','psychiatric','endocrine',
    'heme_lymphatic','allergic_immunologic'];
BEGIN
  -- --- OWNERSHIP GUARD (DEFINER bypasses RLS, so enforce identity here). ---
  v_caller_patient := (
    SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid()
  );
  IF v_caller_patient IS NULL THEN
    RAISE EXCEPTION 'portal_submit_intake: no portal identity for caller'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- --- P3-CRIT-1 SERIALIZE: lock the parent row BEFORE the idempotency check.
  --     A concurrent submit blocks here until this transaction commits, then
  --     re-reads the row (materialized_at set) and returns already_submitted. ---
  SELECT * INTO v_sub FROM public.intake_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'portal_submit_intake: submission % not found', p_submission_id
      USING ERRCODE = 'no_data_found';
  END IF;
  IF v_sub.patient_id IS DISTINCT FROM v_caller_patient THEN
    RAISE EXCEPTION 'portal_submit_intake: submission % does not belong to caller', p_submission_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- --- IDEMPOTENCY: already submitted -> return existing counts, no inserts. ---
  IF v_sub.submitted_at IS NOT NULL OR v_sub.materialized_at IS NOT NULL THEN
    SELECT jsonb_build_object(
      'submission_id', p_submission_id,
      'already_submitted', true,
      'problems',    (SELECT count(*) FROM public.problems     WHERE intake_submission_id = p_submission_id),
      'medications', (SELECT count(*) FROM public.medications  WHERE intake_submission_id = p_submission_id),
      'allergies',   (SELECT count(*) FROM public.allergies    WHERE intake_submission_id = p_submission_id),
      'family_history', (SELECT count(*) FROM public.family_history WHERE intake_submission_id = p_submission_id),
      'social_history', (SELECT count(*) FROM public.social_history WHERE intake_submission_id = p_submission_id),
      'ros_responses',  (SELECT count(*) FROM public.ros_responses  WHERE intake_submission_id = p_submission_id),
      'immunizations',  (SELECT count(*) FROM public.immunizations  WHERE intake_submission_id = p_submission_id)
    ) INTO v_counts;
    RETURN v_counts;
  END IF;

  -- --- STATE GUARD: only a fresh, patient-entered submission can be submitted. ---
  IF v_sub.status IS DISTINCT FROM 'patient_entered' THEN
    RAISE EXCEPTION 'portal_submit_intake: submission % is % (must be patient_entered)', p_submission_id, v_sub.status
      USING ERRCODE = 'raise_exception';
  END IF;

  -- --- P3-CRIT-1 STRUCTURAL CLAIM: flip the sentinel now, under the row lock,
  --     BEFORE any child insert. The conditional predicate makes a double
  --     materialization structurally impossible even without the FOR UPDATE above:
  --     the second claim matches 0 rows. Rolls back with the rest on any later
  --     RAISE (materialized_at stays NULL). ---
  UPDATE public.intake_submissions
     SET materialized_at = NOW()
   WHERE id = p_submission_id AND materialized_at IS NULL;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed <> 1 THEN
    -- Lost the claim to a concurrent submit; return idempotent counts.
    SELECT jsonb_build_object(
      'submission_id', p_submission_id,
      'already_submitted', true,
      'problems',    (SELECT count(*) FROM public.problems     WHERE intake_submission_id = p_submission_id),
      'medications', (SELECT count(*) FROM public.medications  WHERE intake_submission_id = p_submission_id),
      'allergies',   (SELECT count(*) FROM public.allergies    WHERE intake_submission_id = p_submission_id),
      'family_history', (SELECT count(*) FROM public.family_history WHERE intake_submission_id = p_submission_id),
      'social_history', (SELECT count(*) FROM public.social_history WHERE intake_submission_id = p_submission_id),
      'ros_responses',  (SELECT count(*) FROM public.ros_responses  WHERE intake_submission_id = p_submission_id),
      'immunizations',  (SELECT count(*) FROM public.immunizations  WHERE intake_submission_id = p_submission_id)
    ) INTO v_counts;
    RETURN v_counts;
  END IF;

  v_responses := COALESCE(v_sub.responses, '{}'::jsonb);

  -- --- PROBLEMS  (pmh.problems, group/icd10). code NOT NULL -> '' + needs_coding. ---
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_responses->'pmh'->'problems', '[]'::jsonb)) LOOP
    v_coded   := v_item->'coded';
    v_code    := NULLIF(btrim(COALESCE(v_coded->>'code', '')), '');
    v_display := NULLIF(btrim(COALESCE(v_coded->>'display', v_item->>'detail', '')), '');
    v_system  := v_coded->>'system';
    CONTINUE WHEN v_code IS NULL AND v_display IS NULL;
    INSERT INTO public.problems (
      organization_id, patient_id, intake_submission_id, code_system, code, display,
      source, reconciled, needs_coding, created_by)
    VALUES (
      v_sub.organization_id, v_sub.patient_id, p_submission_id,
      CASE WHEN v_system IN ('icd10','snomed') THEN v_system ELSE 'icd10' END,
      COALESCE(v_code, ''), v_display, 'patient', false, (v_code IS NULL), NULL);
    n_problems := n_problems + 1;
  END LOOP;

  -- --- MEDICATIONS  (medications.medications, group/rxnorm). name NOT NULL. ---
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_responses->'medications'->'medications', '[]'::jsonb)) LOOP
    v_coded   := v_item->'coded';
    v_code    := NULLIF(btrim(COALESCE(v_coded->>'code', '')), '');
    v_display := NULLIF(btrim(COALESCE(v_coded->>'display', v_item->>'detail', '')), '');
    CONTINUE WHEN v_code IS NULL AND v_display IS NULL;
    INSERT INTO public.medications (
      organization_id, patient_id, intake_submission_id, rxnorm_code, name,
      source, reconciled, needs_coding, created_by)
    VALUES (
      v_sub.organization_id, v_sub.patient_id, p_submission_id,
      v_code, COALESCE(v_display, 'Unspecified medication'), 'patient', false,
      (v_code IS NULL), NULL);
    n_medications := n_medications + 1;
  END LOOP;

  -- --- ALLERGIES  (allergies.nkda + allergies.allergies, group/rxnorm). ---
  IF COALESCE((v_responses->'allergies'->>'nkda')::boolean, false) THEN
    INSERT INTO public.allergies (
      organization_id, patient_id, intake_submission_id, nkda,
      source, reconciled, needs_coding, created_by)
    VALUES (v_sub.organization_id, v_sub.patient_id, p_submission_id, true,
      'patient', false, false, NULL);
    n_allergies := 1;
  ELSE
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_responses->'allergies'->'allergies', '[]'::jsonb)) LOOP
      v_coded   := v_item->'coded';
      v_code    := NULLIF(btrim(COALESCE(v_coded->>'code', '')), '');
      v_display := NULLIF(btrim(COALESCE(v_coded->>'display', v_item->>'detail', '')), '');
      CONTINUE WHEN v_code IS NULL AND v_display IS NULL;
      INSERT INTO public.allergies (
        organization_id, patient_id, intake_submission_id, allergen_code, allergen_display,
        nkda, source, reconciled, needs_coding, created_by)
      VALUES (
        v_sub.organization_id, v_sub.patient_id, p_submission_id,
        v_code, v_display, false, 'patient', false, (v_code IS NULL), NULL);
      n_allergies := n_allergies + 1;
    END LOOP;
  END IF;

  -- --- FAMILY HISTORY  (family_history.family_history, group/snomed). code NULLABLE. ---
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_responses->'family_history'->'family_history', '[]'::jsonb)) LOOP
    v_coded   := v_item->'coded';
    v_code    := NULLIF(btrim(COALESCE(v_coded->>'code', '')), '');
    v_display := NULLIF(btrim(COALESCE(v_coded->>'display', v_item->>'detail', '')), '');
    CONTINUE WHEN v_code IS NULL AND v_display IS NULL;
    INSERT INTO public.family_history (
      organization_id, patient_id, intake_submission_id, condition_code, condition_display,
      source, created_by)
    VALUES (v_sub.organization_id, v_sub.patient_id, p_submission_id, v_code, v_display, 'patient', NULL);
    n_family := n_family + 1;
  END LOOP;

  -- --- SOCIAL HISTORY  (single row from social_history scalars). ---
  IF v_responses ? 'social_history' THEN
    v_sh := v_responses->'social_history';
    IF NULLIF(btrim(COALESCE(v_sh->>'tobacco_status','')),'') IS NOT NULL
       OR NULLIF(btrim(COALESCE(v_sh->>'pack_years','')),'') IS NOT NULL
       OR NULLIF(btrim(COALESCE(v_sh->>'alcohol_audit_c','')),'') IS NOT NULL
       OR NULLIF(btrim(COALESCE(v_sh->>'occupation','')),'') IS NOT NULL
       OR NULLIF(btrim(COALESCE(v_sh->>'living_situation','')),'') IS NOT NULL THEN
      INSERT INTO public.social_history (
        organization_id, patient_id, intake_submission_id, tobacco_status, pack_years,
        alcohol_audit_c, occupation, living_situation, source, created_by)
      VALUES (
        v_sub.organization_id, v_sub.patient_id, p_submission_id,
        NULLIF(btrim(COALESCE(v_sh->>'tobacco_status','')),''),
        NULLIF(btrim(COALESCE(v_sh->>'pack_years','')),'')::numeric,
        NULLIF(btrim(COALESCE(v_sh->>'alcohol_audit_c','')),'')::int,
        NULLIF(btrim(COALESCE(v_sh->>'occupation','')),''),
        NULLIF(btrim(COALESCE(v_sh->>'living_situation','')),''),
        'patient', NULL);
      n_social := 1;
    END IF;
  END IF;

  -- --- REVIEW OF SYSTEMS  (ros.<system> = 'positive'|'negative' | {finding}). ---
  FOREACH v_sys IN ARRAY ROS_SYSTEMS LOOP
    v_val := v_responses->'ros'->v_sys;
    CONTINUE WHEN v_val IS NULL OR v_val = 'null'::jsonb;
    IF jsonb_typeof(v_val) = 'string' THEN
      v_finding := v_val #>> '{}';
    ELSIF jsonb_typeof(v_val) = 'object' THEN
      v_finding := v_val->>'finding';
    ELSE
      v_finding := NULL;
    END IF;
    CONTINUE WHEN v_finding IS NULL OR btrim(v_finding) = '';
    IF v_finding NOT IN ('positive','negative') THEN
      RAISE EXCEPTION 'portal_submit_intake: invalid ROS finding "%" for system %', v_finding, v_sys
        USING ERRCODE = 'raise_exception';
    END IF;
    INSERT INTO public.ros_responses (
      organization_id, patient_id, intake_submission_id, system, finding, created_by)
    VALUES (v_sub.organization_id, v_sub.patient_id, p_submission_id, v_sys, v_finding, NULL);
    n_ros := n_ros + 1;
  END LOOP;

  -- --- IMMUNIZATIONS  (immunizations.immunizations, group/cvx). code NULLABLE. ---
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_responses->'immunizations'->'immunizations', '[]'::jsonb)) LOOP
    v_coded   := v_item->'coded';
    v_code    := NULLIF(btrim(COALESCE(v_coded->>'code', '')), '');
    v_display := NULLIF(btrim(COALESCE(v_coded->>'display', v_item->>'detail', '')), '');
    CONTINUE WHEN v_code IS NULL AND v_display IS NULL;
    INSERT INTO public.immunizations (
      organization_id, patient_id, intake_submission_id, vaccine_code, vaccine_display,
      source, created_by)
    VALUES (v_sub.organization_id, v_sub.patient_id, p_submission_id, v_code, v_display, 'patient', NULL);
    n_immun := n_immun + 1;
  END LOOP;

  -- --- SUBMIT: set the lock (materialized_at already claimed above). ---
  UPDATE public.intake_submissions
  SET submitted_at = NOW()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'submission_id', p_submission_id,
    'already_submitted', false,
    'problems', n_problems,
    'medications', n_medications,
    'allergies', n_allergies,
    'family_history', n_family,
    'social_history', n_social,
    'ros_responses', n_ros,
    'immunizations', n_immun);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_submit_intake(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.portal_submit_intake(UUID) FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_submit_intake(UUID) TO patient_portal;

-- =========================================================================
-- P3-CRIT-2: reconciliation-readiness gate in the state-machine trigger.
--   Re-derived VERBATIM from 20260707150000 (SM-1 INSERT governance, SM-2 signed
--   snapshot rebuild, created_by immutability all preserved) with THREE additions
--   in the UPDATE transition path:
--     1. provider_review requires submitted_at IS NOT NULL (cannot review an
--        intake the patient never submitted).
--     2. reconciled/signed require EVERY first-class row (problems/medications/
--        allergies) to be resolved -- rejected=true OR (reconciled=true AND
--        needs_coding=false). An unresolved row blocks the transition, so patient-
--        entered clinical data can never be silently dropped from a signed record.
--     3. The signed snapshot now captures ALL first-class rows (accepted AND
--        rejected) via to_jsonb(row) -- the row's `reconciled`/`rejected` booleans
--        record the disposition, so the legal record shows disposition, not omission.
--   This is the DB-layer enforcement point: no route can bypass it. The status
--   route mirrors it only for good error messages.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_intake_submission_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- SM-1: new submissions may only be created at the initial state.
    IF NEW.status IS DISTINCT FROM 'patient_entered' THEN
      RAISE EXCEPTION 'intake_submission must be inserted with status ''patient_entered'' (got %); later states are reached only via the server-enforced transition path',
        NEW.status USING ERRCODE = 'raise_exception';
    END IF;
    -- SM-1: transition-derived fields cannot be supplied at insert time.
    IF NEW.signed_snapshot IS NOT NULL
       OR NEW.reviewed_by IS NOT NULL
       OR NEW.reviewed_at IS NOT NULL THEN
      RAISE EXCEPTION 'intake_submission INSERT may not set signed_snapshot/reviewed_by/reviewed_at; these are populated only by the state-transition trigger'
        USING ERRCODE = 'raise_exception';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'signed' THEN
      RAISE EXCEPTION 'intake_submission % is signed and cannot be deleted', OLD.id
        USING ERRCODE = 'raise_exception';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'intake_submission % is signed and immutable', OLD.id
      USING ERRCODE = 'raise_exception';
  END IF;

  -- DELTA2-RLS-1: created_by (provider provenance) is IMMUTABLE post-creation.
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'intake_submission % created_by is immutable and cannot be changed once set', OLD.id
      USING ERRCODE = 'raise_exception';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'patient_entered' AND NEW.status = 'provider_review') OR
      (OLD.status = 'provider_review' AND NEW.status = 'reconciled')      OR
      (OLD.status = 'reconciled'      AND NEW.status = 'signed')
    ) THEN
      RAISE EXCEPTION 'illegal intake_submission status transition: % -> %',
        OLD.status, NEW.status USING ERRCODE = 'raise_exception';
    END IF;

    -- P3-CRIT-2 (a): a submission cannot enter provider review until the patient
    -- has actually submitted it (submitted_at is the portal submit lock).
    IF NEW.status = 'provider_review' AND NEW.submitted_at IS NULL THEN
      RAISE EXCEPTION 'intake_submission % cannot enter provider_review before it is submitted (submitted_at is NULL)', NEW.id
        USING ERRCODE = 'raise_exception';
    END IF;

    -- P3-CRIT-2 (b): reconciled/signed require every first-class row resolved.
    -- Unresolved = not rejected AND (not reconciled OR still needs a code).
    IF NEW.status IN ('reconciled', 'signed') THEN
      IF EXISTS (
        SELECT 1 FROM public.problems
          WHERE intake_submission_id = NEW.id
            AND rejected = false AND (reconciled = false OR needs_coding = true)
        UNION ALL
        SELECT 1 FROM public.medications
          WHERE intake_submission_id = NEW.id
            AND rejected = false AND (reconciled = false OR needs_coding = true)
        UNION ALL
        SELECT 1 FROM public.allergies
          WHERE intake_submission_id = NEW.id
            AND rejected = false AND (reconciled = false OR needs_coding = true)
      ) THEN
        RAISE EXCEPTION 'intake_submission % has unresolved reconciliation rows; every problem, medication, and allergy must be accepted-and-coded or rejected before %', NEW.id, NEW.status
          USING ERRCODE = 'raise_exception';
      END IF;
    END IF;

    -- SM-2 + P3-CRIT-2 (c): on sign, ALWAYS rebuild the snapshot server-side
    -- (caller value discarded). First-class rows are captured IN FULL -- accepted
    -- AND rejected -- so the frozen record shows each row's disposition. ROS is all
    -- rows. The readiness gate above guarantees no unresolved row reaches here.
    IF NEW.status = 'signed' THEN
      NEW.signed_snapshot := jsonb_build_object(
        'submission_id',   NEW.id,
        'patient_id',      NEW.patient_id,
        'organization_id', NEW.organization_id,
        'template_id',     NEW.template_id,
        'responses',       NEW.responses,
        'reviewed_by',     NEW.reviewed_by,
        'signed_at',       NOW(),
        'problems',    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.problems p
                                 WHERE p.intake_submission_id = NEW.id), '[]'::jsonb),
        'medications', COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.medications m
                                 WHERE m.intake_submission_id = NEW.id), '[]'::jsonb),
        'allergies',   COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.allergies a
                                 WHERE a.intake_submission_id = NEW.id), '[]'::jsonb),
        'ros',         COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.ros_responses r
                                 WHERE r.intake_submission_id = NEW.id), '[]'::jsonb)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger events unchanged (BEFORE INSERT OR UPDATE OR DELETE, from ...150000);
-- re-created for a self-contained, idempotent amendment.
DROP TRIGGER IF EXISTS enforce_intake_submission_state ON public.intake_submissions;
CREATE TRIGGER enforce_intake_submission_state
  BEFORE INSERT OR UPDATE OR DELETE ON public.intake_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_intake_submission_state();

-- =========================================================================
-- P3-HIGH-4 / P3-MED-6: invite validate + claim as SECURITY DEFINER functions,
--   so the portal invite READ + CLAIM DB writes never use the service role.
--   Owner postgres, search_path pinned; EXECUTE granted ONLY to patient_portal
--   (the portal's least-privilege role); PUBLIC/anon/authenticated/service_role
--   revoked (Supabase default-EXECUTE-grant footgun -- see MIGRATION_LEDGER
--   "Supabase default function privileges"). The Supabase Auth admin createUser
--   call is NOT a DB write and stays in an isolated Auth-only module.
-- =========================================================================

-- Read-only invite validation (decides accept-form vs error state on the page).
CREATE OR REPLACE FUNCTION public.validate_portal_invite(p_token_hash TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.patient_portal_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.patient_portal_invites WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  IF v_inv.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'claimed');
  END IF;
  IF v_inv.expires_at < NOW() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;
  RETURN jsonb_build_object(
    'status', 'valid',
    'invite', jsonb_build_object(
      'id', v_inv.id, 'patientId', v_inv.patient_id,
      'orgId', v_inv.org_id, 'email', v_inv.email));
END;
$$;

-- Atomic, single-use invite claim (P3-MED-6). Locks the invite row (FOR UPDATE)
-- so concurrent claims serialize; inserts the portal-account link; then a
-- conditional single-use UPDATE on claimed_at IS NULL with a checked row-count.
-- The whole function is one unit: any RAISE rolls back the account link too, so
-- there is never a linked account with an unclaimed invite. The caller passes the
-- already-created Supabase Auth id and compensates (deletes it) if this returns a
-- non-ok result or raises.
CREATE OR REPLACE FUNCTION public.claim_portal_invite(
  p_token_hash TEXT, p_auth_user_id UUID, p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv       public.patient_portal_invites%ROWTYPE;
  v_ppu_id    UUID;
  v_rowcount  INT;
BEGIN
  SELECT * INTO v_inv FROM public.patient_portal_invites
    WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  IF v_inv.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'claimed');
  END IF;
  IF v_inv.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  -- A portal account already exists for this patient -> claim is not the path.
  IF EXISTS (SELECT 1 FROM public.patient_portal_users WHERE patient_id = v_inv.patient_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_exists');
  END IF;

  -- Create the portal-account link. A concurrent link (unique patient/email/auth
  -- id) surfaces as account_exists rather than a raw error.
  BEGIN
    INSERT INTO public.patient_portal_users (patient_id, auth_user_id, email, status)
    VALUES (v_inv.patient_id, p_auth_user_id, lower(p_email), 'active')
    RETURNING id INTO v_ppu_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_exists');
  END;

  -- Single-use conditional claim; row-count checked. Under the FOR UPDATE lock a
  -- concurrent claim cannot slip in, so this always affects exactly one row; a
  -- 0-row result is the structural backstop and RAISEs to roll back the link.
  UPDATE public.patient_portal_invites
     SET claimed_at = NOW(), claimed_by = v_ppu_id
   WHERE id = v_inv.id AND claimed_at IS NULL;
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount <> 1 THEN
    RAISE EXCEPTION 'claim_portal_invite: invite % was concurrently claimed', v_inv.id
      USING ERRCODE = 'raise_exception';
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'patientId', v_inv.patient_id,
    'orgId', v_inv.org_id, 'email', lower(p_email));
END;
$$;

-- Least privilege (B0 lesson): EXECUTE only to patient_portal.
REVOKE ALL ON FUNCTION public.validate_portal_invite(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_portal_invite(TEXT) FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_portal_invite(TEXT) TO patient_portal;

REVOKE ALL ON FUNCTION public.claim_portal_invite(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_portal_invite(TEXT, UUID, TEXT) FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_portal_invite(TEXT, UUID, TEXT) TO patient_portal;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
