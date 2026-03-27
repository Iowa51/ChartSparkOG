// SEC-PT4-F1: Telehealth join session — provider flow requires withAuth,
// patient flow validates via HTTP-only cookie token only.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { resolveTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
    try {
        const ipAddress = request.headers.get('x-real-ip')
            || (process.env.NODE_ENV !== 'production' ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() : null)
            || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Determine flow: patient (cookie) vs provider (cookie set by create-room)
        const cookieStore = await cookies();
        const patientCookie = cookieStore.get('telehealth_session')?.value;
        const providerCookie = cookieStore.get('telehealth_provider_session')?.value;

        let sessionTokenRef: string;
        let isProviderFlow = false;

        if (providerCookie && providerCookie.length >= 32) {
            // SEC-PT4-F1: Provider flow — requires full authentication
            isProviderFlow = true;
            sessionTokenRef = providerCookie;

            const user = await getAuthenticatedUser(request);
            if (!user) {
                await logAuditEvent({
                    eventType: 'SUSPICIOUS_ACTIVITY',
                    ipAddress,
                    userAgent,
                    resourceType: 'telehealth_session',
                    details: { reason: 'unauthenticated_provider_join_attempt' },
                    riskLevel: 'HIGH',
                });
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }

            // Resolve token to check org before proceeding
            const session = await resolveTelehealthJoinSession(sessionTokenRef);
            if (!session) {
                await logAuditEvent({
                    eventType: 'SUSPICIOUS_ACTIVITY',
                    ipAddress,
                    userAgent,
                    userId: user.id,
                    resourceType: 'telehealth_session',
                    details: { reason: 'invalid_or_expired_provider_token' },
                    riskLevel: 'HIGH',
                });
                return NextResponse.json({ error: 'Telehealth session token is invalid, expired, or already used' }, { status: 403 });
            }

            // SEC-PT4-F1: Verify provider's org matches token's org
            if (session.organizationId !== user.organizationId) {
                await logAuditEvent({
                    eventType: 'SUSPICIOUS_ACTIVITY',
                    userId: user.id,
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
                userId: user.id,
                userEmail: user.email,
                organizationId: user.organizationId ?? undefined,
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

            // Clear the provider cookie after redemption
            response.cookies.set('telehealth_provider_session', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 0,
                path: '/',
            });

            return response;

        } else if (patientCookie && patientCookie.length >= 32) {
            // Patient flow — cookie-only validation (patients may not have accounts)
            sessionTokenRef = patientCookie;
        } else {
            // SEC-PT4-F1: No valid cookie found — reject
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

        // Patient flow — resolve token
        const session = await resolveTelehealthJoinSession(sessionTokenRef);
        if (!session) {
            // SEC-PT4-F6: Audit failed join attempts (HIPAA 45 CFR 164.312(b))
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

        // Audit successful patient join (no userId available for patients)
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

        // Clear patient cookie after redemption
        response.cookies.set('telehealth_session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        logError({ action: 'TELEHEALTH_JOIN_SESSION_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to load telehealth session' }, { status: 500 });
    }
}
