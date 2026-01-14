// src/lib/auth/api-auth.ts
// API authentication and authorization middleware

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
}

export interface AuthContext {
    user: AuthenticatedUser;
    request: NextRequest;
}

export interface AuthOptions {
    requiredRole?: string[];
    requiredFeature?: string;
    requireOrganization?: boolean;
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

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return null;
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, role, organization_id, is_active')
            .eq('id', session.user.id)
            .single();

        if (userError || !user) {
            return null;
        }

        // Check if account is active
        if (user.is_active === false) {
            console.warn('API Auth: Deactivated account attempted API access', user.email);
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organization_id,
        };
    } catch (error) {
        console.error('Auth error:', error);
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
    return async (request: NextRequest): Promise<NextResponse> => {
        // Get authenticated user
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized - Please log in', 401);
        }

        // Check role requirement
        if (options?.requiredRole && options.requiredRole.length > 0) {
            if (!options.requiredRole.includes(user.role)) {
                // Log unauthorized access attempt
                console.warn(`Unauthorized access attempt: User ${user.email} (${user.role}) tried to access ${request.nextUrl.pathname}`);

                return errorResponse('Forbidden - Insufficient permissions', 403);
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
                if (supabase) {
                    const { data: feature, error: featureError } = await supabase
                        .from('user_features')
                        .select('enabled, expires_at, features!inner(code)')
                        .eq('user_id', user.id)
                        .eq('features.code', options.requiredFeature)
                        .eq('enabled', true)
                        .maybeSingle();

                    if (featureError) {
                        console.error('Feature check database error:', featureError);
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
                }
            } catch (err) {
                console.error('Feature check error:', err);
                // SEC-006: FAIL CLOSED - Do NOT allow through on error
                return errorResponse('Feature validation unavailable', 503);
            }
        }

        // Call the handler with auth context
        const context = {
            user,
            request,
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
        if (!supabase) return false;

        const { data: patient } = await supabase
            .from('patients')
            .select('organization_id')
            .eq('id', patientId)
            .single();

        return patient?.organization_id === user.organizationId;
    } catch {
        return false;
    }
}
