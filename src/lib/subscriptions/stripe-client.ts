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
import { logWarn } from '@/lib/logging/safe-logger';

if (!process.env.STRIPE_SECRET_KEY) {
    logWarn({ action: 'STRIPE_NOT_CONFIGURED', error: 'STRIPE_SECRET_KEY not set' });
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
        logWarn({ action: 'STRIPE_SKIP_CUSTOMER_CREATION', status: 'not_configured' });
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
        logWarn({ action: 'STRIPE_SKIP_CHECKOUT_SESSION', status: 'not_configured' });
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
        logWarn({ action: 'STRIPE_SKIP_BILLING_PORTAL', status: 'not_configured' });
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
        logWarn({ action: 'STRIPE_SKIP_CANCEL_SUBSCRIPTION', status: 'not_configured' });
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
