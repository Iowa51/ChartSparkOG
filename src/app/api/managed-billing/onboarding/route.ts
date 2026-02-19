/**
 * Client Onboarding API Route
 * POST /api/managed-billing/onboarding - Start managed billing onboarding
 * GET /api/managed-billing/onboarding - Get onboarding status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBillingAction } from '@/lib/managed-billing/audit-logger';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization' }, { status: 403 });
        }

        const { data: subscription } = await supabase
            .from('managed_billing_subscriptions')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();

        if (!subscription) {
            return NextResponse.json({
                enrolled: false,
                status: 'not_enrolled',
            });
        }

        return NextResponse.json({
            enrolled: true,
            status: subscription.status,
            onboardingCompleted: !!subscription.onboarding_completed_at,
            feePercentage: subscription.fee_percentage,
        });
    } catch (error) {
        console.error('[API] Onboarding status error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id || profile.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();

        // Check if already enrolled
        const { data: existing } = await supabase
            .from('managed_billing_subscriptions')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Already enrolled' }, { status: 400 });
        }

        // Create subscription
        const { data: subscription, error } = await supabase
            .from('managed_billing_subscriptions')
            .insert({
                organization_id: profile.organization_id,
                status: 'pending',
                fee_percentage: 5.0,
                practice_npi: body.practiceNpi,
                practice_tax_id: body.practiceTaxId,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
        }

        // Log the onboarding
        await logBillingAction({
            organizationId: profile.organization_id,
            userId: user.id,
            entityType: 'config',
            entityId: subscription.id,
            action: 'onboarding_completed',
        });

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
        }, { status: 201 });
    } catch (error) {
        console.error('[API] Onboarding error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
