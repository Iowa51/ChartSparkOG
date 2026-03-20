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

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const { organizationId, tierCode } = session.metadata || {};

                if (organizationId && tierCode) {
                    devLog('Webhook', `Activating subscription for org ${organizationId}`);
                    await activateSubscription(
                        organizationId,
                        tierCode as 'STARTER' | 'ELITE',
                        session.subscription as string
                    );
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                devLog('Webhook', `Subscription updated: ${subscription.id}`);

                // Handle subscription updates (e.g., plan changes, renewals)
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
                        updated_at: new Date().toISOString(),
                    })
                    .eq('stripe_subscription_id', subscription.id)
                    .eq('organization_id', existingSub.organization_id);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                devLog('Webhook', `Subscription deleted: ${subscription.id}`);

                const now = new Date();
                const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                await supabase
                    .from('organization_subscriptions')
                    .update({
                        status: 'canceled',
                        canceled_at: now.toISOString(),
                        read_only_started_at: now.toISOString(),
                        deletion_scheduled_at: deletionDate.toISOString(),
                        updated_at: now.toISOString(),
                    })
                    .eq('stripe_subscription_id', subscription.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                devLog('Webhook', `Payment failed for invoice: ${invoice.id}`);

                // Update subscription status to past_due
                const invoiceData = invoice as unknown as { subscription?: string | null };
                if (invoiceData.subscription) {
                    await supabase
                        .from('organization_subscriptions')
                        .update({
                            status: 'past_due',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('stripe_subscription_id', invoiceData.subscription);
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                devLog('Webhook', `Invoice paid: ${invoice.id}`);

                // Ensure subscription is active after successful payment
                const invoiceData = invoice as unknown as { subscription?: string | null };
                if (invoiceData.subscription) {
                    await supabase
                        .from('organization_subscriptions')
                        .update({
                            status: 'active',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('stripe_subscription_id', invoiceData.subscription);
                }
                break;
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        logError({
            action: 'webhook_processing_error',
            error: sanitizeError(error),
            resourceType: 'stripe_webhook',
        });
        await supabase
            .from('processed_webhook_events')
            .delete()
            .eq('stripe_event_id', event.id);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
