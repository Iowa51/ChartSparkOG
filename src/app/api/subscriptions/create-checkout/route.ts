/**
 * Create Checkout Session API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * Creates a Stripe checkout session for subscription
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/subscriptions/stripe-client';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { CreateCheckoutSchema, validateRequest } from '@/lib/validation/schemas';

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Demo mode - checkout disabled' }, { status: 400 });
        }

        const rawBody = await context.request.json();
        const validation = validateRequest(CreateCheckoutSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const { tierCode, priceId } = validation.data;

        // Get org subscription for Stripe customer ID (need profiles for backward compat)
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', context.user.id)
            .single();

        const orgId = profile?.organization_id || context.user.organizationId;

        if (!orgId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const { data: subscription } = await supabase
            .from('organization_subscriptions')
            .select('stripe_customer_id')
            .eq('organization_id', orgId)
            .single();

        if (!subscription?.stripe_customer_id) {
            return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 });
        }

        const baseUrl = context.request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const checkoutUrl = await createCheckoutSession(
            subscription.stripe_customer_id,
            priceId,
            orgId,
            tierCode,
            `${baseUrl}/dashboard?subscription=success`,
            `${baseUrl}/pricing?subscription=canceled`
        );

        if (!checkoutUrl) {
            return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutUrl });
    } catch (error) {
        logError({ action: 'CREATE_CHECKOUT_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost);
