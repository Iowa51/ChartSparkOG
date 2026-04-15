-- Migration: Add CPT checklists and audit session tracking
-- Date: 2026-01-25

-- Create CPT-specific checklists table
CREATE TABLE IF NOT EXISTS cpt_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpt_code VARCHAR(10) NOT NULL,
    checklist_item TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by CPT code
CREATE INDEX IF NOT EXISTS idx_cpt_checklists_cpt_code ON cpt_checklists(cpt_code);

-- Create audit sessions table for time tracking
CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    auditor_id UUID NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    checklist_completed JSONB DEFAULT '[]',
    notes TEXT,
    action_taken VARCHAR(20), -- 'approved', 'flagged', 'skipped'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit sessions
CREATE INDEX IF NOT EXISTS idx_audit_sessions_submission_id ON audit_sessions(submission_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_auditor_id ON audit_sessions(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_started_at ON audit_sessions(started_at);

-- Enable RLS on both tables
ALTER TABLE cpt_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read checklists
DROP POLICY IF EXISTS "Anyone can read cpt checklists" ON cpt_checklists;
CREATE POLICY "Anyone can read cpt checklists"
    ON cpt_checklists
    FOR SELECT
    USING (true);

-- Policy: Only admins can manage checklists
DROP POLICY IF EXISTS "Admins can manage cpt checklists" ON cpt_checklists;
CREATE POLICY "Admins can manage cpt checklists"
    ON cpt_checklists
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Auditors can view their own sessions
DROP POLICY IF EXISTS "Auditors can view own sessions" ON audit_sessions;
CREATE POLICY "Auditors can view own sessions"
    ON audit_sessions
    FOR SELECT
    USING (auth.uid() = auditor_id);

-- Policy: Auditors can create their own sessions
DROP POLICY IF EXISTS "Auditors can create sessions" ON audit_sessions;
CREATE POLICY "Auditors can create sessions"
    ON audit_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = auditor_id);

-- Policy: Auditors can update their own sessions
DROP POLICY IF EXISTS "Auditors can update own sessions" ON audit_sessions;
CREATE POLICY "Auditors can update own sessions"
    ON audit_sessions
    FOR UPDATE
    USING (auth.uid() = auditor_id);

-- Policy: Admins can view all sessions
DROP POLICY IF EXISTS "Admins can view all sessions" ON audit_sessions;
CREATE POLICY "Admins can view all sessions"
    ON audit_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Insert common CPT code checklists
INSERT INTO cpt_checklists (cpt_code, checklist_item, category, display_order, is_required) VALUES
-- 99213 - Office/outpatient visit, established patient, low complexity
('99213', 'Chief complaint documented', 'documentation', 1, true),
('99213', 'History of present illness included', 'documentation', 2, true),
('99213', 'Review of systems documented', 'documentation', 3, false),
('99213', 'Physical exam findings recorded', 'documentation', 4, true),
('99213', 'Medical decision making documented', 'medical_necessity', 5, true),
('99213', 'Treatment plan outlined', 'treatment', 6, true),
('99213', 'Provider signature present', 'compliance', 7, true),

-- 99214 - Office/outpatient visit, established patient, moderate complexity
('99214', 'Chief complaint documented', 'documentation', 1, true),
('99214', 'Detailed history of present illness', 'documentation', 2, true),
('99214', 'Review of systems (2+ systems)', 'documentation', 3, true),
('99214', 'Expanded physical exam documented', 'documentation', 4, true),
('99214', 'Moderate medical decision making documented', 'medical_necessity', 5, true),
('99214', 'Risk assessment included', 'medical_necessity', 6, true),
('99214', 'Treatment plan with rationale', 'treatment', 7, true),
('99214', 'Provider signature and date', 'compliance', 8, true),

-- 99215 - Office/outpatient visit, established patient, high complexity
('99215', 'Comprehensive chief complaint', 'documentation', 1, true),
('99215', 'Extended history of present illness', 'documentation', 2, true),
('99215', 'Complete review of systems (10+ systems)', 'documentation', 3, true),
('99215', 'Comprehensive physical examination', 'documentation', 4, true),
('99215', 'High complexity medical decision making', 'medical_necessity', 5, true),
('99215', 'Multiple diagnoses/management options', 'medical_necessity', 6, true),
('99215', 'Risk of complications documented', 'medical_necessity', 7, true),
('99215', 'Detailed treatment plan', 'treatment', 8, true),
('99215', 'Provider signature, date, and credentials', 'compliance', 9, true),

-- 90837 - Psychotherapy, 53+ minutes
('90837', 'Session duration documented (53+ min)', 'documentation', 1, true),
('90837', 'Start and end time recorded', 'documentation', 2, true),
('90837', 'Presenting issues addressed', 'clinical', 3, true),
('90837', 'Therapeutic interventions described', 'clinical', 4, true),
('90837', 'Patient response to treatment', 'clinical', 5, true),
('90837', 'Progress toward treatment goals', 'clinical', 6, true),
('90837', 'Plan for next session', 'treatment', 7, true),
('90837', 'Provider signature and credentials', 'compliance', 8, true),

-- 99205 - Office/outpatient visit, new patient, high complexity
('99205', 'Comprehensive new patient history', 'documentation', 1, true),
('99205', 'Complete review of systems', 'documentation', 2, true),
('99205', 'Past medical/family/social history', 'documentation', 3, true),
('99205', 'Comprehensive physical examination', 'documentation', 4, true),
('99205', 'High complexity medical decision making', 'medical_necessity', 5, true),
('99205', 'Differential diagnosis documented', 'medical_necessity', 6, true),
('99205', 'Treatment plan with alternatives', 'treatment', 7, true),
('99205', 'Patient education documented', 'treatment', 8, false),
('99205', 'Provider signature, date, credentials', 'compliance', 9, true);

-- Grant permissions
GRANT SELECT ON cpt_checklists TO authenticated;
GRANT SELECT, INSERT, UPDATE ON audit_sessions TO authenticated;
