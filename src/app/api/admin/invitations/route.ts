/**
 * User Invitations API
 * Task 1.3: User Invitation Flow
 * 
 * POST - Create new invitation
 * GET - List pending invitations for organization
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkCSRF } from '@/lib/security/csrf';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getClientIP } from '@/lib/utils/get-client-ip';
import { sendInvitationEmail, isEmailConfigured } from '@/lib/email/resend';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's org and role
        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        if (!['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Get invitations for this org
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
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Log the view
        await logAuditEvent({
            eventType: 'INVITATION_LIST_VIEW',
            userId: user.id,
            userEmail: user.email,
            organizationId: profile.organization_id,
            resourceType: 'invitations',
            details: { count: invitations?.length || 0 },
            phiAccessed: false,
            riskLevel: 'LOW',
            ipAddress: ip,
            userAgent,
        });

        return NextResponse.json({ invitations });

    } catch (error: unknown) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // SEC-MED-02: CSRF protection
    const csrfError = checkCSRF(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
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

        // Get user's org and role
        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, role, email')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        if (!['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_INVITATION_ATTEMPT',
                userId: user.id,
                userEmail: user.email,
                organizationId: profile.organization_id,
                details: { attemptedEmail: email, attemptedRole: role },
                phiAccessed: false,
                riskLevel: 'HIGH',
                ipAddress: ip,
                userAgent,
            });
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Check if email already has a pending invitation
        const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('organization_id', profile.organization_id)
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
            .eq('organization_id', profile.organization_id)
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists in your organization' }, { status: 409 });
        }

        // Generate secure token using database function
        let token: string;
        const { data: tokenData, error: tokenError } = await supabase
            .rpc('generate_invitation_token');

        if (tokenError || !tokenData) {
            // Fallback to server-side generation
            const crypto = await import('crypto');
            token = crypto.randomBytes(32).toString('base64url');
        } else {
            token = tokenData;
        }

        // Create invitation
        const { data: invitation, error: createError } = await supabase
            .from('invitations')
            .insert({
                organization_id: profile.organization_id,
                email: email.toLowerCase(),
                role,
                specialty,
                invited_by: user.id,
                token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            })
            .select()
            .single();

        if (createError) throw createError;

        // Log the invitation
        await logAuditEvent({
            eventType: 'USER_INVITATION_CREATED',
            userId: user.id,
            userEmail: user.email,
            organizationId: profile.organization_id,
            resourceType: 'invitation',
            resourceId: invitation.id,
            details: {
                invitedEmail: email,
                role,
                specialty,
            },
            phiAccessed: false,
            riskLevel: 'MEDIUM',
            ipAddress: ip,
            userAgent,
        });

        // Get organization name for the email
        const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
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

        // Send invitation email via Resend
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
                console.warn('Failed to send invitation email:', emailError);
            }
        } else {
            console.warn('Email service not configured - invitation created but email not sent');
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
        console.error('Error creating invitation:', error);
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
