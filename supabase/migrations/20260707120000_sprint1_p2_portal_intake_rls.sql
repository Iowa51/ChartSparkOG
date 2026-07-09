-- ============================================================
-- GATED MANUAL APPLY -- do not replay blindly.
--
-- Sprint 1 / P2 -- Patient Portal v1 intake write+read RLS for the
-- `patient_portal` role. Plan: planning/INTAKE-ERX-PROJECT-PLAN.md v1.1 (P2).
--
-- DEPENDS ON (must be applied first):
--   * 20260611120000_patient_portal_foundation.sql  (role patient_portal,
--     patient_portal_users, GRANT SELECT on patients, portal_*_self policies)
--   * 20260706120000_sprint0_p1_intake_data_layer.sql (+ ...120002 fixes)
--     (the 8 intake tables, the state-machine trigger, intake_templates)
--
-- Additive only: it adds GRANTs and NEW policies `TO patient_portal`. It does
-- NOT alter, drop, or touch any existing `TO authenticated` clinician policy,
-- so clinician-side isolation is unchanged (SCHEMA-NOTES COLLISION-CHECK).
-- Idempotent: DROP POLICY IF EXISTS before each CREATE; GRANTs are re-runnable.
--
-- KEYING (non-negotiable): every portal policy resolves patient identity via
--   patient_portal_users.auth_user_id = auth.uid() -> patient_id.
--   Portal policies NEVER call public.get_user_organization_id() /
--   get_user_role() -- those resolve to NULL for a portal session (EXECUTE is
--   granted only to `authenticated`) and would deny every row.
--
-- SUBMIT-LOCK DESIGN (see SCHEMA-NOTES "Sprint 1 / P2 portal intake"):
--   Final submit keeps status='patient_entered' and sets submitted_at=NOW().
--   `submitted_at IS NOT NULL` is the lock. The UPDATE policy USING clause
--   admits the submit write (OLD.submitted_at IS NULL) but rejects every write
--   after it; child-row policies gate on the parent submission being
--   patient_entered AND submitted_at IS NULL, so the lock propagates. The
--   patient never changes `status`, so the role-agnostic state-machine trigger
--   is respected (the provider does patient_entered -> provider_review in P3).
--
-- NOTE (spec vs. schema): Part A's "encounter_id must be NULL" INSERT rule is
--   vacuously satisfied -- none of the 8 INTAKE-WRITE tables carry an
--   encounter_id column (only `vitals` does, which the portal cannot touch), so
--   there is no column to constrain. The "source='patient'" and
--   "reconciled=false" checks are applied per table only where those columns
--   exist (source: not on ros_responses/intake_submissions; reconciled: only on
--   problems/medications/allergies). family_history/social_history/immunizations
--   carry no intake_submission_id, so their write lock is scoped to "the patient
--   has an open (patient_entered, unsubmitted) intake" rather than a specific
--   parent submission.
-- ============================================================

-- =========================================================================
-- 1. Table privileges. Postgres checks table-level privileges BEFORE RLS, so
--    these GRANTs are the outer gate; the policies below scope the rows.
--    SELECT/INSERT/UPDATE only -- no DELETE (patients never delete intake rows).
-- =========================================================================
GRANT SELECT, INSERT, UPDATE ON public.intake_submissions TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.problems           TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.medications        TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.allergies          TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.family_history     TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.social_history     TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.ros_responses      TO patient_portal;
GRANT SELECT, INSERT, UPDATE ON public.immunizations      TO patient_portal;

-- Read-only on the template catalog (portal renders the form from it).
GRANT SELECT ON public.intake_templates TO patient_portal;

-- =========================================================================
-- 2. intake_templates -- portal SELECT on ACTIVE templates only, scoped to
--    system (org NULL) or the patient's own org. Templates are non-PHI catalog;
--    this still keeps portal reads least-privilege (no other org's org-specific
--    templates, no inactive templates such as _smoke_test).
-- =========================================================================
DROP POLICY IF EXISTS portal_intake_templates_select ON public.intake_templates;
CREATE POLICY portal_intake_templates_select ON public.intake_templates
  FOR SELECT TO patient_portal
  USING (
    active = TRUE
    AND (
      organization_id IS NULL
      OR organization_id = (
        SELECT organization_id FROM public.patients
        WHERE id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
      )
    )
  );

-- =========================================================================
-- 3. OWN-SUBMISSION READ family -- SELECT own rows on every INTAKE-WRITE table
--    (resume + review-before-submit). All 8 tables carry patient_id directly;
--    a patient can only ever create rows for their own submissions (see the
--    INSERT policies), so patient_id ownership == "belongs to my submissions".
--    General chart read (signed/reconciled clinical data) is OUT OF SCOPE this
--    sprint and is not granted here.
-- =========================================================================
DO $$
DECLARE
  t TEXT;
  read_tables TEXT[] := ARRAY[
    'intake_submissions', 'problems', 'medications', 'allergies',
    'family_history', 'social_history', 'ros_responses', 'immunizations'
  ];
BEGIN
  FOREACH t IN ARRAY read_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO patient_portal USING ('
      || 'patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid()))',
      'portal_' || t || '_select', t);
  END LOOP;
