import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

type PendingCookie = {
    name: string;
    value: string;
    options?: CookieOptions;
};

export function createRouteHandlerClient(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "CRITICAL: Supabase environment variables not configured. " +
            "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach((cookie) => {
                    const existingCookieIndex = pendingCookies.findIndex(
                        (pendingCookie) => pendingCookie.name === cookie.name
                    );

                    if (existingCookieIndex >= 0) {
                        pendingCookies[existingCookieIndex] = cookie;
                    } else {
                        pendingCookies.push(cookie);
                    }
                });
            },
        },
    });

    function applyCookies<T extends NextResponse>(response: T): T {
        pendingCookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
        });
        return response;
    }

    return { supabase, applyCookies };
}
