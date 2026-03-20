-- ============================================================
-- Sprint 8: Single-use enforcement for telehealth join tokens
-- ============================================================

-- Add 'used' column to track whether a token has been redeemed
ALTER TABLE public.telehealth_session_tokens
  ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE;

-- Composite index for the atomic claim query
CREATE INDEX IF NOT EXISTS idx_telehealth_session_tokens_claim
  ON public.telehealth_session_tokens (token_id, used);
