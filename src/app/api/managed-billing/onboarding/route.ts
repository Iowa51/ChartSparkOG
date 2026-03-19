/**
 * Client Onboarding API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * POST /api/managed-billing/onboarding - Start managed billing onboarding
 * GET /api/managed-billing/onboarding - Get onboarding status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBillingAction } from '@/lib/managed-billing/audit-logger';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handleGet(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        if (!context.user.organizationId) {
            return NextResponse.json({ error: 'No organization' }, { status: 403 });
        }

        const { data: subscription } = await supabase
            .from('managed_billing_subscriptions')
            .select('*')
            .eq('organization_id', context.user.organizationId)
            .maybeSingle();

        if (!subscription) {
            return NextResponse.json({ enrolled: false, status: 'not_enrolled' });
        }

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'managed_billing_subscription',
            details: { action: 'ONBOARDING_STATUS_VIEW' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json({
            enrolled: true,
            status: subscription.status,
            onboardingCompleted: !!subscription.onboarding_completed_at,
            feePercentage: subscription.fee_percentage,
        });
    } catch (error) {
        logError({ action: 'ONBOARDING_STATUS_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const body = await context.request.json();

        // Check if already enrolled
        const { data: existing } = await supabase
            .from('managed_billing_subscriptions')
            .select('id')
            .eq('organization_id', context.user.organizationId!)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Already enrolled' }, { status: 400 });
        }

        const { data: subscription, error } = await supabase
            .from('managed_billing_subscriptions')
            .insert({
                organization_id: context.user.organizationId,
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

        await logBillingAction({
            organizationId: context.user.organizationId!,
            userId: context.user.id,
            entityType: 'config',
            entityId: subscription.id,
            action: 'onboarding_completed',
        });

        return NextResponse.json({ success: true, subscriptionId: subscription.id }, { status: 201 });
    } catch (error) {
        logError({ action: 'ONBOARDING_ENROLL_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
