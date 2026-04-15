'use client';

// ChartSummaryCard — AI-generated clinical note summary

import React from 'react';

interface ChartSummaryCardProps {
    data: Record<string, unknown>;
}

export default function ChartSummaryCard({ data }: ChartSummaryCardProps) {
    const summary = (data.clinical_summary || '') as string;
    const problems = (data.problem_list || []) as { problem: string; icd10: string; status: string; last_addressed_date?: string }[];
    const meds = (data.medication_effectiveness || []) as { medication: string; dose: string; purpose: string; assessment: string; evidence_basis: string }[];
    const alerts = (data.visit_alerts || []) as { message: string; urgency: string; rationale: string }[];
    const agenda = (data.suggested_agenda || []) as string[];

    const statusColors: Record<string, { text: string; bg: string }> = {
        improving: { text: 'text-emerald-700', bg: 'bg-emerald-100' },
        stable: { text: 'text-blue-700', bg: 'bg-blue-100' },
        worsening: { text: 'text-red-700', bg: 'bg-red-100' },
        new: { text: 'text-purple-700', bg: 'bg-purple-100' },
    };

    const assessmentColors: Record<string, { text: string; bg: string; label: string }> = {
        effective: { text: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Effective' },
        partially_effective: { text: 'text-amber-700', bg: 'bg-amber-100', label: 'Partial' },
        ineffective: { text: 'text-red-700', bg: 'bg-red-100', label: 'Ineffective' },
        too_early: { text: 'text-gray-600', bg: 'bg-gray-100', label: 'Too Early' },
    };

    const urgencyStyles: Record<string, string> = {
        high: 'border-l-red-500 bg-red-50/50',
        medium: 'border-l-amber-500 bg-amber-50/30',
        low: 'border-l-blue-500 bg-blue-50/30',
    };

    return (
        <div className="space-y-4">
            {/* Clinical Summary */}
            {summary && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100">
                    <h4 className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-2">Clinical Summary</h4>
                    <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
                </div>
            )}

            {/* Visit Alerts — "Things to Address" */}
            {alerts.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>🎯</span> Things to Address This Visit
                    </h4>
                    <div className="space-y-1.5">
                        {alerts.map((alert, i) => (
                            <div key={i} className={`p-3 rounded-lg border-l-3 ${urgencyStyles[alert.urgency] || urgencyStyles.medium}`}>
                                <p className="text-xs text-gray-800 font-medium">{alert.message}</p>
                                <p className="text-[10px] text-gray-500 mt-1">{alert.rationale}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Problems */}
            {problems.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>📌</span> Active Problems
                    </h4>
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase px-3 py-1.5">Problem</th>
                                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase px-3 py-1.5">ICD-10</th>
                                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase px-3 py-1.5">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {problems.map((p, i) => {
                                    const statusStyle = statusColors[p.status] || statusColors.stable;
                                    return (
                                        <tr key={i} className="border-t border-gray-50">
                                            <td className="text-xs text-gray-700 px-3 py-2">{p.problem}</td>
                                            <td className="text-[10px] font-mono text-gray-500 px-3 py-2">{p.icd10}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${statusStyle.bg} ${statusStyle.text} capitalize`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Medication Effectiveness */}
            {meds.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>💊</span> Medication Effectiveness
                    </h4>
                    <div className="space-y-2">
                        {meds.map((m, i) => {
                            const assessment = assessmentColors[m.assessment] || assessmentColors.too_early;
                            return (
                                <div key={i} className="p-3 rounded-xl border border-gray-100 bg-white">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-gray-800">{m.medication}</span>
                                        <span className="text-[10px] text-gray-400">{m.dose}</span>
                                        <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded ${assessment.bg} ${assessment.text}`}>
                                            {assessment.label}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500">{m.purpose} — {m.evidence_basis}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Suggested Agenda */}
            {agenda.length > 0 && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border border-emerald-100">
                    <h4 className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">📅 Suggested Visit Agenda</h4>
                    <ol className="space-y-1">
                        {agenda.map((item, i) => (
                            <li key={i} className="flex gap-2 text-xs text-gray-700">
                                <span className="text-emerald-500 font-bold">{i + 1}.</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
