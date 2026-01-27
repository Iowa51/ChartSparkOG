-- Migration: Login Attempts Table for Brute Force Protection
-- Date: 2026-01-27
-- Purpose: Track failed login attempts for account lockout

-- Create login_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created 
ON public.login_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created 
ON public.login_attempts(ip_address, created_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (needed for lockout checks)
CREATE POLICY IF NOT EXISTS "Service role full access" 
ON public.login_attempts 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Clean up old entries (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.login_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant execute on cleanup function
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO service_role;

COMMENT ON TABLE public.login_attempts IS 
'Tracks login attempts for brute force protection and account lockout.';
