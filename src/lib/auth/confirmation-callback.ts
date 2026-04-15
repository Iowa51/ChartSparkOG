import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { sanitizeRedirectPath } from "@/lib/security/redirects";
import { logError, logWarn, sanitizeError } from "@/lib/logging/safe-logger";

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

async function completeSignupAfterConfirmation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    organizationName: string
): Promise<void> {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            logWarn({ action: "CALLBACK_SIGNUP_NO_USER", error: sanitizeError(authError) });
            return;
        }

        const serviceSupabase = createServiceRoleClient();
        if (!serviceSupabase) return;

        const { data: existing } = await serviceSupabase
            .from("users")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
        if (existing) return;

        const firstName: string = (user.user_metadata?.first_name as string | undefined) ?? "";
        const lastName: string = (user.user_metadata?.last_name as string | undefined) ?? "";
        const email = user.email;

        const slug = organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .substring(0, 50);

        const { data: org, error: orgError } = await serviceSupabase
            .from("organizations")
            .insert({
                name: organizationName,
                slug: slug || `org-${Date.now()}`,
                subscription_tier: "STARTER",
                is_active: true,
            })
            .select()
            .single();

        if (orgError) {
            logError({ action: "CALLBACK_ORG_CREATION_ERROR", error: sanitizeError(orgError) });
            return;
        }

        const { error: userError } = await serviceSupabase
            .from("users")
            .insert({
                id: user.id,
                email: email?.toLowerCase(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: "ADMIN",
                organization_id: org.id,
                is_active: true,
            });

        if (userError) {
            logError({ action: "CALLBACK_USER_CREATION_ERROR", error: sanitizeError(userError) });
            await serviceSupabase.from("organizations").delete().eq("id", org.id);
            return;
        }

        try {
            const { data: features } = await serviceSupabase
                .from("features")
                .select("id")
                .or("tier_required.eq.STARTER,tier_required.is.null");

            if (features && features.length > 0) {
                await serviceSupabase.from("user_features").insert(
                    features.map((feature: { id: string }) => ({
                        user_id: user.id,
                        feature_id: feature.id,
                        enabled: true,
                        granted_by: user.id,
                    }))
                );
            }
        } catch (featureError) {
            logWarn({ action: "CALLBACK_FEATURE_ASSIGNMENT_WARNING", error: sanitizeError(featureError) });
        }
    } catch (err) {
        logError({ action: "CALLBACK_COMPLETE_SIGNUP_ERROR", error: sanitizeError(err) });
    }
}

function buildLoginErrorRedirect(redirectBase: string): NextResponse {
    const loginUrl = new URL("/login", redirectBase);
    loginUrl.searchParams.set("error", "email_link_expired");
    loginUrl.searchParams.set("message", "Email link expired or already used. Please register again.");
    return NextResponse.redirect(loginUrl);
}

export async function handleAuthCallback(request: Request): Promise<NextResponse> {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const orgName = searchParams.get("org");
    const next = sanitizeRedirectPath(searchParams.get("next"));
    const redirectBase = resolveRedirectBase(origin);

    if (!code) {
        return buildLoginErrorRedirect(redirectBase);
    }

    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        logWarn({ action: "CALLBACK_CODE_EXCHANGE_FAILED", error: sanitizeError(error) });
        return buildLoginErrorRedirect(redirectBase);
    }

    if (orgName) {
        await completeSignupAfterConfirmation(supabase, decodeURIComponent(orgName));
        return NextResponse.redirect(new URL("/dashboard", redirectBase));
    }

    return NextResponse.redirect(new URL(next, redirectBase));
}
