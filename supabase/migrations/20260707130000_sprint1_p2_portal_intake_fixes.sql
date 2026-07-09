-- ============================================================
-- GATED MANUAL APPLY -- do not replay blindly.
--
-- Sprint 1 / P2-FIXES -- remediates CODEX-REVIEW-P2 (HIGH-1, HIGH-2) for the
-- patient portal intake RLS slice. Additive amendment to
-- 20260707120000_sprint1_p2_portal_intake_rls.sql (that migration is NOT
-- rewritten, mirroring the P1-FIXES pattern where 20260706120002 amended
-- 20260706120000). Idempotent: DROP POLICY IF EXISTS / ADD COLUMN IF NOT EXISTS
-- / CREATE INDEX IF NOT EXISTS before each object.
--
-- DEPENDS ON (must be applied first):
--   * 20260611120000_patient_portal_foundation.sql   (role patient_portal, patient_portal_users)
--   * 20260706120000..120003                          (intake tables, state machine)
--   * 20260707120000_sprint1_p2_portal_intake_rls.sql (the policies amended below)
--
-- Additive only: it ALTERs three tables to add a nullable FK column, and it
-- DROPs+CREATEs ONLY `TO patient_portal` policies it is tightening. It does NOT
-- touch any `TO authenticated` clinician policy (clinician isolation unchanged),
-- and it does NOT add DELETE grants.
--
-- KEYING (unchanged, non-negotiable): every portal policy resolves patient
--   identity via patient_portal_users.auth_user_id = auth.uid() -> patient_id.
--   Portal policies NEVER call get_user_organization_id() / get_user_role().
--
-- ------------------------------------------------------------
-- HIGH-1 (P2-RLS-1): OWN-SUBMISSION READ was over-broad.
--   20260707120000 scoped every portal SELECT to `patient_id = <self>`, which
--   also exposed same-patient rows written by later provider / P1D-import / P3
--   reconciliation workflows (source='provider'/'external_import',
--   reconciled=true, or unlinked chart rows). General chart read is OUT OF SCOPE
--   for P2. This migration re-scopes each child-table SELECT to rows that
--   actually belong to the patient's OWN intake submissions AND are still
--   patient-entered (source='patient' and, where the column exists,
--   reconciled=false). intake_submissions SELECT is intentionally left as
--   `patient_id = <self>` -- the row IS the submission, so that is already
--   exactly "own submissions".
--
-- HIGH-2 (P2-RLS-2): link-less children were reopenable.
--   family_history / social_history / immunizations had no intake_submission_id,
--   so their portal write lock was the coarse "patient has ANY open intake"
--   predicate -- a second open submission reopened UPDATE access to rows from an
--   already-submitted intake. Structural fix: add a nullable intake_submission_id
--   FK to those three tables and gate their portal writes on THEIR OWN parent
--   submission being patient_entered AND unsubmitted, exactly like
--   problems/medications/allergies. Portal writes must now always set
--   intake_submission_id (WITH CHECK ... IS NOT NULL); clinician / P1D-import /
--   provider paths may still leave it NULL (see SCHEMA-NOTES).
-- ============================================================

-- =========================================================================
-- 1. HIGH-2 schema: link the three previously link-less children to a
--    submission. Nullable + ON DELETE SET NULL, matching problems/medications/
--    allergies. Index it like the other child tables.
-- =========================================================================
ALTER TABLE public.family_history
  ADD COLUMN IF NOT EXISTS intake_submission_id UUID
  REFERENCES public.intake_submissions(id) ON DELETE SET NULL;
ALTER TABLE public.social_history
  ADD COLUMN IF NOT EXISTS intake_submission_id UUID
  REFERENCES public.intake_submissions(id) ON DELETE SET NULL;
ALTER TABLE public.immunizations
  ADD COLUMN IF NOT EXISTS intake_submission_id UUID
  REFERENCES public.intake_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_family_history_submission ON public.family_history(intake_submission_id);
