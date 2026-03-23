-- ============================================================
-- Sprint 9: Drop legacy audit_logs(action) index, add canonical indexes
-- ============================================================

-- Drop the legacy index on the removed 'action' column
DROP INDEX IF EXISTS idx_audit_logs_action;

-- Canonical indexes on current schema columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type
  ON audit_logs(resource_type);
