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

// TODO(alerting): emit a security alert when the 5xx response rate exceeds a
// threshold (e.g. >5% over 5 minutes). Requires structured error/response
// tracking in middleware/handlers; not implemented here because middleware
// does not currently observe handler responses.
export async function middleware(request: NextRequest) {
  // Generate or forward request ID before any other logic so every response —
  // including redirects, rate-limit rejections, and IDS blocks — carries it.
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set("x-request-id", requestId);

  const withRequestId = <T extends NextResponse>(response: T): T => {
    response.headers.set("x-request-id", requestId);
    return response;
  };

  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  ) {
    return withRequestId(
      NextResponse.next({ request: { headers: forwardHeaders } }),
    );
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
          requestId,
        });
        const blocked = NextResponse.json(
          { error: "Request blocked for security reasons" },
          { status: 403 },
        );
        blocked.headers.set("X-API-Version", "1");
        return withRequestId(blocked);
      }
    }

    // SEC-010: Rate limiting (async - uses Upstash Redis if configured)
    const { success, response } = await checkRateLimit(request);

    if (!success && response) {
      response.headers.set("X-API-Version", "1");
      return withRequestId(response);
    }

    // Continue to next middleware/handler
    const next = NextResponse.next({ request: { headers: forwardHeaders } });
    next.headers.set("X-API-Version", "1");
    return withRequestId(next);
  }

  // Handle session for non-API routes
  return withRequestId(await updateSession(request, forwardHeaders));
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
