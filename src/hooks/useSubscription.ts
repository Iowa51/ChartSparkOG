/**
 * Subscription Hook
 * Provides subscription status to client components
 * 
 * NOTE: This is a NEW hook. Does not replace existing hooks.
 */

'use client';

import { useState, useEffect } from 'react';

export interface SubscriptionState {
    status: 'trialing' | 'active' | 'expired' | 'read_only' | 'past_due' | 'canceled' | 'none' | 'loading';
    tierCode: 'STARTER' | 'ELITE' | null;
    canAccess: boolean;
    canEdit: boolean;
    trialEndsAt: string | null;
    daysRemaining: number | null;
    deletionScheduledAt: string | null;
}

const defaultState: SubscriptionState = {
    status: 'loading',
    tierCode: null,
    canAccess: true,
    canEdit: true, // Default to true while loading for better UX
    trialEndsAt: null,
    daysRemaining: null,
    deletionScheduledAt: null,
};

export function useSubscription() {
    const [subscription, setSubscription] = useState<SubscriptionState>(defaultState);

    useEffect(() => {
        async function fetchSubscription() {
            try {
                const response = await fetch('/api/subscriptions/status');

                if (!response.ok) {
                    // On error, default to active (fail open for UX)
                    setSubscription({
                        ...defaultState,
                        status: 'active',
                        tierCode: 'ELITE',
                        canAccess: true,
                        canEdit: true,
                    });
                    return;
                }

                const data = await response.json();
                setSubscription({
                    status: data.status || 'active',
                    tierCode: data.tierCode || null,
                    canAccess: data.canAccess !== false,
                    canEdit: data.canEdit !== false,
                    trialEndsAt: data.trialEndsAt || null,
                    daysRemaining: data.daysRemaining ?? null,
                    deletionScheduledAt: data.deletionScheduledAt || null,
                });
            } catch (error) {
                console.error('[useSubscription] Failed to fetch subscription:', error);
                // On error, allow access (fail open for UX)
                setSubscription({
                    ...defaultState,
                    status: 'active',
                    tierCode: 'ELITE',
                    canAccess: true,
                    canEdit: true,
                });
            }
        }

        fetchSubscription();
    }, []);

    return subscription;
}

/**
 * Check if subscription allows editing
 */
export function useCanEdit() {
    const { canEdit, status } = useSubscription();
    return canEdit && status !== 'loading';
}

/**
 * Check if user is in trial
 */
export function useIsTrial() {
    const { status, daysRemaining } = useSubscription();
    return {
        isTrial: status === 'trialing',
        daysRemaining,
    };
}

/**
 * Check if subscription is read-only
 */
export function useIsReadOnly() {
    const { status, canEdit } = useSubscription();
    return status === 'read_only' || status === 'expired' || !canEdit;
}