END $$;

-- =========================================================================
-- 4. intake_submissions -- INSERT + UPDATE (the state driver).
-- =========================================================================

-- INSERT: own patient + own org, forced to the initial state, no
-- transition-derived fields, not pre-submitted, no clinician author. (The
-- state-machine trigger also enforces the status/derived-field rules -- belt
-- and suspenders per SM-1.)
DROP POLICY IF EXISTS portal_intake_submissions_insert ON public.intake_submissions;
CREATE POLICY portal_intake_submissions_insert ON public.intake_submissions
  FOR INSERT TO patient_portal
  WITH CHECK (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    AND organization_id = (
      SELECT organization_id FROM public.patients
      WHERE id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
    )
    AND status = 'patient_entered'
    AND submitted_at IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND signed_snapshot IS NULL
    AND created_by IS NULL
  );

-- UPDATE: save-and-resume while unsubmitted. USING pins the OLD row to
-- (own, patient_entered, NOT yet submitted) -- so the final-submit write
-- (which sets submitted_at) is admitted exactly once, and every write after it
-- is rejected. WITH CHECK keeps status pinned to patient_entered and blocks the
-- patient from setting reviewer/snapshot/author fields; it deliberately does
-- NOT require submitted_at IS NULL, so the submit action itself can set it.
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
    AND created_by IS NULL
  );

-- =========================================================================
-- 5. Submission-linked coded children WITH source+reconciled
--    (problems, medications, allergies).
--    INSERT/UPDATE only while the linked parent submission is the patient's own
--    AND still patient_entered AND unsubmitted. source forced to 'patient',
--    reconciled forced false, no clinician author.
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
    -- parent-open predicate correlated to this row's intake_submission_id
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR INSERT TO patient_portal WITH CHECK ('
      || 'patient_id = %3$s AND organization_id = %4$s '
      || 'AND source = ''patient'' AND reconciled = false AND created_by IS NULL '
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
      || '  AND source = ''patient'' AND reconciled = false AND created_by IS NULL '
      || '  AND EXISTS (SELECT 1 FROM public.intake_submissions s '
      || '    WHERE s.id = public.%2$I.intake_submission_id AND s.patient_id = %3$s '
      || '      AND s.status = ''patient_entered'' AND s.submitted_at IS NULL))',
      'portal_' || t || '_update', t, own_pat, own_org);
  END LOOP;
END $$;

-- =========================================================================
-- 6. ros_responses -- submission-linked, but NO source / NO reconciled column.
-- =========================================================================
DROP POLICY IF EXISTS portal_ros_responses_insert ON public.ros_responses;
CREATE POLICY portal_ros_responses_insert ON public.ros_responses
  FOR INSERT TO patient_portal
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

DROP POLICY IF EXISTS portal_ros_responses_update ON public.ros_responses;
CREATE POLICY portal_ros_responses_update ON public.ros_responses
  FOR UPDATE TO patient_portal
  USING (
    patient_id = (SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())
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

-- =========================================================================
-- 7. Link-less children WITH source (family_history, social_history,
--    immunizations). No intake_submission_id, no reconciled. The write lock is
--    scoped to "the patient has an open (patient_entered, unsubmitted) intake".
--    In P2 the app routes these sections to intake_submissions.responses JSONB;
--    these policies are the DB-tested latent capability for direct writes.
-- =========================================================================
DO $$
DECLARE
  t TEXT;
  own_pat CONSTANT TEXT :=
    '(SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid())';
  own_org CONSTANT TEXT :=
    '(SELECT organization_id FROM public.patients WHERE id = '
    || '(SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid()))';
  has_open CONSTANT TEXT :=
    'EXISTS (SELECT 1 FROM public.intake_submissions s WHERE s.patient_id = '
    || '(SELECT patient_id FROM public.patient_portal_users WHERE auth_user_id = auth.uid()) '
    || 'AND s.status = ''patient_entered'' AND s.submitted_at IS NULL)';
BEGIN
  FOREACH t IN ARRAY ARRAY['family_history', 'social_history', 'immunizations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR INSERT TO patient_portal WITH CHECK ('
      || 'patient_id = %3$s AND organization_id = %4$s '
      || 'AND source = ''patient'' AND created_by IS NULL AND %5$s)',
      'portal_' || t || '_insert', t, own_pat, own_org, has_open);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_' || t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %1$I ON public.%2$I FOR UPDATE TO patient_portal '
      || 'USING (patient_id = %3$s AND %5$s) '
      || 'WITH CHECK (patient_id = %3$s AND organization_id = %4$s '
      || '  AND source = ''patient'' AND created_by IS NULL AND %5$s)',
      'portal_' || t || '_update', t, own_pat, own_org, has_open);
  END LOOP;
END $$;

-- =========================================================================
-- 8. Explicit non-grants (documentation + fail-closed reminder).
--    patient_portal receives NO GRANT on vitals / screening_scores /
--    smart_triage_results / medication_interaction_log or any clinician table,
--    and NO write grant on intake_templates. Postgres denies those with
--    "permission denied" before RLS is even evaluated (privilege check precedes
--    RLS). The DB test suite asserts this zero-access explicitly.
-- =========================================================================

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
