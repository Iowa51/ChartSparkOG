'use client';

// WeightTrendChart — SVG line chart showing weight over last 6 visits

import React from 'react';

interface WeightDataPoint {
    date: string;
    weight: number;
    unit?: string;
}

interface WeightTrendChartProps {
    data: WeightDataPoint[];
    height?: number;
    showLabels?: boolean;
}

export default function WeightTrendChart({
    data,
    height = 120,
    showLabels = true,
}: WeightTrendChartProps) {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-20 text-xs text-gray-400 italic">
                Need at least 2 data points for trend
            </div>
        );
    }

    const padding = { top: 10, right: 10, bottom: showLabels ? 24 : 10, left: 40 };
    const width = 300;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const weights = data.map(d => d.weight);
    const minW = Math.min(...weights) - 5;
    const maxW = Math.max(...weights) + 5;
    const rangeW = maxW - minW || 1;

    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartW,
        y: padding.top + chartH - ((d.weight - minW) / rangeW) * chartH,
        ...d,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    // Determine trend
    const firstWeight = data[0].weight;
    const lastWeight = data[data.length - 1].weight;
    const change = lastWeight - firstWeight;
    const changePercent = ((change / firstWeight) * 100).toFixed(1);
    const isGaining = change > 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Weight Trend</span>
                <span className={`text-xs font-semibold ${isGaining ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isGaining ? '▲' : '▼'} {Math.abs(change).toFixed(1)} lbs ({changePercent}%)
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const y = padding.top + (1 - t) * chartH;
                    const val = (minW + t * rangeW).toFixed(0);
                    return (
                        <g key={t}>
                            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y}
                                stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="3,3" />
                            <text x={padding.left - 4} y={y + 3} textAnchor="end"
                                className="fill-gray-400" fontSize={8}>
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* Gradient fill under line */}
                <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isGaining ? '#f59e0b' : '#10b981'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={isGaining ? '#f59e0b' : '#10b981'} stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <path
                    d={`${pathD} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`}
                    fill="url(#weightGrad)"
                />

                {/* Line */}
                <path d={pathD} fill="none"
                    stroke={isGaining ? '#f59e0b' : '#10b981'}
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points */}
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3.5}
                            fill="white" stroke={isGaining ? '#f59e0b' : '#10b981'} strokeWidth={2} />
                        {showLabels && (
                            <text x={p.x} y={height - 4} textAnchor="middle"
                                className="fill-gray-400" fontSize={7}>
                                {p.date.split('/').slice(0, 2).join('/')}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}
