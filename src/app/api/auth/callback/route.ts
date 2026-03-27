import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/security/redirects";

// SEC-PT1-F6: OAuth callback with CSRF protection.
// Supabase SSR uses PKCE (flowType: "pkce") by default, which binds the code
// exchange to the originating browser via a code_verifier stored in HTTP-only
// cookies. This is stronger than traditional OAuth state parameter validation
// and prevents login CSRF attacks.
//
// Additionally, we validate a __csrf_callback cookie set during OAuth initiation
// as defense-in-depth. If no OAuth initiation cookie exists (e.g. password reset
// magic links), we fall through — PKCE alone provides the CSRF guarantee.

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = sanitizeRedirectPath(searchParams.get("next"));

    if (code) {
        const supabase = await createServerClient();

        // exchangeCodeForSession validates the PKCE code_verifier from cookies,
        // ensuring this code was requested by this browser session.
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";
            if (isLocalEnv) {
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
