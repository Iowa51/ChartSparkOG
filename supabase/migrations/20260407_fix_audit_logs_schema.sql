-- Migration: Upgrade audit_logs to full HIPAA-compliant schema
-- Run this in the Supabase Dashboard → SQL Editor to get dedicated columns
-- for every audit field instead of packing them into the details JSONB.
--
-- The current production table has: id, user_id, organization_id, action,
-- entity_type, entity_id, details, ip_address, created_at
--
-- After this migration the application code can be reverted to use the
-- dedicated columns (event_type, resource_type, etc.) instead of the
-- details-JSONB workaround in audit-log.ts.

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS event_type     TEXT,
    ADD COLUMN IF NOT EXISTS user_email     TEXT,
    ADD COLUMN IF NOT EXISTS user_role      TEXT,
    ADD COLUMN IF NOT EXISTS user_agent     TEXT,
    ADD COLUMN IF NOT EXISTS resource_type  TEXT,
    ADD COLUMN IF NOT EXISTS resource_id    UUID,
    ADD COLUMN IF NOT EXISTS phi_accessed   BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS risk_level     TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ADD COLUMN IF NOT EXISTS timestamp      TIMESTAMPTZ DEFAULT NOW();

-- Back-fill new event_type column from existing action column
UPDATE public.audit_logs
SET event_type = action
WHERE event_type IS NULL;

-- Back-fill resource_type / resource_id from entity_type / entity_id
UPDATE public.audit_logs
SET resource_type = entity_type,
    resource_id   = entity_id
WHERE resource_type IS NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_audit_event_type  ON public.audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_risk        ON public.audit_logs (risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp   ON public.audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_phi         ON public.audit_logs (phi_accessed) WHERE phi_accessed = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_resource    ON public.audit_logs (resource_type, resource_id);
