BEGIN;

-- Add pilot lifecycle columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pilot_started_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pilot_active_until TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pilot_readonly_until TIMESTAMPTZ;

-- Index for fast middleware lookups
CREATE INDEX IF NOT EXISTS idx_organizations_pilot_lookup
  ON organizations (id, is_pilot, pilot_active_until, pilot_readonly_until)
  WHERE is_pilot = true;

-- Sanity constraint: if pilot, all three timestamps must be set and properly ordered
ALTER TABLE organizations ADD CONSTRAINT pilot_timestamps_consistent
  CHECK (
    NOT is_pilot OR (
      pilot_started_at IS NOT NULL
      AND pilot_active_until IS NOT NULL
      AND pilot_readonly_until IS NOT NULL
      AND pilot_started_at < pilot_active_until
      AND pilot_active_until < pilot_readonly_until
    )
  );

COMMIT;
