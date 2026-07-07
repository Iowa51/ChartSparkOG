-- ============================================================
-- Sprint 0 / Phase 1 -- FIXES for CODEX-REVIEW-P1 findings SM-1, SM-2, RLS-1
-- Plan: planning/INTAKE-ERX-PROJECT-PLAN.md v1.1
--
-- Additive amendment to 20260706120000_sprint0_p1_intake_data_layer.sql.
-- The reviewed migration is NOT rewritten; this migration CREATE OR REPLACEs
-- the state-machine trigger function, re-creates its trigger to also cover
-- INSERT, and tightens the intake_templates read policy. Re-runnable
-- (CREATE OR REPLACE + DROP ... IF EXISTS before CREATE).
--
--   SM-1 (HIGH): the state machine was BEFORE UPDATE OR DELETE only, so a
--     direct INSERT ... status='signed' minted a never-reviewed, immutable
--     "signed" record. Fix: govern INSERT -- new rows may only enter at
--     'patient_entered', and transition-derived fields (signed_snapshot,
--     reviewed_by, reviewed_at) may not be supplied at insert time.
--   SM-2 (HIGH): on reconciled->signed the snapshot was built only when the
--     caller-supplied signed_snapshot was NULL, so a forged/empty snapshot
--     became the frozen legal record. Fix: the sign transition ALWAYS rebuilds
--     signed_snapshot server-side; any caller-supplied value is discarded.
--   RLS-1 (LOW): intake_templates global read was keyed on active=TRUE alone,
--     leaking an org's active templates to every other org. Fix: gate the
--     global-read disjunct on organization_id IS NULL.
-- ============================================================

-- ============================================================
-- SM-1 + SM-2: state-machine trigger now governs INSERT as well, and the
-- signed snapshot is unconditionally server-derived.
--
--   Allowed transitions (forward only, no skips) are unchanged:
--     patient_entered -> provider_review -> reconciled -> signed
--   INSERT: only status='patient_entered'; signed_snapshot/reviewed_by/
--     reviewed_at must be NULL (they are set only by later transitions).
--   On entering 'signed': signed_snapshot is ALWAYS rebuilt from the current
--     reconciled state (caller value ignored), so there is no NULL-at-sign
--     and no forged-snapshot path.
--   A signed submission remains fully immutable (no UPDATE, no DELETE).
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_intake_submission_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- SM-1: new submissions may only be created at the initial state. Later
    -- states are reachable only via the forward-only transition path below.
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

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'patient_entered' AND NEW.status = 'provider_review') OR
      (OLD.status = 'provider_review' AND NEW.status = 'reconciled')      OR
      (OLD.status = 'reconciled'      AND NEW.status = 'signed')
    ) THEN
      RAISE EXCEPTION 'illegal intake_submission status transition: % -> %',
        OLD.status, NEW.status USING ERRCODE = 'raise_exception';
    END IF;

    -- SM-2: on sign, ALWAYS rebuild the snapshot server-side. Any
    -- caller-supplied NEW.signed_snapshot is discarded -- the frozen legal
    -- record is derived only from the current reconciled state.
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

-- Re-create the trigger to also fire on INSERT (was UPDATE OR DELETE only).
DROP TRIGGER IF EXISTS enforce_intake_submission_state ON public.intake_submissions;
CREATE TRIGGER enforce_intake_submission_state
  BEFORE INSERT OR UPDATE OR DELETE ON public.intake_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_intake_submission_state();

-- ============================================================
-- RLS-1: intake_templates read policy. Global (cross-org) read is now limited
-- to ACTIVE SYSTEM templates (organization_id IS NULL). An org still reads its
-- own templates (active or not); SUPER_ADMIN reads all. Previously the bare
-- active=TRUE disjunct leaked an org's active templates to every other org.
-- ============================================================
DROP POLICY IF EXISTS intake_templates_select ON public.intake_templates;
CREATE POLICY intake_templates_select ON public.intake_templates
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NULL AND active = TRUE)
    OR organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
