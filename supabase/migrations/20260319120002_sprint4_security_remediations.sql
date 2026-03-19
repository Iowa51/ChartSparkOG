-- ============================================================
-- SPRINT 4: Security Remediations
-- Created: 2026-03-19
-- C1: Role-escalation prevention trigger on public.users table
-- H1: Fix audit_logs "Super admin full access audit" FOR ALL → FOR SELECT
-- ============================================================

-- ============================================================
-- C1: Add role-escalation prevention trigger to public.users
-- The trigger already exists on profiles but not on users.
-- A direct UPDATE to users.role could bypass the profiles trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_users_role_escalation()
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
      RAISE EXCEPTION 'Only administrators can create users with elevated roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_users_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_users_role_escalation
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_users_role_escalation();

-- ============================================================
-- H1: Fix audit_logs "Super admin full access audit" policy
-- Currently FOR ALL which includes INSERT — this re-creates a
-- permissive INSERT path that Sprint 1 intended to remove.
-- Change to FOR SELECT so only service_role can INSERT.
-- ============================================================

DROP POLICY IF EXISTS "Super admin full access audit" ON public.audit_logs;
CREATE POLICY "Super admin read access audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');
