-- SEC-PT3 Medium Fixes: Add WITH CHECK to all PHI table UPDATE policies,
-- scope audit_sessions INSERT to org, drop ai_prompts permissive policy.

-- ============================================================
-- 3.1.3a: users UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 3.1.3b: patients UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update org patients" ON public.patients;
CREATE POLICY "Users can update org patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================================
-- 3.1.3c: notes UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update org notes" ON public.notes;
CREATE POLICY "Users can update org notes" ON public.notes
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================================
-- 3.1.3d: encounters UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update org encounters" ON public.encounters;
CREATE POLICY "Users can update org encounters" ON public.encounters
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================================
-- 3.1.3e: appointments FOR ALL — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can manage org appointments" ON public.appointments;
CREATE POLICY "Users can manage org appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================================
-- 3.1.3f: patient_allergies UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update patient allergies" ON public.patient_allergies;
CREATE POLICY "Users can update patient allergies"
  ON public.patient_allergies FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_allergies.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_allergies.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  );

-- ============================================================
-- 3.1.3g: patient_medications UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update patient medications" ON public.patient_medications;
CREATE POLICY "Users can update patient medications"
  ON public.patient_medications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_medications.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_medications.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  );

-- ============================================================
-- 3.1.3h: patient_problems UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update patient problems" ON public.patient_problems;
CREATE POLICY "Users can update patient problems"
  ON public.patient_problems FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_problems.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_problems.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  );

-- ============================================================
-- 3.1.3i: patient_insurance UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update patient insurance" ON public.patient_insurance;
CREATE POLICY "Users can update patient insurance"
  ON public.patient_insurance FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_insurance.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_insurance.patient_id
      AND patients.organization_id = public.get_user_organization_id()
    )
  );

-- ============================================================
-- 3.1.3j: claim_lines UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "claim_lines_update" ON public.claim_lines;
CREATE POLICY "claim_lines_update" ON public.claim_lines
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

-- ============================================================
-- 3.1.4: audit_sessions INSERT — add org scope via auditor role check
-- The old policy only checked auditor_id = auth.uid() but did not
-- verify submission ownership. Add AUDITOR role requirement.
-- ============================================================
DROP POLICY IF EXISTS "Auditors can create sessions" ON public.audit_sessions;
CREATE POLICY "Auditors can create own org sessions" ON public.audit_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    auditor_id = auth.uid()
    AND public.get_user_role() IN ('AUDITOR', 'ADMIN', 'SUPER_ADMIN')
  );

-- ============================================================
-- 3.5.1: ai_prompts — drop permissive FOR ALL policy
-- prompts_all allowed any authenticated user to INSERT/UPDATE/DELETE
-- AI prompts used for clinical decision support. Writes must go
-- through service_role only. The read-only prompts_select policy
-- is retained.
-- ============================================================
DROP POLICY IF EXISTS "prompts_all" ON public.ai_prompts;
