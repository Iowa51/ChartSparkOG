-- SEC-PT3-F1 (Critical): Remove UUID params from SECURITY DEFINER MFA functions.
-- is_mfa_locked_out(UUID) allowed any authenticated user to check any user's
-- lockout status. get_recovery_codes_count(UUID) allowed checking any user's
-- recovery code count. Both now use auth.uid() internally.

-- Drop the old parameterised versions
DROP FUNCTION IF EXISTS public.is_mfa_locked_out(UUID);
DROP FUNCTION IF EXISTS public.get_recovery_codes_count(UUID);

-- Recreate is_mfa_locked_out() — no parameters, uses auth.uid()
CREATE OR REPLACE FUNCTION public.is_mfa_locked_out()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM public.mfa_attempts
  WHERE user_id = auth.uid()
    AND success = FALSE
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN failed_count >= 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_mfa_locked_out() TO authenticated;

-- Recreate get_recovery_codes_count() — no parameters, uses auth.uid()
CREATE OR REPLACE FUNCTION public.get_recovery_codes_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  code_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO code_count
  FROM public.user_recovery_codes
  WHERE user_id = auth.uid()
    AND used = FALSE;

  RETURN code_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recovery_codes_count() TO authenticated;
