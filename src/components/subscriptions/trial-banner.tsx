/**
 * Trial Banner Component
 * Shows trial status at top of app
 * 
 * NOTE: This is a NEW component.
 * ADD this to your layout - do not replace existing layout code.
 */

'use client';

import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function TrialBanner() {
    const { status, daysRemaining } = useSubscription();

    // Only show for trialing users
    if (status !== 'trialing' || daysRemaining === null) {
        return null;
    }

    // Color coding based on urgency
    const urgencyConfig = daysRemaining <= 2
        ? { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' }
        : daysRemaining <= 4
            ? { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' }
            : { bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-600' };

    return (
        <div className={`${urgencyConfig.bg} ${urgencyConfig.text} px-4 py-2.5 text-center text-sm flex items-center justify-center gap-2 border-b ${urgencyConfig.border}`}>
            <Sparkles className="h-4 w-4" />
            <span>
                You have <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> left in your free trial.
            </span>
            <Link
                href="/pricing"
                className="ml-2 underline font-semibold hover:opacity-80 transition-opacity"
            >
                Choose your plan →
            </Link>
        </div>
    );
}
