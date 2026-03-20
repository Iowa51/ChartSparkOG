// src/lib/auth/api-auth.ts
// API authentication and authorization middleware

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/security/csrf';
import { logWarn, logError, sanitizeError } from '@/lib/logging/safe-logger';

// F-022: HIPAA-compliant server-side session timeout (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
}

export interface AuthContext {
    user: AuthenticatedUser;
    request: NextRequest;
    params?: Record<string, string>;
}

export interface AuthOptions {
    requiredRole?: string[];
    requiredFeature?: string;
    requireOrganization?: boolean;
    requireMFA?: boolean;
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
    request: NextRequest
): Promise<AuthenticatedUser | null> {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return null;
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
            return null;
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, role, organization_id, is_active')
            .eq('id', authUser.id)
            .single();

        if (userError || !user) {
            return null;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('last_activity_at')
            .eq('id', authUser.id)
            .maybeSingle();

        if (profileError) {
            logError({ action: 'API_AUTH_PROFILE_LOOKUP_ERROR', error: sanitizeError(profileError), userId: authUser.id });
            return null;
        }

        // Check if account is active
        if (user.is_active === false) {
            logWarn({ action: 'API_AUTH_DEACTIVATED_ACCOUNT_ACCESS', userId: user.id });
            return null;
        }

        // F-022: Server-side session timeout enforcement (HIPAA 15-min inactivity)
        if (profile?.last_activity_at) {
            const lastActivity = new Date(profile.last_activity_at).getTime();
            if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
                logWarn({ action: 'API_AUTH_SESSION_TIMEOUT', userId: user.id });
                return null;
            }
        }

        if (profile) {
            // F-022: Update last_activity_at (fire-and-forget, don't block the request)
            supabase
                .from('profiles')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('id', user.id)
                .then(() => {})
                .catch(() => {});
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organization_id,
        };
    } catch (error) {
        logError({ action: 'API_AUTH_ERROR', error: sanitizeError(error) });
        return null;
    }
}

/**
 * Create error response
 */
function errorResponse(message: string, status: number, headers?: Record<string, string>) {
    return NextResponse.json(
        { error: message },
        { status, headers }
    );
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth<T extends AuthContext>(
    handler: (context: T) => Promise<NextResponse>,
    options?: AuthOptions
) {
    return async (
        request: NextRequest,
        routeContext?: { params: Promise<Record<string, string>> }
    ): Promise<NextResponse> => {
        // Get authenticated user
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized - Please log in', 401);
        }

        // SEC-MED-02: CSRF protection for state-changing methods
        const method = request.method;
        if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
            if (!validateOrigin(request)) {
                return errorResponse('Invalid request origin', 403);
            }
        }

        // Check role requirement
        if (options?.requiredRole && options.requiredRole.length > 0) {
            if (!options.requiredRole.includes(user.role)) {
                // Log unauthorized access attempt
                logWarn({ action: 'API_AUTH_UNAUTHORIZED_ACCESS_ATTEMPT', userId: user.id, status: user.role });

                return errorResponse('Forbidden - Insufficient permissions', 403);
            }
        }

        // SEC-CODEX-1: MFA enforcement for privileged roles
        if (options?.requireMFA) {
            try {
                const supabaseMfa = await createClient();
                if (!supabaseMfa) {
                    // FAIL CLOSED - deny access if Supabase client unavailable
                    return errorResponse('MFA validation unavailable', 503);
                }
                const { data: mfaData, error: mfaError } = await supabaseMfa.auth.mfa.getAuthenticatorAssuranceLevel();
                if (mfaError || !mfaData) {
                    return errorResponse('MFA validation unavailable', 503);
                }
                if (mfaData.currentLevel !== 'aal2') {
                    return errorResponse('MFA required - please complete second factor authentication', 403);
                }
            } catch (mfaErr) {
                logError({ action: 'API_AUTH_MFA_CHECK_ERROR', error: sanitizeError(mfaErr) });
                // FAIL CLOSED - deny access if MFA check fails
                return errorResponse('MFA validation unavailable', 503);
            }
        }

        // Check organization requirement
        if (options?.requireOrganization && !user.organizationId) {
            return errorResponse('Organization required', 403);
        }

        // Check feature requirement - SEC-006: FAIL CLOSED
        if (options?.requiredFeature) {
            try {
                const supabase = await createClient();
                if (!supabase) {
                    // SEC-006: FAIL CLOSED - deny access if Supabase client unavailable
                    return errorResponse('Feature validation unavailable', 503);
                }

                const { data: feature, error: featureError } = await supabase
                    .from('user_features')
                    .select('enabled, expires_at, features!inner(code)')
                    .eq('user_id', user.id)
                    .eq('features.code', options.requiredFeature)
                    .eq('enabled', true)
                    .maybeSingle();

                if (featureError) {
                    logError({ action: 'API_AUTH_FEATURE_CHECK_DB_ERROR', error: sanitizeError(featureError) });
                    // FAIL CLOSED on database error
                    return errorResponse('Feature validation unavailable', 503);
                }

                if (!feature) {
                    return errorResponse('Feature not enabled for your account', 403);
                }

                // Check if feature has expired
                if (feature.expires_at && new Date(feature.expires_at) < new Date()) {
                    return errorResponse('Feature access has expired', 403);
                }
            } catch (err) {
                logError({ action: 'API_AUTH_FEATURE_CHECK_ERROR', error: sanitizeError(err) });
                // SEC-006: FAIL CLOSED - Do NOT allow through on error
                return errorResponse('Feature validation unavailable', 503);
            }
        }

        // Resolve dynamic route params if present
        const resolvedParams = routeContext?.params
            ? await routeContext.params
            : undefined;

        // Call the handler with auth context
        const context = {
            user,
            request,
            params: resolvedParams,
        } as T;

        return handler(context);
    };
}

/**
 * Check if user has specific role
 */
export function hasRole(user: AuthenticatedUser, roles: string[]): boolean {
    return roles.includes(user.role);
}

/**
 * Check if user is admin or higher
 */
export function isAdmin(user: AuthenticatedUser): boolean {
    return hasRole(user, ['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: AuthenticatedUser): boolean {
    return user.role === 'SUPER_ADMIN';
}

/**
 * Check if user can access resource in organization
 */
export function canAccessOrganization(
    user: AuthenticatedUser,
    organizationId: string
): boolean {
    // Super admins can access all organizations
    if (isSuperAdmin(user)) {
        return true;
    }

    // Others can only access their own organization
    return user.organizationId === organizationId;
}

/**
 * Check if user can access patient (same organization)
 */
export async function canAccessPatient(
    user: AuthenticatedUser,
    patientId: string
): Promise<boolean> {
    if (isSuperAdmin(user)) {
        return true;
    }

    try {
        const supabase = await createClient();
        if (!supabase || !user.organizationId) return false;

        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('id', patientId)
            .eq('organization_id', user.organizationId)
            .single();

        return Boolean(patient);
    } catch {
        return false;
    }
}
