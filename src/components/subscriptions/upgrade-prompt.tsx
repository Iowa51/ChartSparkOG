/**
 * Upgrade Prompt Component
 * Shows when user tries to access a feature they don't have
 * 
 * NOTE: This is a NEW component. Use it to WRAP existing features,
 * not replace them.
 * 
 * USAGE EXAMPLE (in existing component):
 * 
 * import { SubscriptionFeatureGate } from '@/components/subscriptions/upgrade-prompt';
 * 
 * // Wrap feature with gate
 * <SubscriptionFeatureGate feature="AI_MEDICAL_CODING">
 *   <ExistingCodingComponent />   // Your existing component - unchanged
 * </SubscriptionFeatureGate>
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { getRequiredTier } from '@/lib/subscriptions/feature-access';

interface UpgradePromptProps {
    feature: string;
    featureDisplayName?: string;
    requiredTier?: 'STARTER' | 'ELITE';
}

export function UpgradePrompt({ feature, featureDisplayName, requiredTier }: UpgradePromptProps) {
    const displayName = featureDisplayName || feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const tier = requiredTier || getRequiredTier(feature);

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                {displayName}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-2 max-w-md text-sm">
                This feature requires the <strong className="text-primary">{tier}</strong> plan.
            </p>
            <p className="text-slate-500 dark:text-slate-500 text-center mb-6 max-w-md text-xs">
                Upgrade to unlock {displayName} and other advanced features.
            </p>
            <Link
                href="/pricing"
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-teal-500/20"
            >
                <Sparkles className="h-4 w-4" />
                View Plans & Upgrade
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

/**
 * Subscription Feature Gate Component
 * Wraps features and shows upgrade prompt if user doesn't have access
 * 
 * Different from the existing FeatureGate - this checks subscription tier,
 * not user_features table directly.
 */
interface SubscriptionFeatureGateProps {
    feature: string;
    featureDisplayName?: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function SubscriptionFeatureGate({
    feature,
    featureDisplayName,
    children,
    fallback
}: SubscriptionFeatureGateProps) {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkAccess() {
            try {
                const response = await fetch(`/api/subscriptions/check-feature?feature=${feature}`);
                const data = await response.json();
                setHasAccess(data.hasAccess);
            } catch {
                // On error, allow access (fail open)
                setHasAccess(true);
            }
        }
        checkAccess();
    }, [feature]);

    // Loading state - show skeleton
    if (hasAccess === null) {
        return (
            <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-64" />
        );
    }

    // No access - show upgrade prompt
    if (!hasAccess) {
        return fallback || <UpgradePrompt feature={feature} featureDisplayName={featureDisplayName} />;
    }

    // Has access - show the actual feature
    return <>{children}</>;
}

/**
 * Read-Only Guard
 * Disables editing when account is in read-only mode
 */
interface ReadOnlyGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function ReadOnlyGuard({ children, fallback }: ReadOnlyGuardProps) {
    const [canEdit, setCanEdit] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkStatus() {
            try {
                const response = await fetch('/api/subscriptions/status');
                const data = await response.json();
                setCanEdit(data.canEdit !== false);
            } catch {
                // On error, allow editing (fail open)
                setCanEdit(true);
            }
        }
        checkStatus();
    }, []);

    // Loading state
    if (canEdit === null) {
        return <>{children}</>;
    }

    // Read-only mode
    if (!canEdit) {
        return fallback || (
            <div className="relative">
                <div className="pointer-events-none opacity-50">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 rounded-lg">
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-lg border flex items-center gap-2">
                        <Lock className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Read-only mode</span>
                    </div>
                </div>
            </div>
        );
    }

    // Can edit - show normally
    return <>{children}</>;
}
