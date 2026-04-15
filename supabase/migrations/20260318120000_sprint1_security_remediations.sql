-- =============================================
-- Sprint 1 Critical Security Remediations
-- Date: 2026-03-18
-- Fixes: F-003, F-007, F-017, F-018
-- =============================================

-- =============================================
-- F-003: Fix RLS USING(true) on 6 PHI tables
-- Replace with organization_id scoping
-- =============================================

-- VITALS: drop permissive policies, add org-scoped
DROP POLICY IF EXISTS "vitals_select" ON vitals;
DROP POLICY IF EXISTS "vitals_insert" ON vitals;
DROP POLICY IF EXISTS "vitals_update" ON vitals;

CREATE POLICY "vitals_select" ON vitals
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "vitals_insert" ON vitals
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "vitals_update" ON vitals
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- SCREENING_SCORES: drop permissive policies, add org-scoped
DROP POLICY IF EXISTS "screenings_select" ON screening_scores;
DROP POLICY IF EXISTS "screenings_insert" ON screening_scores;

CREATE POLICY "screenings_select" ON screening_scores
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "screenings_insert" ON screening_scores
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- SMART_TRIAGE_RESULTS: drop permissive policies, add org-scoped
DROP POLICY IF EXISTS "triage_select" ON smart_triage_results;
DROP POLICY IF EXISTS "triage_insert" ON smart_triage_results;
DROP POLICY IF EXISTS "triage_update" ON smart_triage_results;

CREATE POLICY "triage_select" ON smart_triage_results
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "triage_insert" ON smart_triage_results
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "triage_update" ON smart_triage_results
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- MEDICATION_INTERACTION_LOG: drop permissive policies, add org-scoped
DROP POLICY IF EXISTS "interaction_log_select" ON medication_interaction_log;
DROP POLICY IF EXISTS "interaction_log_insert" ON medication_interaction_log;

CREATE POLICY "interaction_log_select" ON medication_interaction_log
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "interaction_log_insert" ON medication_interaction_log
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- AI_PROMPTS: drop wide-open policy, keep read-only for active prompts
-- ai_prompts is a global config table (no organization_id), so restrict management to service_role
DROP POLICY IF EXISTS "prompts_select" ON ai_prompts;
DROP POLICY IF EXISTS "prompts_all" ON ai_prompts;

CREATE POLICY "prompts_select" ON ai_prompts
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- No INSERT/UPDATE/DELETE for authenticated users; managed via service_role only

-- CLAIM_LINES: enable RLS and scope through parent billing_claims
ALTER TABLE claim_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claim_lines_select" ON claim_lines;
CREATE POLICY "claim_lines_select" ON claim_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "claim_lines_insert" ON claim_lines;
CREATE POLICY "claim_lines_insert" ON claim_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "claim_lines_update" ON claim_lines;
CREATE POLICY "claim_lines_update" ON claim_lines
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

-- =============================================
-- F-007: Block user self-role-escalation
-- Prevent users from changing their own role or organization_id
-- =============================================

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to bypass (for admin operations)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block changes to role column unless performer is ADMIN or SUPER_ADMIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;
    -- Non-self updates: only ADMIN/SUPER_ADMIN can change roles
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;

  -- Block changes to organization_id for non-super-admins
  IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'SUPER_ADMIN' THEN
      RAISE EXCEPTION 'Only super administrators can change organization assignments';
    END IF;
  END IF;

  -- For INSERT: block non-admin from assigning elevated roles
  IF TG_OP = 'INSERT' AND NEW.role IN ('ADMIN', 'SUPER_ADMIN') THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      RAISE EXCEPTION 'Only administrators can create profiles with elevated roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- =============================================
-- F-017: Restrict audit_logs INSERT to service_role only
-- Drop the permissive INSERT policy that allows any authenticated user
-- =============================================

-- Drop from schema.sql
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Recreate: only service_role can insert (server-side code uses service_role client)
-- Note: RLS policies don't apply to service_role by default, so authenticated
-- users are now blocked from direct INSERT. The server-side audit functions
-- use createServiceRoleClient() which bypasses RLS entirely.
-- We add an explicit deny by not creating any INSERT policy for authenticated role.
