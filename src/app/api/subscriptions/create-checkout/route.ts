/**
 * Create Checkout Session API
 * Creates a Stripe checkout session for subscription
 * 
 * NOTE: This is a NEW API route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/subscriptions/stripe-client';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Demo mode - checkout disabled' }, { status: 400 });
        }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get request body
        const { tierCode, priceId } = await request.json();

        if (!tierCode || !priceId) {
            return NextResponse.json({ error: 'tierCode and priceId required' }, { status: 400 });
        }

        // Get user's organization and subscription
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Get org subscription for Stripe customer ID
        const { data: subscription } = await supabase
            .from('organization_subscriptions')
            .select('stripe_customer_id')
            .eq('organization_id', profile.organization_id)
            .single();

        if (!subscription?.stripe_customer_id) {
            return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 });
        }

        // Create checkout session
        const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const checkoutUrl = await createCheckoutSession(
            subscription.stripe_customer_id,
            priceId,
            profile.organization_id,
            tierCode,
            `${baseUrl}/dashboard?subscription=success`,
            `${baseUrl}/pricing?subscription=canceled`
        );

        if (!checkoutUrl) {
            return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutUrl });

    } catch (error) {
        console.error('[Create Checkout] Error:', error);
        return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }
}
