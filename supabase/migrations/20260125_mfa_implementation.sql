-- ============================================================
-- CHARTSPARK MFA IMPLEMENTATION - Database Migration
-- Task 0.2: Multi-Factor Authentication
-- ============================================================

-- ============================================
-- Add MFA fields to users table
-- ============================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mfa_secret TEXT;  -- Encrypted TOTP secret

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- Create recovery codes table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code_hash)
);

-- Enable RLS
ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recovery codes
CREATE POLICY "Users can view own recovery codes" ON public.user_recovery_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own recovery codes
CREATE POLICY "Users can create own recovery codes" ON public.user_recovery_codes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own recovery codes (mark as used)
CREATE POLICY "Users can update own recovery codes" ON public.user_recovery_codes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own recovery codes (for regeneration)
CREATE POLICY "Users can delete own recovery codes" ON public.user_recovery_codes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Super admin full access
CREATE POLICY "Super admin full access recovery codes" ON public.user_recovery_codes
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- ============================================
-- Create MFA attempts table for lockout tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.mfa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mfa_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own MFA attempts
CREATE POLICY "Users can view own mfa attempts" ON public.mfa_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- System can insert MFA attempts
CREATE POLICY "System can insert mfa attempts" ON public.mfa_attempts
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Super admin full access
CREATE POLICY "Super admin full access mfa attempts" ON public.mfa_attempts
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- ============================================
-- Index for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON public.user_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user ON public.mfa_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_mfa ON public.users(mfa_enabled) WHERE mfa_enabled = TRUE;

-- ============================================
-- Function to check MFA lockout status
-- ============================================
CREATE OR REPLACE FUNCTION public.is_mfa_locked_out(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO failed_count
  FROM public.mfa_attempts
  WHERE user_id = check_user_id
    AND success = FALSE
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Lock out after 5 failed attempts
  RETURN failed_count >= 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_mfa_locked_out(UUID) TO authenticated;

-- ============================================
-- Function to get available recovery codes count
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recovery_codes_count(check_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  available_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO available_count
  FROM public.user_recovery_codes
  WHERE user_id = check_user_id
    AND used = FALSE;
  
  RETURN available_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recovery_codes_count(UUID) TO authenticated;
