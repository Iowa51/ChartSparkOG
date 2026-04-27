// SEC-PT7-F6 + P0-D: Telehealth join session resolution.
//
// Reads the opaque session ref from an HTTP-only cookie (set by either
// /api/telehealth/create-room for the provider, or /api/telehealth/accept-invite
// for the patient), atomically marks it used, decrypts the Daily room URL +
// meeting token, and returns them in the JSON response body.
//
// This is the ONLY surface in the codebase where the meeting credentials
// cross the network in plaintext. They never appear in URLs, redirects,
// query strings, request bodies, audit details, or logs.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { resolveTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';
import { getClientIP } from '@/lib/utils/get-client-ip';

const PROVIDER_COOKIE = 'chartspark_th_session_provider';
const PATIENT_COOKIE = 'chartspark_th_session_patient';

function clearedCookieAttributes() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 0,
        path: '/api/telehealth',
    };
}

export async function POST(request: NextRequest) {
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        const cookieStore = await cookies();
        const providerCookie = cookieStore.get(PROVIDER_COOKIE)?.value;
        const patientCookie = cookieStore.get(PATIENT_COOKIE)?.value;

        const hasProvider = !!providerCookie && providerCookie.length >= 32;
        const hasPatient = !!patientCookie && patientCookie.length >= 32;

        // Exactly one cookie must be present. Both is ambiguous (and
        // suspicious), neither is a missing-credential error.
        if (hasProvider && hasPatient) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                details: { reason: 'both_session_cookies_present' },
                riskLevel: 'HIGH',
            }).catch(() => {});
            return NextResponse.json(
                { error: 'Ambiguous session — both provider and patient cookies present' },
                { status: 400 },
            );
        }

        if (!hasProvider && !hasPatient) {
            return NextResponse.json(
                { error: 'Session cookie required' },
                { status: 400 },
            );
        }

        const sessionRef = (hasProvider ? providerCookie : patientCookie) as string;
        const cookieName = hasProvider ? PROVIDER_COOKIE : PATIENT_COOKIE;

        // resolveTelehealthJoinSession atomically updates used=false→true via
        // a conditional UPDATE. It returns null when the ref is unknown,
        // expired, already used, or fails HMAC verification — all of which
        // are 410 Gone from the caller's perspective.
        const session = await resolveTelehealthJoinSession(sessionRef);
        if (!session) {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_session',
                details: {
                    reason: 'invalid_expired_or_used_session_ref',
                    role: hasProvider ? 'provider' : 'patient',
                },
                riskLevel: 'HIGH',
            }).catch(() => {});

            const goneResponse = NextResponse.json(
                { error: 'Telehealth session is invalid, expired, or already used' },
                { status: 410 },
            );
            // Even on failure, clear the cookie so a stale ref isn't reused.
            goneResponse.cookies.set(cookieName, '', clearedCookieAttributes());
            return goneResponse;
        }

        // Audit details intentionally exclude room URL, meeting token, the
        // ref itself, and any patient identifier. Only the appointment +
        // organization scoping and role are recorded.
        await logAuditEvent({
            eventType: 'phi_read',
            ipAddress,
            userAgent,
            resourceType: 'telehealth_session',
            resourceId: session.appointmentId,
            organizationId: session.organizationId,
            details: {
                event: 'telehealth_session_resolved',
                appointment_id: session.appointmentId,
                organization_id: session.organizationId,
                role: session.participantRole,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        }).catch(() => {});

        const response = NextResponse.json({
            appointmentId: session.appointmentId,
            participantRole: session.participantRole,
            roomUrl: session.roomUrl,
            token: session.meetingToken ?? null,
        });

        // Single-use semantics — clear the cookie after a successful resolve.
        response.cookies.set(cookieName, '', clearedCookieAttributes());

        return response;
    } catch (error) {
        logError({
            action: 'TELEHEALTH_JOIN_SESSION_ERROR',
            error: sanitizeError(error),
        });
        return NextResponse.json(
            { error: 'Failed to load telehealth session' },
            { status: 500 },
        );
    }
}
