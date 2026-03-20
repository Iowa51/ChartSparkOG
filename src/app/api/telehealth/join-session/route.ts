import { NextResponse } from 'next/server';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { resolveTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';
import { TelehealthJoinSessionSchema, validateRequest } from '@/lib/validation/schemas';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = validateRequest(TelehealthJoinSessionSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }

        const session = await resolveTelehealthJoinSession(validation.data.sessionTokenRef);
        if (!session) {
            // SEC-SPRINT8: 403 — token is invalid, expired, or already used (single-use)
            return NextResponse.json({ error: 'Telehealth session token is invalid, expired, or already used' }, { status: 403 });
        }

        return NextResponse.json({
            appointmentId: session.appointmentId,
            participantRole: session.participantRole,
            roomUrl: session.roomUrl,
            token: session.meetingToken ?? null,
        });
    } catch (error) {
        logError({ action: 'TELEHEALTH_JOIN_SESSION_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to load telehealth session' }, { status: 500 });
    }
}
