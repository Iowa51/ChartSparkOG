// src/app/api/auth/complete-signup/route.ts
// SEC-013: Complete user registration with organization creation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SignupData {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SignupData = await request.json();

        // Validate required fields
        const { userId, email, firstName, lastName, organizationName } = body;

        if (!userId || !email || !firstName || !lastName || !organizationName) {
            return NextResponse.json(
                { error: 'All fields are required' },
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

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 503 }
            );
        }

        // Create organization slug from name
        const slug = organizationName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50);

        // Create organization first
        const { data: org, error: orgError } = await supabase
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
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: userId, // Must match Supabase Auth user ID
                email: email.toLowerCase(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: 'ADMIN', // First user becomes admin of their org
                organization_id: org.id,
                is_active: true,
            });

        if (userError) {
            console.error('User creation error:', userError);
            // Rollback organization creation
            await supabase.from('organizations').delete().eq('id', org.id);
            return NextResponse.json(
                { error: 'Failed to create user profile' },
                { status: 500 }
            );
        }

        // Assign default features for STARTER tier
        try {
            const { data: features } = await supabase
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

                await supabase.from('user_features').insert(userFeatures);
            }
        } catch (featureError) {
            // Non-critical - log but don't fail registration
            console.warn('Feature assignment warning:', featureError);
        }

        // Audit log
        await supabase.from('audit_logs').insert({
            event_type: 'USER_CREATED',
            user_id: userId,
            user_email: email,
            user_role: 'ADMIN',
            organization_id: org.id,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            risk_level: 'LOW',
            details: { organizationName, isNewOrg: true },
        }).catch(() => { });

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
