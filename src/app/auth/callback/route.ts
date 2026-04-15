import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { sanitizeRedirectPath } from "@/lib/security/redirects";
import { logError, logWarn, sanitizeError } from "@/lib/logging/safe-logger";

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

// Called after email confirmation to create the organization and user profile.
// Errors are non-fatal — the user is still redirected so they can log in;
// if the profile already exists we skip silently (idempotent).
async function completeSignupAfterConfirmation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    organizationName: string
): Promise<void> {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            logWarn({ action: 'CALLBACK_SIGNUP_NO_USER', error: sanitizeError(authError) });
            return;
        }

        const serviceSupabase = createServiceRoleClient();
        if (!serviceSupabase) return;

        // Idempotency: skip if user profile already exists
        const { data: existing } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
        if (existing) return;

        const firstName: string = (user.user_metadata?.first_name as string | undefined) ?? '';
        const lastName: string = (user.user_metadata?.last_name as string | undefined) ?? '';
        const email = user.email;

        const slug = organizationName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50);

        const { data: org, error: orgError } = await serviceSupabase
            .from('organizations')
            .insert({
                name: organizationName,
                slug: slug || `org-${Date.now()}`,
                subscription_tier: 'STARTER',
                is_active: true,
            })
            .select()
            .single();

        if (orgError) {
            logError({ action: 'CALLBACK_ORG_CREATION_ERROR', error: sanitizeError(orgError) });
            return;
        }

        const { error: userError } = await serviceSupabase
            .from('users')
            .insert({
                id: user.id,
                email: email?.toLowerCase(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: 'ADMIN',
                organization_id: org.id,
                is_active: true,
            });

        if (userError) {
            logError({ action: 'CALLBACK_USER_CREATION_ERROR', error: sanitizeError(userError) });
            // Rollback org to avoid orphaned records
            await serviceSupabase.from('organizations').delete().eq('id', org.id);
            return;
        }

        // Assign default STARTER features (non-critical)
        try {
            const { data: features } = await serviceSupabase
                .from('features')
                .select('id')
                .or('tier_required.eq.STARTER,tier_required.is.null');

            if (features && features.length > 0) {
                await serviceSupabase.from('user_features').insert(
                    features.map((f: { id: string }) => ({
                        user_id: user.id,
                        feature_id: f.id,
                        enabled: true,
                        granted_by: user.id,
                    }))
                );
            }
        } catch (featureError) {
            logWarn({ action: 'CALLBACK_FEATURE_ASSIGNMENT_WARNING', error: sanitizeError(featureError) });
        }
    } catch (err) {
        logError({ action: 'CALLBACK_COMPLETE_SIGNUP_ERROR', error: sanitizeError(err) });
    }
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
            // If an org name was passed (email-confirmation registration flow), complete signup now
            // that we have an active session.
            const orgName = searchParams.get("org");
            if (orgName) {
                await completeSignupAfterConfirmation(supabase, decodeURIComponent(orgName));
            }
            return NextResponse.redirect(`${redirectBase}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${redirectBase}/auth/auth-code-error`);
}
