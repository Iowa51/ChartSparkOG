-- ============================================================
-- SEC-AUDIT-2026-04-10: Dedicated invite token model for telehealth.
-- The previous flow passed appointment_id in the invite URL, which acted as
-- access-bearing material. This replaces that with opaque random tokens whose
-- hash is stored server-side with single-use + TTL enforcement.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.telehealth_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('provider', 'patient')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_invite_tokens_appointment
  ON public.telehealth_invite_tokens (appointment_id);

CREATE INDEX IF NOT EXISTS idx_telehealth_invite_tokens_expires
  ON public.telehealth_invite_tokens (expires_at);

ALTER TABLE public.telehealth_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Service role is the only principal that should read/write these records.
-- Clients never query this table directly; lookup happens via accept-invite.
CREATE POLICY "service_role_insert_telehealth_invite_tokens"
  ON public.telehealth_invite_tokens
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_select_telehealth_invite_tokens"
  ON public.telehealth_invite_tokens
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "service_role_update_telehealth_invite_tokens"
  ON public.telehealth_invite_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_delete_telehealth_invite_tokens"
  ON public.telehealth_invite_tokens
  FOR DELETE
  TO service_role
  USING (true);

-- Extend cleanup to remove stale invite tokens as well.
CREATE OR REPLACE FUNCTION public.cleanup_expired_telehealth_invite_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.telehealth_invite_tokens
  WHERE (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours')
     OR (expires_at < NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_telehealth_invite_tokens() TO service_role;
