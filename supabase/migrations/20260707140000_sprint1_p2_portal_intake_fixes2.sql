-- ============================================================
-- GATED MANUAL APPLY -- do not replay blindly.
--
-- Sprint 1 / P2-FIXES-2 -- remediates CODEX-REVIEW-P2-DELTA (DELTA-RLS-1) for the
-- patient portal intake RLS slice. Additive amendment to
-- 20260707120000_sprint1_p2_portal_intake_rls.sql and
-- 20260707130000_sprint1_p2_portal_intake_fixes.sql (NEITHER is rewritten;
-- mirrors the P1-FIXES / P2-FIXES amendment pattern). Idempotent:
-- DROP POLICY IF EXISTS before each CREATE.
--
-- DEPENDS ON (must be applied first):
--   * 20260611120000_patient_portal_foundation.sql
--   * 20260706120000..120003                          (intake tables, state machine)
--   * 20260707120000_sprint1_p2_portal_intake_rls.sql  (base portal policies)
--   * 20260707130000_sprint1_p2_portal_intake_fixes.sql (HIGH-1/HIGH-2 fixes)
--
-- KEYING (unchanged, non-negotiable): every portal policy resolves patient
--   identity via patient_portal_users.auth_user_id = auth.uid() -> patient_id.
--   Portal policies NEVER call get_user_organization_id() / get_user_role().
--
-- ------------------------------------------------------------
-- DELTA-RLS-1 (HIGH): HIGH-1 was incomplete for CLINICIAN-authored child rows.
--
--   Portal-authored child rows ALWAYS carry created_by IS NULL -- the INSERT
--   policies force it. Clinician / P1D-import rows carry a NON-NULL created_by
--   (and, where the column exists, source <> 'patient' or reconciled = true).
--   Two gaps survived ...130000:
--
--   (a) SELECT scope did not exclude created_by-authored rows. ros_responses has
--       NO source / NO reconciled column, so its own-submission SELECT admitted a
--       CLINICIAN-authored ROS row linked to the patient's own submission. The
--       source/reconciled tables were narrower but still did not defend against a
--       created_by-stamped row that happened to carry source='patient'.
--
--   (b) UPDATE USING (OLD-row scope) checked only patient + open-parent, while the
--       ownership predicates (source='patient', reconciled=false, created_by IS
--       NULL) lived ONLY in WITH CHECK (NEW-row scope). A clinician/reconciled row
--       linked to the patient's own OPEN submission was therefore selectable by
--       USING and could be REWRITTEN into the portal-owned shape -- a row hijack
--       (e.g. a provider-authored, reconciled problem rewritten into a
--       patient-authored, unreconciled one).
--
--   FIX: add the OLD-row ownership predicates to BOTH the SELECT USING and the
--   UPDATE USING of every portal-owned child table:
--       created_by IS NULL                       (all seven child tables)
--       AND source = 'patient'                   (all but ros_responses)
--       AND reconciled = false                   (problems / medications / allergies)
--   INSERT WITH CHECK and UPDATE WITH CHECK were already correct and are preserved
--   verbatim below (re-created only so each policy reads as one complete unit).
--
--   NOT CHANGED (by design): intake_submissions. Its row IS the submission, so
--   patient_id = <self> already means "own submission"; and a provider-INITIATED
--   submission (created_by set, still patient_entered) is a legitimate row the
--   patient must be able to complete -- the status + submitted_at gate is the
--   correct lock there, NOT created_by. INSERT policies are unchanged (no OLD row
--   exists on INSERT, so there is no old-row scope to tighten).
-- ============================================================

-- =========================================================================
-- 1. Children WITH source + reconciled (problems, medications, allergies).
--    SELECT + UPDATE re-scoped to patient-authored, unreconciled, own-submission
--    rows. UPDATE USING now carries the ownership predicates so a clinician /
--    reconciled row cannot be targeted and rewritten.
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
  FOREACH t IN ARRAY ARRAY['problems', 'medications', 'allergies'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR SELECT TO patient_portal USING ('
      || 'patient_id = %3$s AND source = ''patient'' AND reconciled = false '
      || 'AND created_by IS NULL '
      || 'AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '  WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s))',
      'portal_' || t || '_select', t, own_pat);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR UPDATE TO patient_portal '
      || 'USING (patient_id = %3$s AND source = ''patient'' AND reconciled = false '
      || '  AND created_by IS NULL '
      || '  AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '    WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s '
      || '      AND s.status = ''patient_entered'' AND s.submitted_at IS NULL)) '
      || 'WITH CHECK (patient_id = %3$s AND organization_id = %4$s '
      || '  AND source = ''patient'' AND reconciled = false AND created_by IS NULL '
      || '  AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '    WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s '
      || '      AND s.status = ''patient_entered'' AND s.submitted_at IS NULL))',
      'portal_' || t || '_update', t, own_pat, own_org);
  END LOOP;
END $$;

-- =========================================================================
-- 2. Children WITH source, WITHOUT reconciled (family_history, social_history,
--    immunizations). Same tightening minus the reconciled predicate. UPDATE
--    WITH CHECK keeps the ...130000 `intake_submission_id IS NOT NULL` guard.
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR SELECT TO patient_portal USING ('
      || 'patient_id = %3$s AND source = ''patient'' AND created_by IS NULL '
      || 'AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '  WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s))',
      'portal_' || t || '_select', t, own_pat);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR UPDATE TO patient_portal '
      || 'USING (patient_id = %3$s AND source = ''patient'' AND created_by IS NULL '
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

-- =========================================================================
-- 3. ros_responses -- NO source / NO reconciled column. created_by IS NULL is the
--    ONLY discriminator between a patient-authored ROS row and a clinician one,
--    so it is the load-bearing predicate here (both SELECT and UPDATE USING).
--    intake_submission_id is NOT NULL on this table by schema.
-- =========================================================================
DROP POLICY IF EXISTS portal_ros_responses_select ON public.ros_responses;
CREATE POLICY portal_ros_responses_select ON public.ros_responses
  FOR SELECT TO patient_portal
  USING (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND created_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.intake_submissions s
      WHERE s.id = public.ros_responses.intake_submission_id
        AND s.patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS portal_ros_responses_update ON public.ros_responses;
CREATE POLICY portal_ros_responses_update ON public.ros_responses
  FOR UPDATE TO patient_portal
  USING (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND created_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.intake_submissions s
      WHERE s.id = public.ros_responses.intake_submission_id
        AND s.patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
        AND s.status = 'patient_entered'
        AND s.submitted_at IS NULL
    )
  )
  WITH CHECK (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND organization_id = (
      SELECT organization_id FROM public.patients
      WHERE id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    )
    AND created_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.intake_submissions s
      WHERE s.id = public.ros_responses.intake_submission_id
        AND s.patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
        AND s.status = 'patient_entered'
        AND s.submitted_at IS NULL
    )
  );

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
