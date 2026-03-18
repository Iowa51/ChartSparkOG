import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Validate redirect path to prevent open redirect attacks.
 * Must start with "/" and not contain "//" or "\" to block protocol-relative URLs.
 */
function sanitizeRedirectPath(path: string | null): string {
    const fallback = "/dashboard";
    if (!path) return fallback;
    // Must start with single slash, block "//" (protocol-relative) and "\" (path traversal)
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
        return fallback;
    }
    return path;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = sanitizeRedirectPath(searchParams.get("next"));

    if (code) {
        const supabase = await createServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === "development";
            if (isLocalEnv) {
                // we can be sure that there is no proxy in between in local env
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
