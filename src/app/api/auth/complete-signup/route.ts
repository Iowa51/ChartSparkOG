// src/app/api/auth/complete-signup/route.ts
// SEC-REMEDIATION: Fixed privilege escalation vulnerability
// CRITICAL: Now uses authenticated user's ID, never trusts client-provided userId

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';

interface SignupData {
    // SEC-REMEDIATION: userId and email are now IGNORED from request body
    // We get these from the authenticated session instead
    firstName: string;
    lastName: string;
    organizationName: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SignupData = await request.json();

        // SEC-REMEDIATION: Get authenticated user from session, NEVER trust client-provided userId
        const supabase = await createClient();
        if (!supabase) {
            // Demo mode - return success without database operations
            const isDemoMode = process.env.NODE_ENV !== 'production' &&
                process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
            if (isDemoMode) {
                return NextResponse.json({
                    success: true,
                    organizationId: 'demo-org-id',
                    demo: true,
                });
            }
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 503 }
            );
        }

        // CRITICAL SECURITY FIX: Get user from authenticated session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - must be logged in to complete signup' },
                { status: 401 }
            );
        }

        // Use AUTHENTICATED user's data - this is the security fix
        // Any userId/email in request body is completely ignored
        const userId = user.id;
        const email = user.email;

        // Validate required fields from body (but NOT userId/email)
        const { firstName, lastName, organizationName } = body;

        if (!firstName || !lastName || !organizationName) {
            return NextResponse.json(
                { error: 'First name, last name, and organization name are required' },
                { status: 400 }
            );
        }

        // Basic validation
        if (firstName.length > 50 || lastName.length > 50 || organizationName.length > 100) {
            return NextResponse.json(
                { error: 'Field values too long' },
                { status: 400 }
            );
        }

        // Use service role client for privileged database operations
        const serviceSupabase = createServiceRoleClient();
        if (!serviceSupabase) {
            // Demo mode fallback
            return NextResponse.json({
                success: true,
                organizationId: 'demo-org-id',
                demo: true,
            });
        }

        // Create organization slug from name
        const slug = organizationName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50);

        // Create organization first
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
            console.error('Organization creation error:', orgError);
            return NextResponse.json(
                { error: 'Failed to create organization' },
                { status: 500 }
            );
        }

        // Create user profile linked to auth user and organization
        const { error: userError } = await serviceSupabase
            .from('users')
            .insert({
                id: userId, // From authenticated session, NOT from request body
                email: email?.toLowerCase(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: 'ADMIN', // First user becomes admin of their org
                organization_id: org.id,
                is_active: true,
            });

        if (userError) {
            console.error('User creation error:', userError);
            // Rollback organization creation
            await serviceSupabase.from('organizations').delete().eq('id', org.id);
            return NextResponse.json(
                { error: 'Failed to create user profile' },
                { status: 500 }
            );
        }

        // Assign default features for STARTER tier
        try {
            const { data: features } = await serviceSupabase
                .from('features')
                .select('id')
                .or('tier_required.eq.STARTER,tier_required.is.null');

            if (features && features.length > 0) {
                const userFeatures = features.map((f: { id: string }) => ({
                    user_id: userId,
                    feature_id: f.id,
                    enabled: true,
                    granted_by: userId,
                }));

                await serviceSupabase.from('user_features').insert(userFeatures);
            }
        } catch (featureError) {
            // Non-critical - log but don't fail registration
            console.warn('Feature assignment warning:', featureError);
        }

        // Audit log - SEC-REMEDIATION: No PHI in details
        try {
            await serviceSupabase.from('audit_logs').insert({
                event_type: 'USER_CREATED',
                user_id: userId,
                user_email: email,
                user_role: 'ADMIN',
                organization_id: org.id,
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown',
                risk_level: 'LOW',
                details: { isNewOrg: true },
            });
        } catch {
            // Non-critical - audit log failure shouldn't fail registration
        }

        return NextResponse.json({
            success: true,
            organizationId: org.id,
        });

    } catch (error) {
        console.error('Complete signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
