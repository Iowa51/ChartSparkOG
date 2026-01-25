-- ============================================================
-- CHARTSPARK USER INVITATION SYSTEM
-- Task 1.3: User Invitation Flow Database Schema
-- ============================================================

-- ============================================
-- Create invitations table
-- ============================================
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'AUDITOR')),
    specialty TEXT,
    invited_by UUID NOT NULL REFERENCES public.users(id),
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status) WHERE status = 'pending';

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view org invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Super admin full access invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view by token" ON public.invitations;

-- Admins can view invitations in their org
CREATE POLICY "Admins can view org invitations" ON public.invitations
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    );

-- Admins can create invitations for their org
CREATE POLICY "Admins can create invitations" ON public.invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    );

-- Admins can update (cancel) invitations in their org
CREATE POLICY "Admins can update invitations" ON public.invitations
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    );

-- Super admin has full access
CREATE POLICY "Super admin full access invitations" ON public.invitations
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'SUPER_ADMIN');

-- ============================================
-- Function to generate secure token
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate 32 bytes of randomness, encode as base64-like string
    token := encode(gen_random_bytes(32), 'base64');
    -- Make URL-safe
    token := replace(replace(token, '+', '-'), '/', '_');
    -- Remove padding
    token := rtrim(token, '=');
    RETURN token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invitation_token() TO authenticated;

-- ============================================
-- Function to validate and accept invitation
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_token TEXT,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_result JSON;
BEGIN
    -- Find the invitation
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF v_invitation IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Update invitation status
    UPDATE public.invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_user_id,
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Update user's organization and role
    UPDATE public.users
    SET organization_id = v_invitation.organization_id,
        role = v_invitation.role,
        specialty = COALESCE(v_invitation.specialty, specialty)
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'organization_id', v_invitation.organization_id,
        'role', v_invitation.role
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT, UUID) TO authenticated;

-- ============================================
-- Trigger to auto-expire old invitations
-- ============================================
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mark expired invitations
    UPDATE public.invitations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();
    
    RETURN NULL;
END;
$$;

-- Create a function to be called periodically (or use pg_cron in production)
-- For now, we'll check expiration on each insert
CREATE OR REPLACE FUNCTION public.check_expired_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Clean up expired invitations on each new insert
    PERFORM expire_old_invitations();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_expired_invitations ON public.invitations;
CREATE TRIGGER trigger_check_expired_invitations
    AFTER INSERT ON public.invitations
    EXECUTE FUNCTION public.check_expired_invitations();
