-- ============================================================
-- Sprint 8: Explicit service-role policies for processed_webhook_events
-- Without these, RLS blocks all access including service-role operations.
-- ============================================================

-- Allow service_role to INSERT (webhook deduplication writes)
CREATE POLICY "service_role_insert_processed_webhook_events"
  ON public.processed_webhook_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service_role to SELECT (deduplication lookups)
CREATE POLICY "service_role_select_processed_webhook_events"
  ON public.processed_webhook_events
  FOR SELECT
  TO service_role
  USING (true);
