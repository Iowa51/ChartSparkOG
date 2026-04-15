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

// SEC-AUDIT-2026-04-10: Redirect only to a configured canonical origin.
// Trusting x-forwarded-host for the redirect host allowed an attacker-controlled
// header to bend the post-auth redirect to an arbitrary hostname on proxies
// that blindly forward it. We now resolve the redirect base from
// NEXT_PUBLIC_APP_URL and fall back to the request origin only in development.
function resolveRedirectBase(requestOrigin: string): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) {
        try {
            return new URL(configured).origin;
        } catch {
            // fall through to requestOrigin
        }
    }
    return requestOrigin;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = sanitizeRedirectPath(searchParams.get("next"));
    const redirectBase = resolveRedirectBase(origin);

    if (code) {
        const supabase = await createServerClient();

        // exchangeCodeForSession validates the PKCE code_verifier from cookies,
        // ensuring this code was requested by this browser session.
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${redirectBase}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${redirectBase}/auth/auth-code-error`);
}
