-- Migration: Add pending_profile_changes table for auditor profile approvals
-- Date: 2026-01-25

-- Create pending_profile_changes table
CREATE TABLE IF NOT EXISTS pending_profile_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_profile_changes_user_id ON pending_profile_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_profile_changes_status ON pending_profile_changes(status);

-- Enable RLS
ALTER TABLE pending_profile_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pending changes
CREATE POLICY "Users can view own profile changes"
    ON pending_profile_changes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create their own pending changes
CREATE POLICY "Users can create own profile changes"
    ON pending_profile_changes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all pending changes
CREATE POLICY "Admins can view all profile changes"
    ON pending_profile_changes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can update pending changes (approve/reject)
CREATE POLICY "Admins can update profile changes"
    ON pending_profile_changes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_profile_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pending_profile_changes_updated_at
    BEFORE UPDATE ON pending_profile_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_profile_changes_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON pending_profile_changes TO authenticated;
GRANT UPDATE ON pending_profile_changes TO authenticated;
