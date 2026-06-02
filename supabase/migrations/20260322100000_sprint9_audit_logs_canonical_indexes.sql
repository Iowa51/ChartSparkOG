-- Sprint 9: Drop legacy audit_logs(action) index
DROP INDEX IF EXISTS idx_audit_logs_action;
-- Skipped: event_type and resource_type indexes removed (columns do not exist)
