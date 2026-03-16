// User Invitations API — Create and list organization invitations

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { sendInvitationEmail, isEmailConfigured } from '@/lib/email/resend';

async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { user } = context;
        const supabase = await createClient();

        if (!user.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const { data: invitations, error } = await supabase
            .from('invitations')
            .select(`
                id,
                email,
                role,
                specialty,
                status,
                expires_at,
                created_at,
                invited_by,
                users!invitations_invited_by_fkey(first_name, last_name, email)
            `)
            .eq('organization_id', user.organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        await logAuditEvent({
            eventType: 'INVITATION_LIST_VIEW',
            userId: user.id,
            userEmail: user.email,
            organizationId: user.organizationId,
            resourceType: 'invitations',
            details: { count: invitations?.length || 0 },
            phiAccessed: false,
            riskLevel: 'LOW',
            ipAddress,
            userAgent,
        });

        return NextResponse.json({ invitations });

    } catch (error: unknown) {
        logError({ action: 'FETCH_INVITATIONS_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { user } = context;
        const supabase = await createClient();

        if (!user.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const body = await context.request.json();
        const { email, role = 'USER', specialty } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Validate role
        if (!['USER', 'ADMIN', 'AUDITOR'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Check for existing pending invitation
        const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('organization_id', user.organizationId)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single();

        if (existing) {
            return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 });
        }

        // Check if user already exists in org
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('organization_id', user.organizationId)
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists in your organization' }, { status: 409 });
        }

        // Generate secure token
        let token: string;
        const { data: tokenData, error: tokenError } = await supabase
            .rpc('generate_invitation_token');

        if (tokenError || !tokenData) {
            const crypto = await import('crypto');
            token = crypto.randomBytes(32).toString('base64url');
        } else {
            token = tokenData;
        }

        // Create invitation
        const { data: invitation, error: createError } = await supabase
            .from('invitations')
            .insert({
                organization_id: user.organizationId,
                email: email.toLowerCase(),
                role,
                specialty,
                invited_by: user.id,
                token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single();

        if (createError) throw createError;

        await logAuditEvent({
            eventType: 'USER_INVITATION_CREATED',
            userId: user.id,
            userEmail: user.email,
            organizationId: user.organizationId,
            resourceType: 'invitation',
            resourceId: invitation.id,
            details: { invitedEmail: email, role, specialty },
            phiAccessed: false,
            riskLevel: 'MEDIUM',
            ipAddress,
            userAgent,
        });

        // Get organization name for the email
        const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', user.organizationId)
            .single();

        // Get inviter name
        const { data: inviter } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

        const inviterName = inviter
            ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || user.email
            : user.email || 'Your organization';

        const organizationName = org?.name || 'Your organization';

        // Send invitation email
        let emailSent = false;
        let emailError: string | undefined;

        if (isEmailConfigured()) {
            const emailResult = await sendInvitationEmail({
                recipientEmail: email.toLowerCase(),
                inviterName,
                organizationName,
                role,
                invitationToken: token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            emailSent = emailResult.success;
            emailError = emailResult.error;

            if (!emailSent) {
                logError({ action: 'SEND_INVITATION_EMAIL_FAILED', error: emailError });
            }
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chart-spark-og.vercel.app'}/auth/accept-invite?token=${token}`;

        return NextResponse.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                status: invitation.status,
                expires_at: invitation.expires_at,
                created_at: invitation.created_at,
            },
            inviteUrl,
            emailSent,
            message: emailSent
                ? 'Invitation sent successfully! The user will receive an email shortly.'
                : 'Invitation created. Email could not be sent - please share the invite URL manually.',
        });

    } catch (error: unknown) {
        logError({ action: 'CREATE_INVITATION_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});

export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
