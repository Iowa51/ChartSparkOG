import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler-client';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { checkRateLimitByKey } from '@/lib/security/rate-limit';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { validateRequest, AcceptInvitationSchema } from '@/lib/validation/schemas';
import { validatePassword } from '@/lib/auth/password-validation';
import { validateOrigin } from '@/lib/security/csrf';

const GENERIC_500 = { error: 'Unable to accept invitation. Please try again or contact support.' };

type AtomicResult = {
    success: boolean;
    role?: string;
    organization_id?: string;
    error?: string;
};

export async function POST(request: NextRequest) {
    if (!validateOrigin(request)) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { ipAddress, userAgent } = getRequestMetadata(request);

    // Fail-closed IP rate limit — token-guessing attack surface
    const rateLimit = await checkRateLimitByKey(ipAddress, 'invitationAccept', '/api/invitations/accept');
    if (!rateLimit.success && rateLimit.response) return rateLimit.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const validation = validateRequest(AcceptInvitationSchema, body);
    if (!validation.success) {
        return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }
    const { token, password } = validation.data;

    const serviceClient = createServiceRoleClient();
    if (!serviceClient) {
        logError({ action: 'ACCEPT_INVITATION_NO_SERVICE_CLIENT', error: 'Service client unavailable' });
        return NextResponse.json(GENERIC_500, { status: 503 });
    }

    // Validate token — service role required, no anon RLS policy on invitations
    const { data: invitation, error: tokenError } = await serviceClient
        .from('invitations')
        .select('id, email, role, specialty, organization_id, invited_by, status, expires_at')
        .eq('token', token)
        .maybeSingle();

    if (tokenError) {
        logError({ action: 'ACCEPT_INVITATION_TOKEN_ERROR', error: sanitizeError(tokenError) });
        return NextResponse.json(GENERIC_500, { status: 500 });
    }

    if (!invitation) {
        return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
    }

    if (invitation.status !== 'pending') {
        return NextResponse.json({ error: 'This invitation is no longer valid' }, { status: 409 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    // Detect session — determines linking path vs new-user path
    const { supabase: sessionClient } = createRouteHandlerClient(request);
    const { data: { user: sessionUser } } = await sessionClient.auth.getUser();

    let authUserId: string;
    let isNewUser: boolean;

    if (sessionUser) {
        // Linking path: authenticated user must match the invitation email
        if (sessionUser.email?.toLowerCase() !== invitation.email.toLowerCase()) {
            return NextResponse.json(
                { error: 'The signed-in account does not match this invitation email' },
                { status: 403 },
            );
        }

        // Race-condition guard: re-verify user still has no role
        const { data: existingUser, error: userErr } = await serviceClient
            .from('users')
            .select('id, role, organization_id')
            .eq('id', sessionUser.id)
            .maybeSingle();

        if (userErr) {
            logError({ action: 'ACCEPT_INVITATION_USER_LOOKUP_ERROR', error: sanitizeError(userErr) });
            return NextResponse.json(GENERIC_500, { status: 500 });
        }

        if (!existingUser) {
            logError({ action: 'ACCEPT_INVITATION_USER_NOT_FOUND', error: 'No public.users row for session user' });
            return NextResponse.json(GENERIC_500, { status: 500 });
        }

        if (existingUser.role || existingUser.organization_id) {
            return NextResponse.json(
                { error: 'Your account already has a role assigned. Contact your administrator.' },
                { status: 409 },
            );
        }

        authUserId = sessionUser.id;
        isNewUser = false;
    } else {
        // New user path: password required
        if (!password) {
            return NextResponse.json({ error: 'Password is required to create an account' }, { status: 400 });
        }

        const pwResult = validatePassword(password, { email: invitation.email });
        if (!pwResult.valid) {
            return NextResponse.json(
                { error: 'Password does not meet requirements', details: pwResult.errors },
                { status: 400 },
            );
        }

        // email_confirm: true — invitation validates email ownership
        const { data: newAuthUser, error: createError } = await serviceClient.auth.admin.createUser({
            email: invitation.email.toLowerCase(),
            password,
            email_confirm: true,
        });

        if (createError || !newAuthUser.user) {
            logError({ action: 'ACCEPT_INVITATION_CREATE_AUTH_USER_FAILED', error: sanitizeError(createError) });
            const errMsg = sanitizeError(createError).toLowerCase();
            if (errMsg.includes('already') || errMsg.includes('exist')) {
                return NextResponse.json(
                    { error: 'An account with this email already exists. Please sign in to accept this invitation.' },
                    { status: 409 },
                );
            }
            return NextResponse.json(GENERIC_500, { status: 500 });
        }

        authUserId = newAuthUser.user.id;
        isNewUser = true;
    }

    // Atomic Postgres function: inserts/updates public.users, marks invitation accepted,
    // writes audit log — all in one transaction. If it fails, the whole operation rolls back.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (serviceClient as any).rpc(
        'accept_invitation_atomic',
        {
            p_token: token,
            p_auth_user_id: authUserId,
            p_is_new_user: isNewUser,
            p_ip_address: ipAddress,
            p_user_agent: userAgent,
        },
    );

    const rpcResult = rpcData as AtomicResult | null;

    if (rpcError || !rpcResult?.success) {
        // Clean up orphaned auth user if we created it this request
        if (isNewUser) {
            await serviceClient.auth.admin.deleteUser(authUserId).catch((e: unknown) => {
                logError({ action: 'ACCEPT_INVITATION_CLEANUP_FAILED', error: sanitizeError(e) });
            });
        }
        logError({
            action: 'ACCEPT_INVITATION_ATOMIC_FAILED',
            error: sanitizeError(rpcError ?? { message: rpcResult?.error ?? 'unknown' }),
        });
        return NextResponse.json(GENERIC_500, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        isNewUser,
        role: rpcResult.role,
        organizationId: rpcResult.organization_id,
    });
}
