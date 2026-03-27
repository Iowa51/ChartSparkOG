-- SEC-PT4-F7: Cleanup function for expired/used telehealth session tokens.
-- HIPAA data minimization — encrypted PHI should not persist beyond operational need.
-- Called by the application cron endpoint /api/cron/cleanup-telehealth-tokens.

CREATE OR REPLACE FUNCTION public.cleanup_expired_telehealth_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.telehealth_session_tokens
  WHERE used = TRUE
    AND expires_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Only service_role can execute this function
GRANT EXECUTE ON FUNCTION public.cleanup_expired_telehealth_tokens() TO service_role;
