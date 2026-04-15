/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscription management
 *
 * SEC-REMEDIATION: Added idempotency checking and webhook secret validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/subscriptions/stripe-client';
import { activateSubscription } from '@/lib/subscriptions/subscription-service';
import { requireServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError, devLog, logWarn } from '@/lib/logging/safe-logger';
import type Stripe from 'stripe';

// SEC-PT5-F4: Server-side price-to-tier mapping — never trust metadata
const PRICE_ID_TO_TIER: Record<string, 'STARTER' | 'ELITE'> = {
    [process.env.STRIPE_STARTER_PRICE_ID || '']: 'STARTER',
    [process.env.STRIPE_ELITE_PRICE_ID || '']: 'ELITE',
};

function mapPriceIdToTierCode(priceId: string | undefined): 'STARTER' | 'ELITE' | null {
    if (!priceId) return null;
    return PRICE_ID_TO_TIER[priceId] || null;
}

export async function POST(request: NextRequest) {
    if (!stripe) {
        logWarn({ action: 'WEBHOOK_STRIPE_NOT_CONFIGURED' });
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // SEC-REMEDIATION: Validate webhook secret exists
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        logError({
            action: 'webhook_config_error',
            error: 'STRIPE_WEBHOOK_SECRET not configured',
        });
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        logError({
            action: 'webhook_signature_error',
            error: sanitizeError(err),
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = requireServiceRoleClient();
    const { error: idempotencyError } = await supabase
        .from('processed_webhook_events')
        .insert({ stripe_event_id: event.id });

    if (idempotencyError) {
        if (idempotencyError.code === '23505') {
            devLog('Webhook', `Duplicate event ignored: ${event.id}`);
            return NextResponse.json({ received: true, duplicate: true });
        }

        logError({
            action: 'webhook_idempotency_error',
            error: sanitizeError(idempotencyError),
            resourceId: event.id,
        });
        return NextResponse.json({ error: 'Webhook idempotency check failed' }, { status: 500 });
    }

    // SEC-PT5-F2: Use Stripe event timestamp for all date calculations
    const eventTime = new Date(event.created * 1000);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const { organizationId } = session.metadata || {};

                if (organizationId && session.subscription) {
                    // SEC-PT5-F4: Derive tierCode from actual Stripe line items, not metadata
                    let validatedTierCode: 'STARTER' | 'ELITE' | null = null;
                    try {
                        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
                        const priceId = lineItems.data[0]?.price?.id;
                        validatedTierCode = mapPriceIdToTierCode(priceId);
                    } catch (lineItemErr) {
                        logError({ action: 'WEBHOOK_LINE_ITEM_FETCH_FAILED', error: sanitizeError(lineItemErr) });
                    }

                    if (!validatedTierCode) {
                        logError({ action: 'WEBHOOK_UNKNOWN_TIER', resourceId: session.id, error: 'Price ID does not map to known tier' });
                        break;
                    }

                    devLog('Webhook', `Activating subscription for org ${organizationId} tier ${validatedTierCode}`);
                    await activateSubscription(
                        organizationId,
                        validatedTierCode,
                        session.subscription as string
                    );
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                devLog('Webhook', `Subscription updated: ${subscription.id}`);

                const { data: existingSub } = await supabase
                    .from('organization_subscriptions')
                    .select('organization_id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (!existingSub) {
                    logWarn({ action: 'WEBHOOK_UNKNOWN_SUBSCRIPTION', resourceId: subscription.id });
                    break;
                }

                const status = subscription.status === 'active' ? 'active'
                    : subscription.status === 'past_due' ? 'past_due'
                        : subscription.status === 'canceled' ? 'canceled'
                            : 'active';

                const subData = subscription as unknown as { current_period_start: number; current_period_end: number };

                await supabase
                    .from('organization_subscriptions')
                    .update({
                        status,
                        current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
                        updated_at: eventTime.toISOString(),
                    })
                    .eq('stripe_subscription_id', subscription.id)
                    .eq('organization_id', existingSub.organization_id);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                devLog('Webhook', `Subscription deleted: ${subscription.id}`);

                // SEC-PT5-F2: Use event timestamp for deterministic dates
                const deletionDate = new Date(eventTime.getTime() + 30 * 24 * 60 * 60 * 1000);

                await supabase
                    .from('organization_subscriptions')
                    .update({
                        status: 'canceled',
                        canceled_at: eventTime.toISOString(),
                        read_only_started_at: eventTime.toISOString(),
                        deletion_scheduled_at: deletionDate.toISOString(),
                        updated_at: eventTime.toISOString(),
                    })
                    .eq('stripe_subscription_id', subscription.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                devLog('Webhook', `Payment failed for invoice: ${invoice.id}`);

                const invoiceData = invoice as unknown as { subscription?: string | null };
                if (invoiceData.subscription) {
                    await supabase
                        .from('organization_subscriptions')
                        .update({
                            status: 'past_due',
                            updated_at: eventTime.toISOString(),
                        })
                        .eq('stripe_subscription_id', invoiceData.subscription);
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                devLog('Webhook', `Invoice paid: ${invoice.id}`);

                const invoiceData = invoice as unknown as { subscription?: string | null };
                if (invoiceData.subscription) {
                    await supabase
                        .from('organization_subscriptions')
                        .update({
                            status: 'active',
                            updated_at: eventTime.toISOString(),
                        })
                        .eq('stripe_subscription_id', invoiceData.subscription);
                }
                break;
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        // SEC-PT5-F1: DO NOT delete idempotency record on failure.
        // Let it persist so Stripe retries see the duplicate and skip.
        // Manual admin reprocessing can clear specific records if needed.
        logError({
            action: 'webhook_processing_error',
            error: sanitizeError(error),
            resourceType: 'stripe_webhook',
            resourceId: event.id,
        });
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
