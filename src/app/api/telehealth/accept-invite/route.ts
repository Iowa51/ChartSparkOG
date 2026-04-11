// SEC-AUDIT-2026-04-10: The invite URL carries an opaque single-use token
// (not the appointment ID). We hash it, look up + atomically consume the
// invite record, then resolve the patient session ref and drop it into an
// HTTP-only cookie. The bearer session token never appears in any URL and
// the invite token is consumed on first use.

import { NextRequest, NextResponse } from 'next/server';
import { getPatientSessionRefByAppointment } from '@/lib/security/telehealth-session-tokens';
import { consumeTelehealthInviteToken } from '@/lib/security/telehealth-invite-tokens';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getClientIP } from '@/lib/utils/get-client-ip';

export async function GET(request: NextRequest) {
    const presentedToken = request.nextUrl.searchParams.get('token');
    const destination = new URL('/telehealth/join', request.url);
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!presentedToken || presentedToken.length < 32) {
        // SEC-PT4-F8: Audit invalid invite attempts
        await logAuditEvent({
            eventType: 'SUSPICIOUS_ACTIVITY',
            ipAddress,
            userAgent,
            resourceType: 'telehealth_invite',
            details: { reason: 'missing_or_malformed_invite_token' },
            riskLevel: 'MEDIUM',
        }).catch(() => { });
        return NextResponse.redirect(destination);
    }

    try {
        // SEC-AUDIT-2026-04-10: Hash + atomic single-use consume.
        const inviteRecord = await consumeTelehealthInviteToken(presentedToken);

        if (!inviteRecord) {
            // SEC-PT4-F8: Audit failed invite (expired/invalid/consumed)
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_invite',
                details: { reason: 'invalid_expired_or_consumed_invite_token' },
                riskLevel: 'MEDIUM',
            }).catch(() => { });
            return NextResponse.redirect(destination);
        }

        // Only patient-role invites are allowed through this endpoint — providers
        // receive their session token via cookie at room-creation time.
        if (inviteRecord.participantRole !== 'patient') {
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_invite',
                resourceId: inviteRecord.appointmentId,
                details: { reason: 'non_patient_role_invite_attempted' },
                riskLevel: 'HIGH',
            }).catch(() => { });
            return NextResponse.redirect(destination);
        }

        // Look up the server-side patient session token ref. The session token
        // itself never touches the URL — it's referenced by appointment id only
        // after we've validated + consumed the invite token above.
        const sessionRef = await getPatientSessionRefByAppointment(inviteRecord.appointmentId);

        const response = NextResponse.redirect(destination);

        if (sessionRef) {
            // SEC-PT4-F8: Audit successful invite acceptance
            await logAuditEvent({
                eventType: 'phi_read',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_invite',
                resourceId: inviteRecord.appointmentId,
                details: { access_context: 'telehealth_patient_invite_accepted' },
                phiAccessed: true,
                riskLevel: 'LOW',
            }).catch(() => { });

            response.cookies.set('telehealth_session', sessionRef, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 300, // 5 minutes — matches session token TTL
                path: '/',
            });
        } else {
            // Invite was valid but no active patient session ref exists for the
            // appointment. Audit as suspicious — indicates race or abuse.
            await logAuditEvent({
                eventType: 'SUSPICIOUS_ACTIVITY',
                ipAddress,
                userAgent,
                resourceType: 'telehealth_invite',
                resourceId: inviteRecord.appointmentId,
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
