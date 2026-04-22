-- Create the submissions table for the clinician sign-and-review workflow.
--
-- Bug: POST /api/notes/[id]/sign updates clinical_notes.status to 'pending_review'
-- then inserts a submissions row. Without this table, the insert fails and the
-- sign route rolls back the note to 'draft'. Reported 2026-04-21.
--
-- Also fixes: audit_sessions (20260125 migration) referenced submissions(id)
-- before this table existed, so audit_sessions may not have been created either.
-- This migration is idempotent — safe to run regardless of partial state.
--
-- Supersedes: 20260420000000_fix_submissions_note_fk.sql (removed — it tried to
-- ALTER a table that didn't exist).

-- ============================================================================
-- 1. submissions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    cpt_code TEXT,
    icd10_codes TEXT[] DEFAULT '{}',
    billing_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_audit'
        CHECK (status IN ('pending_audit','in_review','approved','rejected','billed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK to clinical_notes (not the orphaned notes table)
-- DROP first in case the 20260420 migration partially ran
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_note_id_fkey;
ALTER TABLE submissions
    ADD CONSTRAINT submissions_note_id_fkey
    FOREIGN KEY (note_id) REFERENCES clinical_notes(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT submissions_note_id_fkey ON submissions IS
    'References clinical_notes (the active notes table). Created 2026-04-21.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_note_id ON submissions(note_id);
CREATE INDEX IF NOT EXISTS idx_submissions_organization_id ON submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_provider_id ON submissions(provider_id);

-- RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Providers can insert submissions for their own org
DROP POLICY IF EXISTS "providers_insert_submissions" ON submissions;
CREATE POLICY "providers_insert_submissions" ON submissions
    FOR INSERT WITH CHECK (
        organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Org members can read their org's submissions
DROP POLICY IF EXISTS "org_members_read_submissions" ON submissions;
CREATE POLICY "org_members_read_submissions" ON submissions
    FOR SELECT USING (
        organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Auditors/admins can update submissions in their org
DROP POLICY IF EXISTS "auditors_update_submissions" ON submissions;
CREATE POLICY "auditors_update_submissions" ON submissions
    FOR UPDATE USING (
        organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

GRANT SELECT, INSERT, UPDATE ON submissions TO authenticated;

-- ============================================================================
-- 2. audit_sessions — recreate if it failed in the 20260125 migration
-- ============================================================================
-- The 20260125 migration's CREATE TABLE audit_sessions would have failed because
-- it references submissions(id) which didn't exist. Recreate it now.
CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    auditor_id UUID NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    checklist_completed JSONB DEFAULT '[]',
    notes TEXT,
    action_taken VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_sessions_submission_id ON audit_sessions(submission_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_auditor_id ON audit_sessions(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_started_at ON audit_sessions(started_at);

ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;

-- Auditor RLS policies (idempotent)
DROP POLICY IF EXISTS "Auditors can view own sessions" ON audit_sessions;
CREATE POLICY "Auditors can view own sessions" ON audit_sessions
    FOR SELECT USING (auth.uid() = auditor_id);

DROP POLICY IF EXISTS "Auditors can create sessions" ON audit_sessions;
CREATE POLICY "Auditors can create sessions" ON audit_sessions
    FOR INSERT WITH CHECK (auth.uid() = auditor_id);

DROP POLICY IF EXISTS "Auditors can update own sessions" ON audit_sessions;
CREATE POLICY "Auditors can update own sessions" ON audit_sessions
    FOR UPDATE USING (auth.uid() = auditor_id);

DROP POLICY IF EXISTS "Admins can view all sessions" ON audit_sessions;
CREATE POLICY "Admins can view all sessions" ON audit_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

GRANT SELECT, INSERT, UPDATE ON audit_sessions TO authenticated;