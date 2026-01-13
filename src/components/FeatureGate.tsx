'use client';

import { useFeature } from '@/hooks/useFeature';
import { Lock, Sparkles } from 'lucide-react';
import type { FeatureCode } from '@/types/database';

interface FeatureGateProps {
    feature: FeatureCode;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showLocked?: boolean; // If false, renders nothing when locked
}

/**
 * Gate content behind a feature flag
 * Shows children if user has access, otherwise shows fallback or locked state
 */
export function FeatureGate({
    feature,
    children,
    fallback,
    showLocked = true
}: FeatureGateProps) {
    const { hasFeature, loading } = useFeature(feature);

    if (loading) {
        return (
            <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-32 rounded-xl" />
        );
    }

    if (!hasFeature) {
        if (!showLocked) return null;
        return fallback ? <>{fallback}</> : <LockedFeature featureCode={feature} />;
    }

    return <>{children}</>;
}

interface LockedFeatureProps {
    featureCode: FeatureCode;
    compact?: boolean;
}

/**
 * Default locked feature UI
 */
export function LockedFeature({ featureCode, compact = false }: LockedFeatureProps) {
    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <Lock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">Locked</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mb-4 shadow-lg">
                <Lock className="h-7 w-7 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Feature Locked
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mt-2 max-w-sm text-sm">
                This feature is not included in your current plan or has not been enabled for your account.
            </p>
            <button
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-semibold transition-all border border-primary/20"
                onClick={() => {
                    // Could navigate to upgrade page or open a modal
                    console.log('Request access for feature:', featureCode);
                }}
            >
                <Sparkles className="h-4 w-4" />
                Request Access
            </button>
        </div>
    );
}

/**
 * Feature badge showing tier requirement
 */
interface FeatureBadgeProps {
    tier: 'STARTER' | 'PROFESSIONAL' | 'COMPLETE' | 'ADMIN' | 'SUPER_ADMIN';
    size?: 'sm' | 'md';
}

export function FeatureBadge({ tier, size = 'sm' }: FeatureBadgeProps) {
    const tierConfig = {
        STARTER: { label: 'STARTER', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
        PROFESSIONAL: { label: 'PRO', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
        COMPLETE: { label: 'ELITE', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
        ADMIN: { label: 'ADMIN', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
        SUPER_ADMIN: { label: 'SUPER', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    };

    const config = tierConfig[tier] || tierConfig.STARTER;
    const sizeClasses = size === 'sm'
        ? 'text-[9px] px-1.5 py-0.5'
        : 'text-xs px-2 py-1';

    return (
        <span className={`${sizeClasses} ${config.bg} ${config.text} ${config.border} font-black rounded-md tracking-tighter border shadow-sm dark:bg-opacity-20`}>
            {config.label}
        </span>
    );
}
