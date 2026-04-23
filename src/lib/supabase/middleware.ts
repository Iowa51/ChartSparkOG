import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { devWarn, devError } from '@/lib/logging/safe-logger';

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

// SEC-REMEDIATION: MFA enforcement for privileged roles (HIPAA compliance)
const mfaRequiredRoles: string[] = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'];

// Paths that are allowed without MFA (for MFA setup itself)
const mfaExemptPaths = [
    '/settings/security/mfa',
    '/api/auth',
    '/logout',
];

const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth',
    '/api/auth',
    '/auth/auth-code-error',
];

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
    // When middleware forwards a modified header bag (e.g. x-request-id),
    // propagate it to downstream handlers via NextResponse.next's request option.
    const nextInit = requestHeaders
        ? { request: { headers: requestHeaders } }
        : { request };
    let supabaseResponse = NextResponse.next(nextInit);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Demo mode: allow explicit opt-in (NEXT_PUBLIC_DEMO_MODE=true)
    const isProduction = process.env.NODE_ENV === 'production';
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    // SEC-F018: Block demo mode entirely in production
    if (isProduction && isDemoMode) {
        devError('Middleware', 'CRITICAL: Demo mode is forbidden in production. Set NEXT_PUBLIC_DEMO_MODE=false or remove it.');
        return NextResponse.json(
            { error: 'Server configuration error - demo mode not allowed in production' },
            { status: 500 }
        );
    }

    // SEC-003: Fail closed in production if Supabase not configured
    if (!supabaseUrl || !supabaseAnonKey) {
        if (isProduction) {
            devError('Middleware', 'CRITICAL: Supabase environment variables missing in production');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }
        // Allow in development only
        devWarn('Middleware', 'Supabase not configured, allowing traffic in development');
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
                    supabaseResponse = NextResponse.next(nextInit);
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

    if (publicRoutes.some((publicRoute) => path === publicRoute || path.startsWith(`${publicRoute}/`))) {
        return supabaseResponse;
    }

    // Find matching protected route
    const matchedRoute = Object.keys(protectedRoutes).find((route) =>
        path.startsWith(route)
    );

    // If accessing a protected route
    if (matchedRoute) {
        // SEC-PT1-F1: Demo mode must NEVER bypass authentication.
        // Removed unauthenticated demo access — all routes require login regardless of NODE_ENV.

        // Not authenticated - redirect to login
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("redirect", path);
            return NextResponse.redirect(url);
        }

        // Get user role from database
        let userData: { role: string; is_active: boolean | null } | null = null;
        const { data: usersData, error: userError } = await supabase
            .from('users')
            .select('role, is_active')
            .eq('id', user.id)
            .single();

        userData = usersData;

        // Fallback to profiles table if users table lookup fails
        // (Identity Context Desynchronization resilience)
        if (userError || !userData || !userData.role) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', user.id)
                .single();
            if (profileData?.role) {
                userData = profileData;
            }
        }

        // SEC-002: Handle role lookup failure
        let userRole: string;

        if (!userData || !userData.role) {
            // Demo mode: fallback to email-based role detection for known demo emails only
            if (isDemoMode) {
                const detectedRole = demoEmailRoles[user.email?.toLowerCase() || ''];
                if (detectedRole) {
                    userRole = detectedRole;
                } else {
                    // Unknown email in demo mode - deny access
                    devWarn('Middleware', 'Unknown user in demo mode');
                    const loginUrl = new URL('/login', request.url);
                    loginUrl.searchParams.set('error', 'profile_not_found');
                    return NextResponse.redirect(loginUrl);
                }
            } else {
                // Production: HARD FAIL if role cannot be determined
                devError('Middleware', 'Failed to fetch user role in production');
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('error', 'session_invalid');
                return NextResponse.redirect(loginUrl);
            }
        } else {
            // Check if account is active
            if (userData.is_active === false) {
                devWarn('Middleware', 'Deactivated account attempted access');
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('error', 'account_deactivated');
                return NextResponse.redirect(loginUrl);
            }
            userRole = userData.role;
        }

        const allowedRoles = protectedRoutes[matchedRoute];

        // Check if user has permission for this route
        if (!allowedRoles.includes(userRole)) {
            // Redirect to their appropriate dashboard
            const redirectPath = roleRedirects[userRole] || '/dashboard';
            return NextResponse.redirect(new URL(redirectPath, request.url));
        }

        // SEC-MFA: Check MFA requirement for high-privilege roles
        // Toggle: set DISABLE_MFA_ENFORCEMENT=true in non-production to skip
        const isMFAExemptPath = mfaExemptPaths.some(exempt => path.startsWith(exempt));
        const mfaDisabledByEnv = process.env.DISABLE_MFA_ENFORCEMENT === 'true'
            && process.env.NEXT_PUBLIC_APP_ENV !== 'production';

        if (!mfaDisabledByEnv && mfaRequiredRoles.includes(userRole) && !isMFAExemptPath) {
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (mfaError) {
                devError('Middleware', 'MFA check failed');
                return NextResponse.redirect(new URL('/settings/security/mfa?required=true', request.url));
            }
            if (mfaData.currentLevel !== 'aal2') {
                if (mfaData.nextLevel === 'aal2') {
                    // User has MFA enrolled but hasn't verified this session
                    return NextResponse.redirect(new URL('/auth/mfa-challenge?redirect=' + encodeURIComponent(path), request.url));
                } else {
                    // User needs to enroll in MFA
                    devWarn('Middleware', 'MFA required but not enrolled');
                    return NextResponse.redirect(new URL('/settings/security/mfa?required=true&role=' + userRole, request.url));
                }
            }
        }
    }

    return supabaseResponse;
}

