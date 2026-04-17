-- ============================================================
-- Migration: accept_invitation_atomic
-- Atomically accepts an invitation: inserts or updates public.users,
-- marks the invitation accepted, and writes the audit log entry —
-- all in one transaction so nothing is left in a partial state.
--
-- James: run this in Supabase Dashboard → SQL Editor
-- After running, verify with:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public' AND routine_name = 'accept_invitation_atomic';
--
-- Also ensure the calling role has EXECUTE (see GRANTs at bottom).
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(
    p_token        TEXT,
    p_auth_user_id UUID,
    p_is_new_user  BOOLEAN,
    p_ip_address   TEXT DEFAULT NULL,
    p_user_agent   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Re-validate token inside transaction (race condition protection).
    -- A second concurrent request for the same token will either wait on
    -- the UPDATE lock below, or find status != 'pending' and return early.
    SELECT *
    INTO v_invitation
    FROM public.invitations
    WHERE token = p_token
      AND status = 'pending'
      AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation is no longer valid');
    END IF;

    IF p_is_new_user THEN
        -- New user: create public.users row linked to the newly created auth user.
        -- first_name/last_name are empty strings; user can update profile after sign-in.
        INSERT INTO public.users (
            id,
            email,
            first_name,
            last_name,
            role,
            organization_id,
            specialty,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            p_auth_user_id,
            v_invitation.email,
            '',
            '',
            v_invitation.role,
            v_invitation.organization_id,
            v_invitation.specialty,
            TRUE,
            NOW(),
            NOW()
        );
    ELSE
        -- Existing user: link to org and assign role.
        -- The WHERE guard prevents overwriting an existing role (race condition).
        UPDATE public.users
        SET
            role            = v_invitation.role,
            organization_id = v_invitation.organization_id,
            specialty       = COALESCE(v_invitation.specialty, specialty),
            updated_at      = NOW()
        WHERE id            = p_auth_user_id
          AND (role IS NULL OR role = '')
          AND organization_id IS NULL;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'User already has a role assigned');
        END IF;
    END IF;

    -- Mark invitation accepted. The status = 'pending' guard is the final
    -- defence against two concurrent requests for the same token.
    UPDATE public.invitations
    SET
        status      = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_auth_user_id,
        updated_at  = NOW()
    WHERE id     = v_invitation.id
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'accept_invitation_atomic: invitation was accepted by a concurrent request';
    END IF;

    -- Audit log inside the transaction — if this INSERT fails the whole
    -- operation rolls back, so acceptance is never recorded without the log.
    INSERT INTO public.audit_logs (
        action,
        user_id,
        organization_id,
        entity_type,
        entity_id,
        ip_address,
        details
    ) VALUES (
        CASE WHEN p_is_new_user
             THEN 'USER_INVITATION_ACCEPTED'
             ELSE 'USER_INVITATION_ACCEPTED_LINK'
        END,
        p_auth_user_id,
        v_invitation.organization_id,
        'invitation',
        v_invitation.id::text,
        p_ip_address,
        jsonb_build_object(
            'invitation_id',   v_invitation.id,
            'invited_email',   v_invitation.email,
            'role',            v_invitation.role,
            'is_new_user',     p_is_new_user,
            'inviter_user_id', v_invitation.invited_by,
            'risk_level',      'HIGH',
            'user_agent',      p_user_agent
        )
    );

    RETURN jsonb_build_object(
        'success',         true,
        'role',            v_invitation.role,
        'organization_id', v_invitation.organization_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Surface the error to the caller without leaking internal details to the client.
    -- The TypeScript route handler logs the full sanitized error server-side.
    RAISE EXCEPTION 'accept_invitation_atomic failed: %', SQLERRM;
END;
$$;

-- Grant EXECUTE to the roles the application uses.
-- service_role is used by the API route; authenticated is belt-and-suspenders.
GRANT EXECUTE ON FUNCTION public.accept_invitation_atomic(TEXT, UUID, BOOLEAN, TEXT, TEXT)
    TO authenticated, service_role;
