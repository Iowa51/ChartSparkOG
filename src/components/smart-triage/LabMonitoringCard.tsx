'use client';

// LabMonitoringCard — Lab monitoring alerts with status badges

import React from 'react';

interface LabMonitoringCardProps {
    labs: Record<string, unknown>[];
}

interface LabItem {
    medication: string;
    required_lab: string;
    last_checked?: string;
    due_date?: string;
    status: 'current' | 'due' | 'overdue';
}

export default function LabMonitoringCard({ labs }: LabMonitoringCardProps) {
    const labItems = labs as unknown as LabItem[];

    const statusConfig: Record<string, { text: string; bg: string; label: string; icon: string }> = {
        current: { text: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Current', icon: '✓' },
        due: { text: 'text-amber-700', bg: 'bg-amber-100', label: 'Due', icon: '⏰' },
        overdue: { text: 'text-red-700', bg: 'bg-red-100', label: 'Overdue', icon: '⚠️' },
    };

    if (!labItems || labItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <span className="text-2xl mb-2">🧪</span>
                <p className="text-sm">No lab monitoring data available</p>
                <p className="text-xs mt-1">Run a medication triage to generate lab recommendations</p>
            </div>
        );
    }

    const overdue = labItems.filter(l => l.status === 'overdue');
    const due = labItems.filter(l => l.status === 'due');
    const current = labItems.filter(l => l.status === 'current');

    return (
        <div className="space-y-4">
            {/* Summary Bar */}
            <div className="flex gap-3">
                {overdue.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 border border-red-200">
                        <span className="text-xs">⚠️</span>
                        <span className="text-xs font-bold text-red-700">{overdue.length} Overdue</span>
                    </div>
                )}
                {due.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200">
                        <span className="text-xs">⏰</span>
                        <span className="text-xs font-bold text-amber-700">{due.length} Due</span>
                    </div>
                )}
                {current.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200">
                        <span className="text-xs">✓</span>
                        <span className="text-xs font-bold text-emerald-700">{current.length} Current</span>
                    </div>
                )}
            </div>

            {/* Lab Items */}
            <div className="space-y-2">
                {labItems.map((lab, i) => {
                    const config = statusConfig[lab.status] || statusConfig.current;
                    return (
                        <div key={i} className={`p-3 rounded-xl border ${lab.status === 'overdue' ? 'border-red-200 bg-red-50/30' :
                                lab.status === 'due' ? 'border-amber-200 bg-amber-50/20' :
                                    'border-gray-100 bg-white'
                            }`}>
                            <div className="flex items-start justify-between mb-1">
                                <div>
                                    <p className="text-xs font-semibold text-gray-800">{lab.required_lab}</p>
                                    <p className="text-[10px] text-gray-500">for {lab.medication}</p>
                                </div>
                                <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.bg} ${config.text}`}>
                                    <span>{config.icon}</span> {config.label}
                                </span>
                            </div>
                            <div className="flex gap-4 mt-2">
                                {lab.last_checked && (
                                    <div>
                                        <span className="text-[10px] text-gray-400 block">Last Checked</span>
                                        <span className="text-xs text-gray-600">{lab.last_checked}</span>
                                    </div>
                                )}
                                {lab.due_date && (
                                    <div>
                                        <span className="text-[10px] text-gray-400 block">Due Date</span>
                                        <span className={`text-xs font-medium ${lab.status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                                            {lab.due_date}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
