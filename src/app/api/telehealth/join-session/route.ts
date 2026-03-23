import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { resolveTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';
import { TelehealthJoinSessionSchema, validateRequest } from '@/lib/validation/schemas';

export async function POST(request: Request) {
    try {
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // SEC-SPRINT9: Read session token ref from HTTP-only cookie first (patient flow),
        // fall back to request body (provider flow via DailyVideoCall component).
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get('telehealth_session')?.value;

        let sessionTokenRef: string;

        if (cookieToken && cookieToken.length >= 32) {
            sessionTokenRef = cookieToken;
        } else {
            const body = await request.json();
            const validation = validateRequest(TelehealthJoinSessionSchema, body);

            if (!validation.success) {
                return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
            }
            sessionTokenRef = validation.data.sessionTokenRef;
        }

        const session = await resolveTelehealthJoinSession(sessionTokenRef);
        if (!session) {
            // SEC-SPRINT8: 403 — token is invalid, expired, or already used (single-use)
            return NextResponse.json({ error: 'Telehealth session token is invalid, expired, or already used' }, { status: 403 });
        }

        // SEC-SPRINT9: Audit event for telehealth token redemption — PHI access trail
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

        // SEC-SPRINT9: Clear the cookie after successful redemption
        const response = NextResponse.json({
            appointmentId: session.appointmentId,
            participantRole: session.participantRole,
            roomUrl: session.roomUrl,
            token: session.meetingToken ?? null,
        });

        if (cookieToken) {
            response.cookies.set('telehealth_session', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 0,
                path: '/',
            });
        }

        return response;
    } catch (error) {
        logError({ action: 'TELEHEALTH_JOIN_SESSION_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to load telehealth session' }, { status: 500 });
    }
}
