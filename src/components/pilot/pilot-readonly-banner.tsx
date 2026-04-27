'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
    daysRemaining: number;
}

export function PilotReadOnlyBannerClient({ daysRemaining }: Props) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;

    const dayLabel = daysRemaining === 1 ? 'day' : 'days';

    return (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-sm flex items-center justify-center gap-3 border-b border-amber-600 sticky top-0 z-50 w-full">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-center">
                Your pilot has ended its active phase. You have{' '}
                <strong>{daysRemaining} {dayLabel}</strong> to view and export your data.
                This is a read-only window — new notes, edits, and signatures are disabled.
                Contact{' '}
                <a
                    href="mailto:james@redark.ventures"
                    className="underline font-semibold hover:opacity-80"
                >
                    james@redark.ventures
                </a>{' '}
                to extend or convert to a full account.
            </span>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss for this session"
                className="ml-2 hover:opacity-80 flex-shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
