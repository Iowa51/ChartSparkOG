/**
 * Subscription Service
 * Handles all subscription-related business logic
 *
 * NOTE: This is a NEW service. It does not replace any existing code.
 */

import { createClient } from '@/lib/supabase/server';
import { devWarn, devError } from '@/lib/logging/safe-logger';

// OPTIMIZATION: In-memory cache for subscription status
// Reduces DB queries for frequently accessed subscription data
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const subscriptionCache = new Map<string, CacheEntry<SubscriptionInfo>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedSubscription(organizationId: string): SubscriptionInfo | null {
    const entry = subscriptionCache.get(organizationId);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.data;
    }
    // Remove expired entry
    if (entry) {
        subscriptionCache.delete(organizationId);
    }
    return null;
}

function setCachedSubscription(organizationId: string, data: SubscriptionInfo): void {
    subscriptionCache.set(organizationId, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
}

// Export for cache invalidation when subscription changes
export function invalidateSubscriptionCache(organizationId: string): void {
    subscriptionCache.delete(organizationId);
}

export type SubscriptionStatus =
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'expired'
    | 'read_only'
    | 'none';

export interface SubscriptionInfo {
    status: SubscriptionStatus;
    tierCode: 'STARTER' | 'ELITE' | null;
    canAccess: boolean;
    canEdit: boolean;
    trialEndsAt?: string;
    deletionScheduledAt?: string;
    daysRemaining?: number;
}

/**
 * Get subscription status for an organization
 * Called from middleware and components
 * OPTIMIZATION: Results are cached for 5 minutes to reduce DB load
 */
export async function getSubscriptionStatus(organizationId: string): Promise<SubscriptionInfo> {
    // Check cache first
    const cached = getCachedSubscription(organizationId);
    if (cached) {
        return cached;
    }

    const supabase = await createClient();

    if (!supabase) {
        // Demo mode - full access
        const demoResult: SubscriptionInfo = {
            status: 'active',
            tierCode: 'ELITE',
            canAccess: true,
            canEdit: true,
        };
        setCachedSubscription(organizationId, demoResult);
        return demoResult;
    }

    const { data: subscription, error } = await supabase
        .from('organization_subscriptions')
        .select(`
      *,
      subscription_tiers (code, name)
    `)
        .eq('organization_id', organizationId)
        .single();

    // No subscription record exists
    if (error || !subscription) {
        const result: SubscriptionInfo = {
            status: 'none',
            tierCode: null,
            canAccess: false,
            canEdit: false,
        };
        setCachedSubscription(organizationId, result);
        return result;
    }

    const now = new Date();

    // Handle trial status
    if (subscription.status === 'trialing') {
        const trialEnd = new Date(subscription.trial_ends_at);

        if (trialEnd < now) {
            // Trial has expired - update status
            await supabase
                .from('organization_subscriptions')
                .update({
                    status: 'expired',
                    read_only_started_at: now.toISOString(),
                    deletion_scheduled_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .eq('id', subscription.id);

            const result: SubscriptionInfo = {
                status: 'expired',
                tierCode: null,
                canAccess: true,
                canEdit: false,
            };
            setCachedSubscription(organizationId, result);
            return result;
        }

        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const result: SubscriptionInfo = {
            status: 'trialing',
            tierCode: 'ELITE', // Full access during trial
            canAccess: true,
            canEdit: true,
            trialEndsAt: subscription.trial_ends_at,
            daysRemaining,
        };
        setCachedSubscription(organizationId, result);
        return result;
    }

    // Handle read-only status
    if (subscription.status === 'read_only' || subscription.status === 'expired') {
        const deletionDate = subscription.deletion_scheduled_at
            ? new Date(subscription.deletion_scheduled_at)
            : null;

        if (deletionDate && deletionDate < now) {
            // Should trigger deletion
            const result: SubscriptionInfo = {
                status: 'none',
                tierCode: null,
                canAccess: false,
                canEdit: false,
            };
            setCachedSubscription(organizationId, result);
            return result;
        }

        const result: SubscriptionInfo = {
            status: 'read_only',
            tierCode: null,
            canAccess: true,
            canEdit: false,
            deletionScheduledAt: subscription.deletion_scheduled_at,
        };
        setCachedSubscription(organizationId, result);
        return result;
    }

    // Handle active subscription
    if (subscription.status === 'active') {
        // Type assertion for joined query
        const tierData = subscription.subscription_tiers as { code: string; name: string } | null;
        const result: SubscriptionInfo = {
            status: 'active',
            tierCode: (tierData?.code as 'STARTER' | 'ELITE') || 'STARTER',
            canAccess: true,
            canEdit: true,
        };
        setCachedSubscription(organizationId, result);
        return result;
    }

    // Handle other statuses (past_due, canceled)
    const tierData = subscription.subscription_tiers as { code: string; name: string } | null;
    const result: SubscriptionInfo = {
        status: subscription.status as SubscriptionStatus,
        tierCode: (tierData?.code as 'STARTER' | 'ELITE') || null,
        canAccess: subscription.status === 'past_due', // Allow access during grace period
        canEdit: subscription.status === 'past_due',
    };
    setCachedSubscription(organizationId, result);
    return result;
}

/**
 * Create a trial subscription for a new organization
 * Called during signup
 */
export async function createTrialSubscription(
    organizationId: string,
    stripeCustomerId: string
): Promise<void> {
    const supabase = await createClient();

    if (!supabase) {
        devWarn('Subscription', 'Demo mode - skipping trial creation');
        return;
    }

    // Get ELITE tier for trial (users get full access during trial)
    const { data: eliteTier } = await supabase
        .from('subscription_tiers')
        .select('id')
        .eq('code', 'ELITE')
        .single();

    if (!eliteTier) {
        throw new Error('Elite tier not found');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial

    await supabase.from('organization_subscriptions').insert({
        organization_id: organizationId,
        tier_id: eliteTier.id,
        status: 'trialing',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        stripe_customer_id: stripeCustomerId,
    });

    // OPTIMIZATION: Invalidate cache after subscription creation
    invalidateSubscriptionCache(organizationId);
}

/**
 * Activate a paid subscription
 * Called from Stripe webhook after successful payment
 */
export async function activateSubscription(
    organizationId: string,
    tierCode: 'STARTER' | 'ELITE',
    stripeSubscriptionId: string
): Promise<void> {
    const supabase = await createClient();

    if (!supabase) {
        devWarn('Subscription', 'Demo mode - skipping activation');
        return;
    }

    const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('id')
        .eq('code', tierCode)
        .single();

    if (!tier) {
        throw new Error(`Tier ${tierCode} not found`);
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase
        .from('organization_subscriptions')
        .update({
            tier_id: tier.id,
            status: 'active',
            stripe_subscription_id: stripeSubscriptionId,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            // Clear trial/grace period fields
            read_only_started_at: null,
            deletion_scheduled_at: null,
        })
        .eq('organization_id', organizationId);

    // OPTIMIZATION: Invalidate cache after subscription change
    invalidateSubscriptionCache(organizationId);
}

/**
 * Check if user has access to a specific feature
 * This USES the existing user_features table, does not replace it
 */
export async function checkFeatureAccess(
    userId: string,
    featureCode: string
): Promise<boolean> {
    const supabase = await createClient();

    if (!supabase) {
        // Demo mode - all features enabled
        return true;
    }

    const { data, error } = await supabase
        .from('user_features')
        .select(`
      enabled,
      expires_at,
      features!inner(code, tier_required)
    `)
        .eq('user_id', userId)
        .eq('features.code', featureCode)
        .eq('enabled', true)
        .maybeSingle();

    if (error || !data) {
        // SEC-REMEDIATION: FAIL CLOSED - deny access on error
        // This prevents attackers from exploiting database errors to bypass feature gates
        devError('Subscription', 'Feature access check failed - DENYING ACCESS:', error);
        return false;
    }

    // Check if feature has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return false;
    }

    return true;
}
