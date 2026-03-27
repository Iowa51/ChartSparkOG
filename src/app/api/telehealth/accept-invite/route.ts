// SEC-SPRINT10: Redirect endpoint that looks up the patient session token by
// appointment ID (never from the URL), sets an HTTP-only cookie, and redirects
// to the clean /telehealth/join page. The bearer token never appears in any URL.

import { NextRequest, NextResponse } from 'next/server';
import { getPatientSessionRefByAppointment } from '@/lib/security/telehealth-session-tokens';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';

export async function GET(request: NextRequest) {
    const appointmentId = request.nextUrl.searchParams.get('appointment');
    const destination = new URL('/telehealth/join', request.url);
    const ipAddress = request.headers.get('x-real-ip')
        || (process.env.NODE_ENV !== 'production' ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() : null)
        || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!appointmentId || appointmentId.length < 32) {
        // SEC-PT4-F8: Audit invalid invite attempts
        await logAuditEvent({
            eventType: 'SUSPICIOUS_ACTIVITY',
            ipAddress,
            userAgent,
            resourceType: 'telehealth_invite',
            details: { reason: 'invalid_appointment_id' },
            riskLevel: 'MEDIUM',
        }).catch(() => { });
        return NextResponse.redirect(destination);
    }

    try {
        // Look up the patient session token ref server-side — the token never touches the URL
        const sessionRef = await getPatientSessionRefByAppointment(appointmentId);

        const response = NextResponse.redirect(destination);

        if (sessionRef) {
            // SEC-PT4-F8: Audit successful invite acceptance
            await logAuditEvent({
                eventType: 'phi_read',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_invite',
                resourceId: appointmentId,
                details: { access_context: 'telehealth_patient_invite_accepted' },
                phiAccessed: true,
                riskLevel: 'LOW',
            }).catch(() => { });

            response.cookies.set('telehealth_session', sessionRef, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 300, // 5 minutes — matches token TTL
                path: '/',
            });
        } else {
            // SEC-PT4-F8: Audit failed invite (expired/invalid/consumed)
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_invite',
                resourceId: appointmentId,
                details: { reason: 'no_valid_patient_token_for_appointment' },
                riskLevel: 'MEDIUM',
            }).catch(() => { });
        }

        return response;
    } catch (error) {
        logError({ action: 'TELEHEALTH_ACCEPT_INVITE_ERROR', error: sanitizeError(error) });
        return NextResponse.redirect(destination);
    }
}
