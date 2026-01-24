/**
 * Read-Only Banner Component
 * Shows when account is in read-only mode (expired trial or canceled subscription)
 * 
 * NOTE: This is a NEW component.
 */

'use client';

import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function ReadOnlyBanner() {
    const { status, deletionScheduledAt } = useSubscription();

    // Only show for read-only or expired users
    if (status !== 'read_only' && status !== 'expired') {
        return null;
    }

    const deletionDate = deletionScheduledAt
        ? new Date(deletionScheduledAt)
        : null;

    const daysUntilDeletion = deletionDate
        ? Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="bg-red-600 text-white px-4 py-3 text-center flex items-center justify-center gap-2 border-b border-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span>
                Your account is in <strong>read-only mode</strong>.
                {daysUntilDeletion && daysUntilDeletion > 0 && (
                    <> Your data will be deleted in <strong>{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</strong>.</>
                )}
            </span>
            <Link
                href="/pricing"
                className="ml-2 underline font-semibold hover:opacity-80 transition-opacity"
            >
                Choose a plan to restore full access →
            </Link>
        </div>
    );
}
