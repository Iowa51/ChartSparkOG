import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { checkSQLInjection, checkXSS, checkPathTraversal } from "@/lib/security/intrusion-detection";

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

    // Apply rate limiting and intrusion detection to API routes
    if (pathname.startsWith('/api')) {
        // Safelist for legitimate API paths that contain words that might trigger IDS
        // e.g., /api/telehealth/create-room contains 'create' which matches SQL patterns
        const safelistedPaths = [
            '/api/telehealth/create-room',
            '/api/telehealth/end-session',
            '/api/auth/complete-signup',
            '/api/auth/check-lockout',
            '/api/auth/record-attempt',
            '/api/patients',
            '/api/notes',
            '/api/appointments',
            '/api/billing',
            '/api/ai/',
        ];

        const isSafelisted = safelistedPaths.some(safe => pathname.startsWith(safe));

        // Only run intrusion detection on non-safelisted paths
        if (!isSafelisted) {
            // Intrusion detection on URL
            const urlChecks = [
                checkSQLInjection(pathname),
                checkXSS(decodeURIComponent(pathname)),
                checkPathTraversal(pathname),
            ];

            const threats = urlChecks.filter(c => c.detected);
            if (threats.length > 0) {
                console.warn(`[SECURITY] Blocked suspicious request from ${ip}: ${threats[0].threatType}`);
                return NextResponse.json(
                    { error: 'Request blocked for security reasons' },
                    { status: 403 }
                );
            }
        }

        // SEC-010: Rate limiting (async - uses Upstash Redis if configured)
        const { success, response } = await checkRateLimit(request);

        if (!success && response) {
            return response;
        }

        // Continue to next middleware/handler
        return NextResponse.next();
    }

    // Handle session for non-API routes
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
