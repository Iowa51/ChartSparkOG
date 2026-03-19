-- Sprint 2 Security Hardening Migration
-- F-022: Server-side session tracking with last_activity_at

-- Add last_activity_at column to users table for server-side session timeout enforcement
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Index for efficient session timeout queries
CREATE INDEX IF NOT EXISTS idx_users_last_activity_at ON profiles (last_activity_at)
WHERE last_activity_at IS NOT NULL;

-- Set initial value for existing active users
UPDATE profiles SET last_activity_at = now() WHERE is_active = true AND last_activity_at IS NULL;
