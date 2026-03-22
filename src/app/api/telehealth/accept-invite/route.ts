// SEC-SPRINT9: Redirect endpoint that moves the session token ref from the URL
// into an HTTP-only cookie, then redirects to the clean /telehealth/join page.
// This eliminates the bearer capability from browser history and referrer headers.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('t');

    // Always redirect to the join page — even if the token is missing or short,
    // the join page will show an appropriate error.
    const destination = new URL('/telehealth/join', request.url);
    const response = NextResponse.redirect(destination);

    if (token && token.length >= 32) {
        response.cookies.set('telehealth_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 300, // 5 minutes — matches token TTL
            path: '/',
        });
    }

    return response;
}
