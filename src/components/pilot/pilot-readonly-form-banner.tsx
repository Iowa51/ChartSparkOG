// Build 1.5: in-form readonly banner for the new-note page. This is a
// page-specific complement to the layout-level PilotReadOnlyBanner — same
// pilot phase, but rendered inside the form area so the clinician sees it
// right next to the disabled inputs they are looking at.

'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
    pilotReadonlyUntil: string | null;
    pilotPhase: 'not_pilot' | 'active' | 'readonly' | 'locked';
}

function formatDate(iso: string | null): string {
    if (!iso) return 'shortly';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return 'shortly';
    }
}

export function PilotReadonlyFormBanner({ pilotReadonlyUntil, pilotPhase }: Props) {
    const isLocked = pilotPhase === 'locked';
    const heading = isLocked
        ? 'This pilot has ended.'
        : 'This pilot is in read-only mode.';
    const detail = isLocked
        ? 'Your trial window has expired. New notes cannot be created or edited, and read-only access has ended.'
        : `New notes cannot be created or edited. Read-only access ends ${formatDate(pilotReadonlyUntil)}.`;

    return (
        <div
            role="status"
            aria-live="polite"
            data-testid="pilot-readonly-form-banner"
            className="flex-none border-b border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-6 py-3 flex items-center gap-3 text-sm"
        >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
                <span className="font-semibold">{heading}</span>{' '}
                <span>{detail}</span>{' '}
                <span>
                    Contact{' '}
                    <a
                        href="mailto:james@redark.ventures"
                        className="underline font-semibold hover:opacity-80"
                    >
                        james@redark.ventures
                    </a>{' '}
                    to extend or convert to a full account.
                </span>
            </div>
            <Link
                href="/notes"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to notes
            </Link>
        </div>
    );
}
