// SEC-SPRINT10: Redirect endpoint that looks up the patient session token by
// appointment ID (never from the URL), sets an HTTP-only cookie, and redirects
// to the clean /telehealth/join page. The bearer token never appears in any URL.

import { NextRequest, NextResponse } from 'next/server';
import { getPatientSessionRefByAppointment } from '@/lib/security/telehealth-session-tokens';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function GET(request: NextRequest) {
    const appointmentId = request.nextUrl.searchParams.get('appointment');
    const destination = new URL('/telehealth/join', request.url);

    if (!appointmentId || appointmentId.length < 32) {
        // Invalid or missing appointment ID — redirect to join page which shows an error
        return NextResponse.redirect(destination);
    }

    try {
        // Look up the patient session token ref server-side — the token never touches the URL
        const sessionRef = await getPatientSessionRefByAppointment(appointmentId);

        const response = NextResponse.redirect(destination);

        if (sessionRef) {
            response.cookies.set('telehealth_session', sessionRef, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 300, // 5 minutes — matches token TTL
                path: '/',
            });
        }

        return response;
    } catch (error) {
        logError({ action: 'TELEHEALTH_ACCEPT_INVITE_ERROR', error: sanitizeError(error) });
        return NextResponse.redirect(destination);
    }
}
