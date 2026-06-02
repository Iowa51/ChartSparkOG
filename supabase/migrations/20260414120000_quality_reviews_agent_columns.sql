-- FIX 4: Add missing columns to quality_reviews table for the auditor queue.
-- These columns were previously added manually via SQL Editor; this migration
-- makes the change idempotent and version-controlled.
-- All statements use IF NOT EXISTS so this migration is safe to re-run.

ALTER TABLE quality_reviews
  ADD COLUMN IF NOT EXISTS encounter_id uuid,
  ADD COLUMN IF NOT EXISTS cpt_code text,
  ADD COLUMN IF NOT EXISTS icd10_codes text[],
  ADD COLUMN IF NOT EXISTS estimated_reimbursement numeric(8,2),
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add the status column with check constraint separately because PostgreSQL
-- does not support IF NOT EXISTS for check constraints via ALTER TABLE ADD COLUMN.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quality_reviews' AND column_name = 'status'
  ) THEN
    ALTER TABLE quality_reviews
      ADD COLUMN status text DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'needs_revision', 'overridden', 'resolved'));
  END IF;
END $$;

-- Indexes for auditor queue hot-path queries
CREATE INDEX IF NOT EXISTS idx_quality_reviews_encounter_id
  ON quality_reviews(encounter_id);

CREATE INDEX IF NOT EXISTS idx_quality_reviews_status
  ON quality_reviews(status);

CREATE INDEX IF NOT EXISTS idx_quality_reviews_organization_id
  ON quality_reviews(organization_id);
