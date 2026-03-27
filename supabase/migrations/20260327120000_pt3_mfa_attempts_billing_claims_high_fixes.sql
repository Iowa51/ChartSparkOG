-- SEC-PT3 High Fixes: mfa_attempts INSERT scope + billing_claims WITH CHECK

-- ============================================================
-- 3.1.1: mfa_attempts INSERT — scope to own user_id
-- WITH CHECK (TRUE) allowed any authenticated user to INSERT MFA
-- attempt records for ANY user, enabling cross-org lockout DoS.
-- ============================================================

DROP POLICY IF EXISTS "System can insert mfa attempts" ON public.mfa_attempts;
CREATE POLICY "Users can only insert own mfa attempts"
  ON public.mfa_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3.1.2: billing_claims FOR ALL — add WITH CHECK
-- The admin_claims_manage policy had USING but no WITH CHECK.
-- Without WITH CHECK, an ADMIN could UPDATE organization_id to
-- transfer a claim to another org (billing fraud).
-- ============================================================

DROP POLICY IF EXISTS "admin_claims_manage" ON public.billing_claims;
CREATE POLICY "admin_claims_manage" ON public.billing_claims
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT p.organization_id FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
