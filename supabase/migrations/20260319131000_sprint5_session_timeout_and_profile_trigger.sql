-- Sprint 5 Group 3: align server-side session tracking with profiles and
-- close the INSERT bypass on the profiles role-escalation trigger.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_at
  ON public.profiles (last_activity_at)
  WHERE last_activity_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;

    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'SUPER_ADMIN' THEN
      RAISE EXCEPTION 'Only super administrators can change organization assignments';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role IN ('ADMIN', 'SUPER_ADMIN') THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      RAISE EXCEPTION 'Only administrators can create profiles with elevated roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;

CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();
