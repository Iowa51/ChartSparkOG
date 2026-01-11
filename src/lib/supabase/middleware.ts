import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Role-based route permissions
const protectedRoutes: Record<string, string[]> = {
    '/super-admin': ['SUPER_ADMIN'],
    '/admin': ['SUPER_ADMIN', 'ADMIN'],
    '/auditor': ['SUPER_ADMIN', 'AUDITOR'],
    '/dashboard': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/patients': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/encounters': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/notes': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/templates': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/billing': ['SUPER_ADMIN', 'ADMIN', 'USER'],
    '/references': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/submissions': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
    '/settings': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'],
};

// Role-based default redirects
const roleRedirects: Record<string, string> = {
    'SUPER_ADMIN': '/super-admin',
    'ADMIN': '/admin',
    'AUDITOR': '/auditor',
    'USER': '/dashboard'
};

// Demo email to role mapping for fallback
const demoEmailRoles: Record<string, string> = {
    'super@chartspark.com': 'SUPER_ADMIN',
    'admin@chartspark.com': 'ADMIN',
    'auditor@chartspark.com': 'AUDITOR',
    'clinician@chartspark.com': 'USER',
};

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If Supabase is not configured, allow traffic
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // Find matching protected route
    const matchedRoute = Object.keys(protectedRoutes).find((route) =>
        path.startsWith(route)
    );

    // If accessing a protected route
    if (matchedRoute) {
        // Not authenticated - redirect to login
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("redirect", path);
            return NextResponse.redirect(url);
        }

        // Get user role from database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        // Determine role: use DB role, fallback to email-based role, or default to USER
        let userRole = userData?.role;
        if (!userRole || userError) {
            // Fallback to demo email detection
            userRole = demoEmailRoles[user.email?.toLowerCase() || ''] || 'USER';
        }

        const allowedRoles = protectedRoutes[matchedRoute];

        // Check if user has permission for this route
        if (!allowedRoles.includes(userRole)) {
            // Redirect to their appropriate dashboard
            const redirectPath = roleRedirects[userRole] || '/dashboard';
            return NextResponse.redirect(new URL(redirectPath, request.url));
        }
    }

    return supabaseResponse;
}

