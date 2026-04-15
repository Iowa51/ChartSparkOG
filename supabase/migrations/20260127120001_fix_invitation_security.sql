-- Migration: Fix Invitation Security (C2)
-- Date: 2026-01-27
-- Purpose: Secure the accept_invitation function to prevent hijacking

-- Drop the existing vulnerable function
DROP FUNCTION IF EXISTS public.accept_invitation(TEXT, UUID);

-- Create a secure version that uses auth.uid() instead of accepting user_id as parameter
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
    v_user_email TEXT;
    v_result JSON;
BEGIN
    -- Get the authenticated user's ID and email from auth context
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get the user's email from auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    -- Find the invitation
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF v_invitation IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- SECURITY: Verify the authenticated user's email matches the invitation
    IF LOWER(v_user_email) != LOWER(v_invitation.email) THEN
        RETURN json_build_object('success', false, 'error', 'This invitation was sent to a different email address');
    END IF;
    
    -- Update invitation status
    UPDATE public.invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by = v_user_id,
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Update user's organization and role
    UPDATE public.users
    SET organization_id = v_invitation.organization_id,
        role = v_invitation.role,
        specialty = COALESCE(v_invitation.specialty, specialty)
    WHERE id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'organization_id', v_invitation.organization_id,
        'role', v_invitation.role
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_invitation(TEXT) IS 
'Securely accepts an invitation using auth.uid() instead of client-provided user ID. 
Validates that the authenticated user email matches the invitation email.';
