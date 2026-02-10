-- Migration: Add review queue statuses to clinical_notes
-- Adds: pending_review, approved, needs_revision
-- New lifecycle: draft → pending_review → approved → signed (billed)
--                                       ↘ needs_revision → pending_review

-- Drop existing constraint and add updated one
ALTER TABLE clinical_notes DROP CONSTRAINT IF EXISTS clinical_notes_status_check;
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_status_check 
  CHECK (status IN ('draft', 'completed', 'signed', 'amended', 'pending_review', 'approved', 'needs_revision'));

-- Add auditor feedback column for revision notes
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS reviewer_feedback TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
