'use client';

// TriageBadge — Small colored dot component for patient list rows

import React from 'react';
import { type SafetyLevel } from '@/lib/types/smart-triage';

interface TriageBadgeProps {
    level: SafetyLevel | 'none';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    alertsCount?: number;
}

const badgeConfig: Record<string, { color: string; pulse: boolean; label: string; emoji: string }> = {
    green: { color: 'bg-emerald-500', pulse: false, label: 'All Clear', emoji: '🟢' },
    yellow: { color: 'bg-amber-500', pulse: false, label: 'Caution', emoji: '🟡' },
    red: { color: 'bg-red-500', pulse: true, label: 'Alert', emoji: '🔴' },
    black: { color: 'bg-gray-900', pulse: true, label: 'Critical', emoji: '⚫' },
    none: { color: 'bg-gray-300', pulse: false, label: 'Pending', emoji: '⚪' },
};

const sizeConfig = {
    sm: { dot: 'w-2 h-2', text: 'text-[10px]' },
    md: { dot: 'w-2.5 h-2.5', text: 'text-xs' },
    lg: { dot: 'w-3 h-3', text: 'text-sm' },
};

export default function TriageBadge({
    level,
    size = 'sm',
    showLabel = false,
    alertsCount,
}: TriageBadgeProps) {
    const config = badgeConfig[level] || badgeConfig.none;
    const sizes = sizeConfig[size] || sizeConfig.sm;

    return (
        <div className="inline-flex items-center gap-1.5" title={config.label}>
            <span className="relative inline-flex">
                <span className={`${sizes.dot} rounded-full ${config.color}`} />
                {config.pulse && (
                    <span className={`absolute inset-0 ${sizes.dot} rounded-full ${config.color} animate-ping opacity-50`} />
                )}
            </span>
            {showLabel && (
                <span className={`${sizes.text} font-medium text-gray-600`}>{config.label}</span>
            )}
            {alertsCount !== undefined && alertsCount > 0 && (
                <span className={`${sizes.text} font-bold ${level === 'red' || level === 'black' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                    {alertsCount}
                </span>
            )}
        </div>
    );
}
