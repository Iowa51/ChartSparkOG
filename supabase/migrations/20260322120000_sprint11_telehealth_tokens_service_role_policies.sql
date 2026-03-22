-- ============================================================
-- Sprint 11: Explicit service-role policies for telehealth_session_tokens
-- RLS is enabled but no policies were defined, blocking all access
-- including service-role operations needed for token CRUD.
-- ============================================================

-- Allow service_role to INSERT (room creation writes tokens)
CREATE POLICY IF NOT EXISTS "service_role_insert_telehealth_session_tokens"
  ON public.telehealth_session_tokens
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service_role to SELECT (token lookup on join)
CREATE POLICY IF NOT EXISTS "service_role_select_telehealth_session_tokens"
  ON public.telehealth_session_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- Allow service_role to UPDATE (mark tokens as used — single-use enforcement)
CREATE POLICY IF NOT EXISTS "service_role_update_telehealth_session_tokens"
  ON public.telehealth_session_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service_role to DELETE (TTL cleanup of expired tokens)
CREATE POLICY IF NOT EXISTS "service_role_delete_telehealth_session_tokens"
  ON public.telehealth_session_tokens
  FOR DELETE
  TO service_role
  USING (true);
