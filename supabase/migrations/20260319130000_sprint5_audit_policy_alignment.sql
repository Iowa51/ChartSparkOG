-- Sprint 5 Group 1: align audit_logs INSERT policy with service-role-only writes

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Server can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);
