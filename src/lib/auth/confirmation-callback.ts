import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { sanitizeRedirectPath } from "@/lib/security/redirects";
import { logError, logWarn, sanitizeError } from "@/lib/logging/safe-logger";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler-client";

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
): Promise<boolean> {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            logWarn({ action: "CALLBACK_SIGNUP_NO_USER", error: sanitizeError(authError) });
            return false;
        }

        const serviceSupabase = createServiceRoleClient();
        if (!serviceSupabase) return false;

        const { data: existing } = await serviceSupabase
            .from("users")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
        if (existing) return true;

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
            return false;
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
            return false;
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

        return true;
    } catch (err) {
        logError({ action: "CALLBACK_COMPLETE_SIGNUP_ERROR", error: sanitizeError(err) });
        return false;
    }
}

function buildLoginErrorRedirect(
    redirectBase: string,
    message = "Email confirmation link expired or already used. Please register again."
): NextResponse {
    const loginUrl = new URL("/login", redirectBase);
    loginUrl.searchParams.set("error", "email_link_expired");
    loginUrl.searchParams.set("message", message);
    return NextResponse.redirect(loginUrl);
}

function buildAuthErrorRedirect(
    redirectBase: string,
    message: string,
    flowType: "recovery" | "signup" = "signup"
): NextResponse {
    const errorUrl = new URL("/auth/auth-code-error", redirectBase);
    errorUrl.searchParams.set("message", message);
    errorUrl.searchParams.set("type", flowType === "recovery" ? "recovery" : "signup");
    return NextResponse.redirect(errorUrl);
}

function resolvePostAuthPath(next: string, otpType: EmailOtpType | null, orgName: string | null): string {
    if (!orgName && (otpType === "recovery" || next === "/reset-password")) {
        return "/reset-password";
    }

    return next;
}

function getFlowType(otpType: EmailOtpType | null, next: string, orgName: string | null): "recovery" | "signup" {
    if (!orgName && (otpType === "recovery" || next === "/reset-password")) {
        return "recovery";
    }

    return "signup";
}

function getExpiredMessage(flowType: "recovery" | "signup"): string {
    return flowType === "recovery"
        ? "Password reset link expired or already used. Please request a new reset link."
        : "Email confirmation link expired or already used. Please register again.";
}

function getOtpType(value: string | null): EmailOtpType | null {
    if (
        value === "signup" ||
        value === "invite" ||
        value === "magiclink" ||
        value === "recovery" ||
        value === "email" ||
        value === "email_change"
    ) {
        return value;
    }

    return null;
}

function getRawQueryParam(search: string, key: string): string | null {
    const trimmedSearch = search.startsWith("?") ? search.slice(1) : search;
    if (!trimmedSearch) return null;

    for (const part of trimmedSearch.split("&")) {
        if (part.startsWith(`${key}=`)) {
            return part.slice(key.length + 1);
        }
        if (part === key) {
            return "";
        }
    }

    return null;
}

function describeSupabaseAuthError(error: unknown): string {
    if (!error || typeof error !== "object") {
        return sanitizeError(error);
    }

    const candidate = error as {
        name?: unknown;
        message?: unknown;
        code?: unknown;
        status?: unknown;
        error_code?: unknown;
    };

    const parts = [
        typeof candidate.name === "string" ? `name=${candidate.name}` : null,
        typeof candidate.code === "string" ? `code=${candidate.code}` : null,
        typeof candidate.error_code === "string" ? `error_code=${candidate.error_code}` : null,
        typeof candidate.status === "number" ? `status=${candidate.status}` : null,
        typeof candidate.message === "string" ? `message=${candidate.message}` : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" | ") : sanitizeError(error);
}

