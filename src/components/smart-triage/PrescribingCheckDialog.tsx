'use client';

// PrescribingCheckDialog — Modal popup during e-prescribe for interaction check

import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSafetyLevelConfig, type SafetyLevel } from '@/lib/types/smart-triage';

interface PrescribingCheckDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: (rationale?: string) => void;
    patientId: string;
    medication: string;
    dose: string;
    frequency?: string;
}

interface CheckResult {
    new_medication: string;
    dose: string;
    overall_risk: SafetyLevel;
    interactions: { med_a: string; med_b: string; severity: string; mechanism: string; recommended_action: string; alternative_suggestions: string[] }[];
    dosing_guidance: string;
    alternatives: string[];
    requires_acknowledgment: boolean;
    summary: string;
}

export default function PrescribingCheckDialog({
    isOpen,
    onClose,
    onProceed,
    patientId,
    medication,
    dose,
    frequency,
}: PrescribingCheckDialogProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CheckResult | null>(null);
    const [rationale, setRationale] = useState('');
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if (isOpen && !result) {
            runCheck();
        }
    }, [isOpen]);

    const runCheck = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai/smart-triage/prescribing-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    new_medication: medication,
                    dose,
                    frequency,
                }),
            });
            const data = await res.json();
            setResult(data.result);
        } catch {
            setResult({
                new_medication: medication,
                dose,
                overall_risk: 'yellow',
                interactions: [],
                dosing_guidance: 'Unable to check interactions. Proceed with clinical judgment.',
                alternatives: [],
                requires_acknowledgment: false,
                summary: 'Interaction check unavailable.',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const riskConfig = result ? getSafetyLevelConfig(result.overall_risk) : null;
    const isBlocked = result?.requires_acknowledgment && !acknowledged;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4">
                {/* Header */}
                <div className={`px-6 py-4 ${result?.overall_risk === 'green' ? 'bg-emerald-50' :
                        result?.overall_risk === 'yellow' ? 'bg-amber-50' :
                            result?.overall_risk === 'red' ? 'bg-red-50' :
                                result?.overall_risk === 'black' ? 'bg-gray-900' :
                                    'bg-blue-50'
                    }`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`text-base font-semibold flex items-center gap-2 ${result?.overall_risk === 'black' ? 'text-white' : 'text-gray-900'}`}>
                            <Search className="h-4 w-4" aria-hidden="true" /> Prescribing Safety Check
                        </h3>
                        <button onClick={onClose} className={`p-1 rounded-full hover:bg-black/10 ${result?.overall_risk === 'black' ? 'text-gray-300' : 'text-gray-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className={`text-xs mt-1 ${result?.overall_risk === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {medication} {dose} {frequency || ''}
                    </p>
                    {riskConfig && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${riskConfig.bg} ${riskConfig.border} border`}>
                            <span>{riskConfig.emoji}</span>
                            <span className={`text-xs font-bold ${riskConfig.color}`}>{riskConfig.label}</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
                    {loading && (
                        <div className="flex flex-col items-center py-8 gap-2">
                            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Checking interactions...</p>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <p className="text-sm text-gray-700">{result.summary}</p>

                            {/* Interactions */}
                            {result.interactions.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Interactions Found</h4>
                                    {result.interactions.map((int, i) => (
                                        <div key={i} className="p-3 mb-2 rounded-xl border border-gray-200 bg-gray-50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${int.severity === 'critical' ? 'bg-gray-900 text-white' :
                                                        int.severity === 'high' ? 'bg-red-100 text-red-800' :
                                                            int.severity === 'moderate' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-emerald-100 text-emerald-800'
                                                    }`}>{int.severity}</span>
                                                <span className="text-xs font-medium text-gray-700">{int.med_a} ↔ {int.med_b}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-1">{int.mechanism}</p>
                                            <p className="text-xs text-blue-700 font-medium">{int.recommended_action}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Dosing Guidance */}
                            {result.dosing_guidance && (
                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                    <span className="text-[10px] font-semibold text-blue-500 uppercase">Dosing Guidance</span>
                                    <p className="text-xs text-gray-700 mt-1">{result.dosing_guidance}</p>
                                </div>
                            )}

                            {/* Acknowledgment Section (for Red/Black) */}
                            {result.requires_acknowledgment && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                    <div className="flex items-start gap-2 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-red-700 shrink-0" aria-hidden="true" />
                                        <div>
                                            <p className="text-xs font-bold text-red-800">Clinical Override Required</p>
                                            <p className="text-[10px] text-red-600">Significant interaction detected. Provide clinical rationale to proceed.</p>
                                        </div>
                                    </div>
                                    <textarea
                                        value={rationale}
                                        onChange={e => setRationale(e.target.value)}
                                        placeholder="Clinical rationale for prescribing despite interaction..."
                                        className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs bg-white focus:ring-2 focus:ring-red-300 outline-none resize-none"
                                        rows={3}
                                    />
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={acknowledged}
                                            onChange={e => setAcknowledged(e.target.checked)}
                                            className="rounded border-red-300 text-red-600"
                                        />
                                        <span className="text-xs text-red-700">
                                            I acknowledge the interaction risk and accept clinical responsibility
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        Cancel Prescription
                    </button>
                    <button
                        onClick={() => onProceed(rationale || undefined)}
                        disabled={loading || isBlocked}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all
              ${result?.overall_risk === 'green' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                result?.overall_risk === 'yellow' ? 'bg-amber-500 hover:bg-amber-600' :
                                    'bg-red-500 hover:bg-red-600'}
              disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {loading ? 'Checking...' :
                            isBlocked ? 'Acknowledge to Proceed' :
                                result?.overall_risk === 'green' ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Proceed Safely
                                    </span>
                                ) :
                                    'Proceed with Caution'}
                    </button>
                </div>
            </div>
        </div>
    );
}
