-- ============================================================
-- Sprint 7: Short-lived telehealth join session references
-- ============================================================

CREATE TABLE IF NOT EXISTS public.telehealth_session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('provider', 'patient')),
  encrypted_room_url TEXT NOT NULL,
  encrypted_meeting_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_session_tokens_appointment
ON public.telehealth_session_tokens (appointment_id);

CREATE INDEX IF NOT EXISTS idx_telehealth_session_tokens_expires
ON public.telehealth_session_tokens (expires_at);

ALTER TABLE public.telehealth_session_tokens ENABLE ROW LEVEL SECURITY;
