-- ============================================================
-- GATED MANUAL APPLY -- do not replay blindly.
--
-- Sprint 1 / P2-FIXES-3 -- remediates CODEX-REVIEW-P2-DELTA2 (DELTA2-RLS-1, the
-- single HIGH). Additive amendment to:
--   * 20260706120000_sprint0_p1_intake_data_layer.sql (+ ...120002)  -- state machine
--   * 20260707120000_sprint1_p2_portal_intake_rls.sql                -- portal UPDATE policy
-- NEITHER reviewed file is rewritten (mirrors the P1-FIXES / P2-FIXES /
-- P2-FIXES-2 amendment pattern). Idempotent: CREATE OR REPLACE FUNCTION,
-- DROP TRIGGER/POLICY IF EXISTS before each CREATE.
--
-- DEPENDS ON (must be applied first):
--   * 20260706120000..120002   (intake tables, enforce_intake_submission_state)
--   * 20260707120000           (base portal policies)
--   * 20260707130000, ...140000 (HIGH-1/HIGH-2 + DELTA-RLS-1 child-table fixes)
--
-- ------------------------------------------------------------
-- DELTA2-RLS-1 (HIGH): a provider-INITIATED intake_submissions row (created_by
--   set, still patient_entered, unsubmitted) is a legitimate row the patient must
--   be able to complete. The base portal UPDATE policy (...120000) tried to protect
--   the provider provenance by pinning `created_by IS NULL` in WITH CHECK -- but
--   that pin is satisfiable by NULLING created_by, so the patient could NOT save
--   the row normally (created_by preserved -> WITH CHECK reject) yet COULD save it
--   by clearing the provider's created_by (rowcount 1). That let the patient_portal
--   role erase provider-set provenance on the submission row.
--
--   FIX (two parts, splitting the invariant to its correct home):
--     1. Make created_by IMMUTABLE post-creation in the role-agnostic state-machine
--        trigger: on UPDATE, NEW.created_by IS NOT DISTINCT FROM OLD.created_by.
--        Provenance (who authored the submission) never changes after the row is
--        created, for ANY role. This is the correct home for the invariant -- it
--        holds regardless of entry path (portal, clinician, RPC, service role),
--        not just for the one portal policy.
--     2. Drop the `created_by IS NULL` clause from the portal UPDATE WITH CHECK.
--        The trigger now guarantees created_by cannot change, so the WITH CHECK no
--        longer needs (and must not have) a clause a patient can satisfy by nulling
--        the field. The patient can now complete a provider-initiated submission
--        with created_by preserved; nulling or altering it raises in the trigger.
--
--   Other intake_submissions columns were verified NOT patient-provenance the
--   patient can tamper with: reviewed_by / reviewed_at / signed_snapshot are kept
--   forbidden on a patient write by the UPDATE WITH CHECK (must stay NULL) AND are
--   transition-derived by the trigger (set only by provider transitions), so they
--   need no created_by-style immutability clause. organization_id and patient_id
--   are pinned to self in WITH CHECK; status is pinned to patient_entered;
--   submitted_at is the patient's own submit lock (mutable once, by design).
-- ============================================================

-- =========================================================================
-- 1. State machine: created_by is immutable once the row exists (ALL roles).
--    Re-derived VERBATIM from 20260706120002 (INSERT governance SM-1 + the SM-2
--    unconditional signed_snapshot rebuild preserved) with ONE added UPDATE-path
--    invariant. 20260706120002 is the latest prior definition of this function;
--    this replaces it in place. If that function is ever edited again, mirror the
--    created_by guard below.
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

  -- DELTA2-RLS-1: created_by (provider provenance) is IMMUTABLE post-creation for
  -- EVERY role. It is set once at INSERT -- NULL for a patient-initiated
  -- submission, the provider's user id for a provider-initiated one -- and never
  -- changes afterward. This is what lets the portal UPDATE policy drop its
  -- `created_by IS NULL` WITH CHECK pin (which a patient could satisfy by nulling
  -- the field) while still making it impossible for the patient to alter it.
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

    -- SM-2: on sign, ALWAYS rebuild the snapshot server-side; caller value discarded.
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
                                 WHERE p.intake_submission_id = NEW.id AND p.reconciled), '[]'::jsonb),
        'medications', COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.medications m
                                 WHERE m.intake_submission_id = NEW.id AND m.reconciled), '[]'::jsonb),
        'allergies',   COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.allergies a
                                 WHERE a.intake_submission_id = NEW.id AND a.reconciled), '[]'::jsonb),
        'ros',         COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.ros_responses r
                                 WHERE r.intake_submission_id = NEW.id), '[]'::jsonb)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger events unchanged (BEFORE INSERT OR UPDATE OR DELETE, from ...120002);
-- re-created for a self-contained, idempotent amendment.
DROP TRIGGER IF EXISTS enforce_intake_submission_state ON public.intake_submissions;
CREATE TRIGGER enforce_intake_submission_state
  BEFORE INSERT OR UPDATE OR DELETE ON public.intake_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_intake_submission_state();

-- =========================================================================
-- 2. Portal intake_submissions UPDATE policy: drop the created_by IS NULL pin.
--    The trigger (part 1) now guarantees created_by immutability, so a
--    provider-initiated submission (created_by set) can be completed by the
--    patient, and the patient still cannot alter created_by. USING is UNCHANGED
--    (the submit lock: own + patient_entered + not-yet-submitted). WITH CHECK
--    keeps every other guard (own patient/org, status pinned to patient_entered,
--    reviewer/snapshot forbidden); ONLY the `created_by IS NULL` clause is removed.
-- =========================================================================
DROP POLICY IF EXISTS portal_intake_submissions_update ON public.intake_submissions;
CREATE POLICY portal_intake_submissions_update ON public.intake_submissions
  FOR UPDATE TO patient_portal
  USING (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND status = 'patient_entered'
    AND submitted_at IS NULL
  )
  WITH CHECK (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND organization_id = (
      SELECT organization_id FROM public.patients
      WHERE id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    )
    AND status = 'patient_entered'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND signed_snapshot IS NULL
  );

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