export async function handleAuthCallback(request: NextRequest): Promise<NextResponse> {
    const requestUrl = new URL(request.url);
    const { searchParams, origin, search } = requestUrl;
    const code = searchParams.get("code");
    const tokenHash = getRawQueryParam(search, "token_hash") ?? searchParams.get("token_hash");
    const otpType = getOtpType(searchParams.get("type"));
    const orgName = searchParams.get("org");
    const next = sanitizeRedirectPath(searchParams.get("next"));
    const destinationPath = resolvePostAuthPath(next, otpType, orgName);
    const flowType = getFlowType(otpType, next, orgName);
    const redirectBase = resolveRedirectBase(origin);
    const { supabase, applyCookies } = createRouteHandlerClient(request);

    if (!code && !(tokenHash && otpType)) {
        return flowType === "recovery"
            ? buildAuthErrorRedirect(redirectBase, getExpiredMessage(flowType), flowType)
            : buildLoginErrorRedirect(redirectBase, getExpiredMessage(flowType));
    }

    // Replace any pre-existing browser session before consuming the new auth callback.
    // Without this, a previously logged-in user in the same browser can remain active
    // and the dashboard will resolve the wrong profile after confirmation.
    const { data: { user: previousUser } } = await supabase.auth.getUser();
    if (previousUser) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
        if (signOutError) {
            logWarn({ action: "CALLBACK_PREEXISTING_SESSION_SIGNOUT_FAILED", error: sanitizeError(signOutError) });
        }
    }

    let authError: unknown = null;

    if (tokenHash && otpType && flowType === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
        });
        authError = error;

        if (error) {
            logWarn({
                action: "CALLBACK_VERIFY_OTP_FAILED",
                error: describeSupabaseAuthError(error),
                status: `flow=${flowType} type=${otpType} hasCode=${String(Boolean(code))} tokenHashLength=${String(tokenHash.length)} destination=${destinationPath}`,
            });
        }
    } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        authError = error;

        if (error) {
            logWarn({
                action: "CALLBACK_EXCHANGE_CODE_FAILED",
                error: describeSupabaseAuthError(error),
                status: `flow=${flowType} hasTokenHash=${String(Boolean(tokenHash))} codeLength=${String(code.length)} destination=${destinationPath}`,
            });
        }

        if (error && tokenHash && otpType) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: otpType,
            });
            authError = verifyError;

            if (verifyError) {
                logWarn({
                    action: "CALLBACK_VERIFY_OTP_FALLBACK_FAILED",
                    error: describeSupabaseAuthError(verifyError),
                    status: `flow=${flowType} type=${otpType} tokenHashLength=${String(tokenHash.length)} destination=${destinationPath}`,
                });
            }
        }
    } else if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
        });
        authError = error;

        if (error) {
            logWarn({
                action: "CALLBACK_VERIFY_OTP_FAILED",
                error: describeSupabaseAuthError(error),
                status: `flow=${flowType} type=${otpType} hasCode=${String(Boolean(code))} tokenHashLength=${String(tokenHash.length)} destination=${destinationPath}`,
            });
        }
    }

    if (authError) {
        logWarn({ action: "CALLBACK_CODE_EXCHANGE_FAILED", error: sanitizeError(authError) });
        return flowType === "recovery"
            ? buildAuthErrorRedirect(redirectBase, getExpiredMessage(flowType), flowType)
            : buildLoginErrorRedirect(redirectBase, getExpiredMessage(flowType));
    }

    const { data: { user: callbackUser }, error: callbackUserError } = await supabase.auth.getUser();
    if (callbackUserError || !callbackUser) {
        logWarn({ action: "CALLBACK_SESSION_USER_MISSING", error: sanitizeError(callbackUserError) });
        return flowType === "recovery"
            ? buildAuthErrorRedirect(
                redirectBase,
                "Password reset link could not start a recovery session. Please request a new reset link.",
                flowType
            )
            : buildLoginErrorRedirect(
                redirectBase,
                "Your email was confirmed, but we could not start your session. Please sign in manually."
            );
    }

    if (orgName) {
        const signupCompleted = await completeSignupAfterConfirmation(supabase, decodeURIComponent(orgName));
        if (!signupCompleted) {
            return applyCookies(
                buildAuthErrorRedirect(
                    redirectBase,
                    "Your email was confirmed, but account setup could not be completed. Please contact support or try signing in again.",
                    flowType
                )
            );
        }
        return applyCookies(NextResponse.redirect(new URL("/dashboard", redirectBase)));
    }

    return applyCookies(NextResponse.redirect(new URL(destinationPath, redirectBase)));
}
