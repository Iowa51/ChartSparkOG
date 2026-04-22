// SEC-PT7-F6: Telehealth join session — provider flow uses withAuth(),
// patient flow validates via HTTP-only cookie token only.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { resolveTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { getClientIP } from '@/lib/utils/get-client-ip';

/**
 * Provider join flow — wrapped with withAuth for full authentication,
 * MFA, and organization validation via centralized middleware.
 */
async function handleProviderJoin(context: AuthContext, tokenOverride?: string) {
    try {
        const ipAddress = getClientIP(context.request);
        const userAgent = context.request.headers.get('user-agent') || 'unknown';

        let providerToken = tokenOverride;

        if (!providerToken || providerToken.length < 32) {
            const cookieStore = await cookies();
            providerToken = cookieStore.get('telehealth_provider_session')?.value;
        }

        if (!providerToken || providerToken.length < 32) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                userId: context.user.id,
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                details: { reason: 'provider_join_without_cookie' },
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Session token required' }, { status: 403 });
        }

        const session = await resolveTelehealthJoinSession(providerToken);
        if (!session) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                userId: context.user.id,
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                details: { reason: 'invalid_or_expired_provider_token' },
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Telehealth session token is invalid, expired, or already used' }, { status: 403 });
        }

        // Verify provider's org matches token's org
        if (session.organizationId !== context.user.organizationId) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                userId: context.user.id,
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                resourceId: session.appointmentId,
                details: { reason: 'cross_org_provider_join_attempt' },
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Audit successful provider join with full identity
        await logAuditEvent({
            eventType: 'phi_read',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'telehealth_session',
            resourceId: session.appointmentId,
            details: {
                access_context: 'telehealth_token_redemption',
                participant_role: session.participantRole,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        const response = NextResponse.json({
            appointmentId: session.appointmentId,
            participantRole: session.participantRole,
            roomUrl: session.roomUrl,
            token: session.meetingToken ?? null,
        });

        response.cookies.set('telehealth_provider_session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        logError({ action: 'TELEHEALTH_PROVIDER_JOIN_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to load telehealth session' }, { status: 500 });
    }
}

// Provider flow uses centralized withAuth middleware.
// Wrapped so we can inject an optional body-sourced token override before
// the handler runs — some deployment topologies drop SameSite=strict cookies.
const providerJoinWithToken = (tokenOverride?: string) =>
    withAuth(
        (context: AuthContext) => handleProviderJoin(context, tokenOverride),
        {
            requireOrganization: true,
            requireMFA: true,
        },
    );

/**
 * Patient join flow — lightweight cookie-only validation.
 * Patients may not have full accounts.
 */
async function handlePatientJoin(request: NextRequest): Promise<NextResponse> {
    try {
        const ipAddress = getClientIP(request);
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const cookieStore = await cookies();
        const patientCookie = cookieStore.get('telehealth_session')?.value;

        if (!patientCookie || patientCookie.length < 32) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                details: { reason: 'no_session_cookie_present' },
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Session token required' }, { status: 403 });
        }

        const session = await resolveTelehealthJoinSession(patientCookie);
        if (!session) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                details: { reason: 'invalid_or_expired_patient_token' },
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Telehealth session token is invalid, expired, or already used' }, { status: 403 });
        }

        await logAuditEvent({
            eventType: 'phi_read',
            ipAddress,
            userAgent,
            resourceType: 'telehealth_session',
            resourceId: session.appointmentId,
            details: {
                access_context: 'telehealth_token_redemption',
                participant_role: session.participantRole,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        const response = NextResponse.json({
            appointmentId: session.appointmentId,
            participantRole: session.participantRole,
            roomUrl: session.roomUrl,
            token: session.meetingToken ?? null,
        });

        response.cookies.set('telehealth_session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        logError({ action: 'TELEHEALTH_PATIENT_JOIN_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to load telehealth session' }, { status: 500 });
    }
}

/**
 * Route dispatcher — checks which cookie is present to determine flow.
 * Provider cookie (or body fallback token) → withAuth flow. Patient cookie → lightweight flow.
 */
export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const providerCookie = cookieStore.get('telehealth_provider_session')?.value;

    let bodyToken: string | undefined;
    // Clone so handlers downstream can still read request.json()
    try {
        const clone = request.clone();
        const parsed = await clone.json();
        if (parsed && typeof parsed.providerSessionToken === 'string') {
            bodyToken = parsed.providerSessionToken;
        }
    } catch {
        // No JSON body or malformed — fall through to cookie-only flow
    }

    const hasProviderCookie = !!providerCookie && providerCookie.length >= 32;
    const hasBodyToken = !!bodyToken && bodyToken.length >= 32;

    if (hasProviderCookie || hasBodyToken) {
        return providerJoinWithToken(hasBodyToken ? bodyToken : undefined)(request);
    }

    return handlePatientJoin(request);
}
