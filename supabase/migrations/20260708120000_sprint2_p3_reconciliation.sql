-- ============================================================
-- GATED MANUAL APPLY -- do not replay blindly.
--
-- Sprint 2 / P3 -- Provider reconciliation + child-row materialization.
-- Plan: planning/INTAKE-ERX-PROJECT-PLAN.md v1.1 (P3).
--
-- Additive amendment to the Sprint 0/1 intake layer. It:
--   1. Adds provider-reconciliation ATTRIBUTION columns (reconciled_by,
--      reconciled_at), a REJECT soft-flag (rejected), and a code-less flag
--      (needs_coding) to the three first-class coded child tables
--      (problems, medications, allergies).
--   2. Adds a `materialized_at` idempotency sentinel to intake_submissions.
--   3. Adds the SECURITY DEFINER RPC public.portal_submit_intake(uuid) that
--      materializes structured child rows from intake_submissions.responses on
--      final submit -- atomic with the submit write, idempotent, NKDA-aware.
--
-- DEPENDS ON (must be applied first):
--   * 20260706120000..120003   (intake tables, state machine, snapshot builder)
--   * 20260611120000           (patient_portal role, patient_portal_users)
--   * 20260707120000..150000   (portal RLS slice + fixes; family/social/immun
--                               gained intake_submission_id in ...130000)
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION. Modifies NO existing policy or trigger.
--
-- MATERIALIZATION DESIGN (SCHEMA-NOTES "Sprint 2 / P3"): materialization is a
-- SECURITY DEFINER RPC owned by the system (postgres), NOT patient-role INSERTs.
--   * WHY DEFINER: the whole materialize+submit is one server-enforced,
--     idempotent, atomic unit -- immune to app-layer partial failure and to the
--     submit-lock timing (submitted_at IS NOT NULL closes patient child writes).
--     It mirrors the existing SM-2 pattern where signed_snapshot is built in SQL.
--   * SAFETY (B0 lesson): REVOKE ALL FROM PUBLIC + explicit REVOKE EXECUTE FROM
--     anon/authenticated/service_role; EXECUTE granted ONLY to patient_portal;
--     search_path pinned; and -- because DEFINER bypasses RLS -- an explicit
--     auth.uid() OWNERSHIP guard in the body, so it only ever writes the caller's
--     own submission's children.
-- ============================================================

-- =========================================================================
-- 1. Reconciliation attribution + reject + code-less flag columns.
--    Only the three FIRST-CLASS coded child tables get per-row reconciliation
--    (problems, medications, allergies already carry `reconciled`). The other
--    domains (family_history, social_history, ros_responses, immunizations) are
--    "listable" -- materialized as source='patient' rows and advanced with the
--    submission; they are not per-row reconcile targets in v1.
--
--    reconciled_by / reconciled_at : provider attribution on accept/edit
--      (`reconciled` flips true; `source` stays 'patient' per Guardrail 5).
--    rejected                      : provider REJECT soft-flag (design: a
--      boolean, NOT a status column -- the row is retained for audit, excluded
--      from the signed snapshot by keeping reconciled=false; see SCHEMA-NOTES).
--    needs_coding                  : materialization set this true for a
--      code-less (free-text) row; the reconcile UI resolves it via the coded
--      pickers. A needs_coding row must be coded before it can be reconciled.
-- =========================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['problems', 'medications', 'allergies'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES users(id)', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS rejected BOOLEAN NOT NULL DEFAULT FALSE', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS needs_coding BOOLEAN NOT NULL DEFAULT FALSE', t);
    -- Queue counts unreconciled + code-less rows per submission.
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (intake_submission_id, reconciled, rejected)',
      'idx_' || t || '_reconcile', t);
  END LOOP;
END $$;

-- Idempotency sentinel: set once, when the submission is materialized on submit.
ALTER TABLE public.intake_submissions ADD COLUMN IF NOT EXISTS materialized_at TIMESTAMPTZ;

-- =========================================================================
-- 2. Materialization RPC. Reads intake_submissions.responses (the P2 renderer
--    payload), inserts structured child rows for 7 domains, then sets
--    submitted_at + materialized_at -- all in one transaction unit.
--
--    Row invariants for every materialized row: source='patient' (where the
--    column exists), reconciled=false, intake_submission_id=<submission>,
--    created_by=NULL. Codes carried through when present; code-less rows get
--    needs_coding=true (problems/medications/allergies) or a NULL code
--    (family_history/immunizations).
--
--    NKDA: responses.allergies.nkda === true materializes ONE nkda=true allergy
--    row and SUPPRESSES the allergen rows.
--
--    Idempotent: if the submission is already submitted (submitted_at set), it
--    returns the existing counts WITHOUT inserting -- a retry never duplicates.
--
--    Rollback: any RAISE (ownership, bad state, malformed clinical value) aborts
--    the whole call, so no partial child rows and submitted_at stays NULL.
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

  SELECT * INTO v_sub FROM public.intake_submissions WHERE id = p_submission_id;
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
    -- NKDA: one nkda row, allergen rows suppressed.
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
  --     Malformed finding RAISEs -> proves the whole call rolls back (Part D).
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

  -- --- SUBMIT: set the lock + the idempotency sentinel (fires the SM trigger:
  --     created_by unchanged, status unchanged, not signed -> passes). ---
  UPDATE public.intake_submissions
  SET submitted_at = NOW(), materialized_at = NOW()
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

-- Least privilege (B0 lesson): no PUBLIC, no default Supabase grants; only the
-- patient_portal role may execute it. Owner (postgres) retains EXECUTE inherently.
REVOKE ALL ON FUNCTION public.portal_submit_intake(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.portal_submit_intake(UUID) FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_submit_intake(UUID) TO patient_portal;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
