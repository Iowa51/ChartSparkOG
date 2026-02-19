'use client';

// ScreeningTrendChart — Sparkline charts for PHQ-9, GAD-7 trends

import React from 'react';

interface ScreeningDataPoint {
    date: string;
    score: number;
}

interface ScreeningTrendChartProps {
    instrument: string;
    data: ScreeningDataPoint[];
    maxScore: number;
    height?: number;
    color?: string;
}

const INSTRUMENT_CONFIG: Record<string, { label: string; color: string; maxScore: number }> = {
    PHQ9: { label: 'PHQ-9', color: '#6366f1', maxScore: 27 },
    GAD7: { label: 'GAD-7', color: '#14b8a6', maxScore: 21 },
    CSSRS: { label: 'C-SSRS', color: '#ef4444', maxScore: 25 },
    AUDITC: { label: 'AUDIT-C', color: '#f59e0b', maxScore: 12 },
    DAST10: { label: 'DAST-10', color: '#8b5cf6', maxScore: 10 },
    MDQ: { label: 'MDQ', color: '#ec4899', maxScore: 13 },
    PCL5: { label: 'PCL-5', color: '#0ea5e9', maxScore: 80 },
};

export default function ScreeningTrendChart({
    instrument,
    data,
    maxScore,
    height = 50,
    color,
}: ScreeningTrendChartProps) {
    const config = INSTRUMENT_CONFIG[instrument] || { label: instrument, color: '#6366f1', maxScore };
    const finalColor = color || config.color;
    const finalMax = maxScore || config.maxScore;

    if (data.length < 2) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{config.label}</span>
                <span className="text-xs text-gray-400 italic">
                    {data.length === 1 ? `${data[0].score}` : '—'}
                </span>
            </div>
        );
    }

    const width = 120;
    const padding = 4;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const scores = data.map(d => d.score);
    const points = data.map((d, i) => ({
        x: padding + (i / (data.length - 1)) * chartW,
        y: padding + chartH - (d.score / finalMax) * chartH,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    // Trend arrow
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const trend = lastScore < firstScore ? 'improving' : lastScore > firstScore ? 'worsening' : 'stable';

    return (
        <div className="flex items-center gap-3 py-1">
            <div className="flex-shrink-0 w-16">
                <span className="text-xs font-medium text-gray-600">{config.label}</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="flex-1" style={{ maxHeight: height, maxWidth: width }}>
                <defs>
                    <linearGradient id={`sparkGrad-${instrument}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={finalColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={finalColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <path
                    d={`${pathD} L${points[points.length - 1].x},${padding + chartH} L${points[0].x},${padding + chartH} Z`}
                    fill={`url(#sparkGrad-${instrument})`}
                />
                <path d={pathD} fill="none" stroke={finalColor} strokeWidth={1.5}
                    strokeLinecap="round" strokeLinejoin="round" />
                <circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r={2.5} fill="white" stroke={finalColor} strokeWidth={1.5}
                />
            </svg>
            <div className="flex-shrink-0 flex items-center gap-1">
                <span className="text-sm font-bold text-gray-800">{lastScore}</span>
                <span className={`text-xs ${trend === 'improving' ? 'text-emerald-500' : trend === 'worsening' ? 'text-red-500' : 'text-gray-400'
                    }`}>
                    {trend === 'improving' ? '↓' : trend === 'worsening' ? '↑' : '→'}
                </span>
            </div>
        </div>
    );
}
