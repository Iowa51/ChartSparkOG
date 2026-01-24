/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscription management
 * 
 * NOTE: This is a NEW API route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/subscriptions/stripe-client';
import { activateSubscription } from '@/lib/subscriptions/subscription-service';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
    if (!stripe) {
        console.warn('[Webhook] Stripe not configured');
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('[Webhook] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const { organizationId, tierCode } = session.metadata || {};

                if (organizationId && tierCode) {
                    console.log(`[Webhook] Activating subscription for org ${organizationId} with tier ${tierCode}`);
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
                console.log(`[Webhook] Subscription updated: ${subscription.id}`);

                // Handle subscription updates (e.g., plan changes, renewals)
                const supabase = await createClient();
                if (supabase) {
                    const status = subscription.status === 'active' ? 'active'
                        : subscription.status === 'past_due' ? 'past_due'
                            : subscription.status === 'canceled' ? 'canceled'
                                : 'active';

                    // Access period timestamps - use type assertion for compatibility with different Stripe versions
                    const subData = subscription as unknown as { current_period_start: number; current_period_end: number };

                    await supabase
                        .from('organization_subscriptions')
                        .update({
                            status,
                            current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('stripe_subscription_id', subscription.id);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

                const supabase = await createClient();
                if (supabase) {
                    const now = new Date();
                    const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`[Webhook] Payment failed for invoice: ${invoice.id}`);

                // Update subscription status to past_due
                const supabase = await createClient();
                // Use type assertion for subscription property compatibility
                const invoiceData = invoice as unknown as { subscription?: string | null };
                if (supabase && invoiceData.subscription) {
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
                console.log(`[Webhook] Invoice paid: ${invoice.id}`);

                // Ensure subscription is active after successful payment
                const supabase = await createClient();
                // Use type assertion for subscription property compatibility
                const invoiceData = invoice as unknown as { subscription?: string | null };
                if (supabase && invoiceData.subscription) {
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
        console.error('[Webhook] Processing error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