CREATE INDEX IF NOT EXISTS idx_social_history_submission ON public.social_history(intake_submission_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_submission  ON public.immunizations(intake_submission_id);

-- =========================================================================
-- 2. HIGH-1: tighten OWN-SUBMISSION READ on every child table.
--    Predicate (per table, columns permitting):
--      patient_id = <self>
--      AND source = 'patient'          (excludes provider / external_import)
--      AND reconciled = false          (excludes P3-reconciled chart rows)
--      AND EXISTS(own submission linked via intake_submission_id)
--    The EXISTS is false when intake_submission_id IS NULL, so unlinked
--    provider/import chart rows are excluded even before the source check.
-- =========================================================================
DO $$
DECLARE
  t TEXT;
  own_pat CONSTANT TEXT :=
    '(SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())';
BEGIN
  -- Children WITH source + reconciled (problems, medications, allergies).
  FOREACH t IN ARRAY ARRAY['problems', 'medications', 'allergies'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR SELECT TO patient_portal USING ('
      || 'patient_id = %3$s AND source = ''patient'' AND reconciled = false '
      || 'AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '  WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s))',
      'portal_' || t || '_select', t, own_pat);
  END LOOP;

  -- Children WITH source, WITHOUT reconciled (family_history, social_history,
  -- immunizations) -- now submission-linked by section 1.
  FOREACH t IN ARRAY ARRAY['family_history', 'social_history', 'immunizations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR SELECT TO patient_portal USING ('
      || 'patient_id = %3$s AND source = ''patient'' '
      || 'AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '  WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s))',
      'portal_' || t || '_select', t, own_pat);
  END LOOP;
END $$;

-- ros_responses has no source / reconciled column; scope to own-submission link
-- only (intake_submission_id is NOT NULL on this table by schema).
DROP POLICY IF EXISTS portal_ros_responses_select ON public.ros_responses;
CREATE POLICY portal_ros_responses_select ON public.ros_responses
  FOR SELECT TO patient_portal
  USING (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.intake_submissions s
      WHERE s.id = public.ros_responses.intake_submission_id
        AND s.patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    )
  );

-- NOTE: portal_intake_submissions_select is intentionally NOT changed here --
-- `patient_id = <self>` on intake_submissions already means "my own submissions".

-- =========================================================================
-- 3. HIGH-2: rewrite the link-less children's portal write policies to gate on
--    THEIR OWN parent submission being patient_entered AND unsubmitted, and to
--    require intake_submission_id (WITH CHECK ... IS NOT NULL). This replaces the
--    coarse has_open predicate from 20260707120000 section 7, so a second open
--    submission can no longer reopen writes to rows linked to a submitted one.
--    Same shape as problems/medications/allergies, minus `reconciled` (no such
--    column on these tables).
-- =========================================================================
DO $$
DECLARE
  t TEXT;
  own_pat CONSTANT TEXT :=
    '(SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())';
  own_org CONSTANT TEXT :=
    '(SELECT organization_id FROM public.patients WHERE id = '
    || '(SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid()))';
BEGIN
  FOREACH t IN ARRAY ARRAY['family_history', 'social_history', 'immunizations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR INSERT TO patient_portal WITH CHECK ('
      || 'patient_id = %3$s AND organization_id = %4$s '
      || 'AND source = ''patient'' AND created_by IS NULL '
      || 'AND intake_submission_id IS NOT NULL '
      || 'AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '  WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s '
      || '    AND s.status = ''patient_entered'' AND s.submitted_at IS NULL))',
      'portal_' || t || '_insert', t, own_pat, own_org);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR UPDATE TO patient_portal '
      || 'USING (patient_id = %3$s '
      || '  AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '    WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s '
      || '      AND s.status = ''patient_entered'' AND s.submitted_at IS NULL)) '
      || 'WITH CHECK (patient_id = %3$s AND organization_id = %4$s '
      || '  AND source = ''patient'' AND created_by IS NULL '
      || '  AND intake_submission_id IS NOT NULL '
      || '  AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '    WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s '
      || '      AND s.status = ''patient_entered'' AND s.submitted_at IS NULL))',
      'portal_' || t || '_update', t, own_pat, own_org);
  END LOOP;
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
