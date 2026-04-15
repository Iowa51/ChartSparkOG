import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  checkSQLInjection,
  checkXSS,
  checkPathTraversal,
} from "@/lib/security/intrusion-detection-edge";
import { getClientIP } from "@/lib/utils/get-client-ip";
import { logWarn } from "@/lib/logging/safe-logger";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicRoutes = ["/auth/callback", "/api/auth/callback"];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // SEC-PT8-F1: Use centralized IP extraction with production guard
  const ip = getClientIP(request);

  // Apply rate limiting and intrusion detection to API routes
  if (pathname.startsWith("/api")) {
    // Safelist for legitimate API paths that contain words that might trigger IDS
    // e.g., /api/telehealth/create-room contains 'create' which matches SQL patterns
    const safelistedPaths = [
      "/api/telehealth/create-room",
      "/api/telehealth/end-session",
      "/api/auth/complete-signup",
      "/api/auth/check-lockout",
      "/api/auth/record-attempt",
      "/api/patients",
      "/api/notes",
      "/api/appointments",
      "/api/billing",
      "/api/ai/",
    ];

    const isSafelisted = safelistedPaths.some((safe) => pathname.startsWith(safe));

    // Only run intrusion detection on non-safelisted paths
    if (!isSafelisted) {
      // Intrusion detection on URL
      const urlChecks = [
        checkSQLInjection(pathname),
        checkXSS(decodeURIComponent(pathname)),
        checkPathTraversal(pathname),
      ];

      const threats = urlChecks.filter((c) => c.detected);
      if (threats.length > 0) {
        logWarn({
          action: "SECURITY_BLOCKED_REQUEST",
          status: `ip=${ip} threat=${threats[0].threatType}`,
        });
        const blocked = NextResponse.json(
          { error: "Request blocked for security reasons" },
          { status: 403 },
        );
        blocked.headers.set("X-API-Version", "1");
        return blocked;
      }
    }

    // SEC-010: Rate limiting (async - uses Upstash Redis if configured)
    const { success, response } = await checkRateLimit(request);

    if (!success && response) {
      response.headers.set("X-API-Version", "1");
      return response;
    }

    // Continue to next middleware/handler
    const next = NextResponse.next();
    next.headers.set("X-API-Version", "1");
    return next;
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
