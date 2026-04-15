import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeRedirectPath } from "@/lib/security/redirects";
import { validateOrigin } from "@/lib/security/csrf";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";

const LoginSchema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(255),
    redirect: z.string().optional().nullable(),
});

const roleRoutes: Record<string, string> = {
    SUPER_ADMIN: "/super-admin",
    ADMIN: "/admin",
    AUDITOR: "/auditor",
    USER: "/dashboard",
};

export async function POST(request: NextRequest) {
    if (!validateOrigin(request)) {
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid email or password. Please try again." }, { status: 400 });
        }

        const { email, password, redirect } = parsed.data;
        const { supabase, applyCookies } = createRouteHandlerClient(request);

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
        });

        if (authError || !authData.session?.user) {
            return NextResponse.json({ error: "Invalid email or password. Please try again." }, { status: 401 });
        }

        const userId = authData.session.user.id;
        const serviceSupabase = createServiceRoleClient();

        let userData: { role: string; is_active: boolean | null } | null = null;
        if (serviceSupabase) {
            const { data } = await serviceSupabase
                .from("users")
                .select("role, is_active")
                .eq("id", userId)
                .maybeSingle();

            userData = data;

            if (!userData?.role) {
                const { data: profileData } = await serviceSupabase
                    .from("profiles")
                    .select("role, is_active")
                    .eq("id", userId)
                    .maybeSingle();
                if (profileData?.role) {
                    userData = profileData;
                }
            }

            await serviceSupabase
                .from("users")
                .update({ last_login: new Date().toISOString() })
                .eq("id", userId);
        }

        if (userData?.is_active === false) {
            await supabase.auth.signOut();
            return applyCookies(
                NextResponse.json(
                    { error: "Your account has been deactivated. Contact support for help." },
                    { status: 403 }
                )
            );
        }

        if (serviceSupabase && !userData?.role) {
            await supabase.auth.signOut();
            return applyCookies(
                NextResponse.json(
                    { error: "Your account setup is incomplete. Please contact support." },
                    { status: 409 }
                )
            );
        }

        const role = userData?.role || "USER";
        const defaultRedirect = roleRoutes[role] || "/dashboard";
        const redirectPath = role === "USER"
            ? sanitizeRedirectPath(redirect ?? null, defaultRedirect)
            : defaultRedirect;

        return applyCookies(
            NextResponse.json({
                success: true,
                redirectPath,
            })
        );
    } catch (error) {
        logError({ action: "LOGIN_ROUTE_ERROR", error: sanitizeError(error) });
        return NextResponse.json(
            { error: "Authentication service unavailable. Please try again later." },
            { status: 500 }
        );
    }
}
