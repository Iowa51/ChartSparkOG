-- ============================================================
-- Sprint 6: Durable Stripe webhook idempotency tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
