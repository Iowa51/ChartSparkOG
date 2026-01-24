/**
 * Stripe Client
 * Handles Stripe API interactions
 * 
 * NOTE: This is a NEW file. Does not replace existing code.
 * 
 * IMPORTANT: Requires `stripe` package to be installed:
 * npm install stripe
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set - Stripe functionality disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

/**
 * Create a Stripe customer for a new organization
 */
export async function createStripeCustomer(
    email: string,
    name: string,
    organizationName: string
): Promise<string | null> {
    if (!stripe) {
        console.warn('[Stripe] Not configured - skipping customer creation');
        return null;
    }

    const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
            organization_name: organizationName,
        },
    });

    return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
    customerId: string,
    priceId: string,
    organizationId: string,
    tierCode: string,
    successUrl: string,
    cancelUrl: string
): Promise<string | null> {
    if (!stripe) {
        console.warn('[Stripe] Not configured - cannot create checkout session');
        return null;
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            organizationId,
            tierCode,
        },
    });

    return session.url;
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(
    customerId: string,
    returnUrl: string
): Promise<string | null> {
    if (!stripe) {
        console.warn('[Stripe] Not configured - cannot create billing portal session');
        return null;
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });

    return session.url;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
): Promise<void> {
    if (!stripe) {
        console.warn('[Stripe] Not configured - cannot cancel subscription');
        return;
    }

    if (cancelAtPeriodEnd) {
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    } else {
        await stripe.subscriptions.cancel(subscriptionId);
    }
}
