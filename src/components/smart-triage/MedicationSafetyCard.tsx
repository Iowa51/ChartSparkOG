'use client';

// MedicationSafetyCard — Drug interactions, black box warnings, pregnancy safety

import React, { useState } from 'react';
import { Zap, Lightbulb } from 'lucide-react';

interface MedicationSafetyCardProps {
    data: Record<string, unknown>;
}

interface DDI {
    med_a: string;
    med_b: string;
    severity: string;
    mechanism: string;
    clinical_significance: string;
    recommended_action: string;
    alternative_suggestions: string[];
}

export default function MedicationSafetyCard({ data }: MedicationSafetyCardProps) {
    const [expandedDDI, setExpandedDDI] = useState<number | null>(null);

    const interactions = (data.drug_drug_interactions || []) as DDI[];
    const blackBox = (data.black_box_warnings || []) as { medication: string; warning_text: string; patient_relevance: string }[];
    const pregnancySafety = (data.pregnancy_safety || []) as { medication: string; fda_category: string; risk_description: string }[];
    const clinicalPearls = (data.clinical_pearls || []) as string[];
    const summary = (data.summary || '') as string;

    const severityColors: Record<string, { text: string; bg: string; border: string }> = {
        critical: { text: 'text-gray-100', bg: 'bg-gray-900', border: 'border-gray-900' },
        high: { text: 'text-red-800', bg: 'bg-red-100', border: 'border-red-300' },
        moderate: { text: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300' },
        low: { text: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300' },
    };

    return (
        <div className="space-y-4">
            {/* Summary */}
            {summary && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                    <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
                </div>
            )}

            {/* Drug-Drug Interactions */}
            {interactions.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Zap className="h-3 w-3" aria-hidden="true" /> Drug-Drug Interactions ({interactions.length})
                    </h4>
                    <div className="space-y-2">
                        {interactions.map((ddi, i) => {
                            const colors = severityColors[ddi.severity] || severityColors.moderate;
                            const isExpanded = expandedDDI === i;
                            return (
                                <div key={i} className={`rounded-xl border ${colors.border} overflow-hidden transition-all duration-200`}>
                                    <button
                                        onClick={() => setExpandedDDI(isExpanded ? null : i)}
                                        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50/50 transition-colors"
                                    >
                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${colors.bg} ${colors.text}`}>
                                            {ddi.severity}
                                        </span>
                                        <span className="flex-1 text-xs text-gray-800 font-medium">
                                            {ddi.med_a} ↔ {ddi.med_b}
                                        </span>
                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {isExpanded && (
                                        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                                            <div className="pt-2">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase">Mechanism</span>
                                                <p className="text-xs text-gray-600 mt-0.5">{ddi.mechanism}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase">Clinical Significance</span>
                                                <p className="text-xs text-gray-600 mt-0.5">{ddi.clinical_significance}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase">Recommended Action</span>
                                                <p className="text-xs text-blue-700 font-medium mt-0.5">{ddi.recommended_action}</p>
                                            </div>
                                            {ddi.alternative_suggestions.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Alternatives</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ddi.alternative_suggestions.map((alt, j) => (
                                                            <span key={j} className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                                                {alt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Black Box Warnings */}
            {blackBox.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>⬛</span> Black Box Warnings
                    </h4>
                    <div className="space-y-2">
                        {blackBox.map((bbw, i) => (
                            <div key={i} className="p-3 rounded-xl bg-gray-900 text-white">
                                <p className="text-xs font-semibold text-amber-300 mb-1">{bbw.medication}</p>
                                <p className="text-xs text-gray-300 leading-relaxed">{bbw.warning_text}</p>
                                <p className="text-xs text-gray-400 mt-1.5 italic">{bbw.patient_relevance}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pregnancy Safety */}
            {pregnancySafety.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="text-[10px] font-bold tracking-wider">[PREGNANCY]</span> Reproductive Safety
                    </h4>
                    <div className="space-y-2">
                        {pregnancySafety.map((ps, i) => (
                            <div key={i} className="p-3 rounded-xl border border-pink-200 bg-pink-50/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-800">{ps.medication}</span>
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-pink-200 text-pink-800 rounded">
                                        Cat {ps.fda_category}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">{ps.risk_description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Clinical Pearls */}
            {clinicalPearls.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" aria-hidden="true" /> Clinical Pearls
                    </h4>
                    <div className="space-y-1.5">
                        {clinicalPearls.map((pearl, i) => (
                            <div key={i} className="flex gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                                <span className="text-amber-400 text-xs mt-0.5">•</span>
                                <p className="text-xs text-gray-700 leading-relaxed">{pearl}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
