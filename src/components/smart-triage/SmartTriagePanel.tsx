'use client';

// SmartTriagePanel — Main AI triage wrapper panel for patient chart
// Contains tabs for Medication Review, Chart Summary, and Lab Monitoring

import React, { useState, useEffect, useCallback } from 'react';
import MedicationSafetyCard from './MedicationSafetyCard';
import ChartSummaryCard from './ChartSummaryCard';
import LabMonitoringCard from './LabMonitoringCard';
import { getSafetyLevel, getSafetyLevelConfig } from '@/lib/types/smart-triage';

interface SmartTriagePanelProps {
    patientId: string;
    encounterId?: string;
}

type TriageTab = 'medications' | 'summary' | 'labs';

export default function SmartTriagePanel({ patientId, encounterId }: SmartTriagePanelProps) {
    const [activeTab, setActiveTab] = useState<TriageTab>('medications');
    const [medResult, setMedResult] = useState<Record<string, unknown> | null>(null);
    const [summaryResult, setSummaryResult] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [safetyScore, setSafetyScore] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [isDemo, setIsDemo] = useState(false);

    const runMedicationTriage = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/ai/smart-triage/medication-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patientId }),
            });
            const data = await res.json();
            setMedResult(data.result);
            setSafetyScore(data.safety_score ?? data.result?.overall_safety_score ?? null);
            setIsDemo(data.isDemo ?? false);
        } catch {
            setError('Failed to run medication triage');
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    const runChartSummary = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/ai/smart-triage/chart-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patientId }),
            });
            const data = await res.json();
            setSummaryResult(data.result);
            setIsDemo(data.isDemo ?? false);
        } catch {
            setError('Failed to generate chart summary');
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        if (activeTab === 'medications' && !medResult) {
            runMedicationTriage();
        } else if (activeTab === 'summary' && !summaryResult) {
            runChartSummary();
        }
    }, [activeTab, medResult, summaryResult, runMedicationTriage, runChartSummary]);

    const safetyLevel = safetyScore !== null ? getSafetyLevel(safetyScore) : null;
    const safetyConfig = safetyLevel ? getSafetyLevelConfig(safetyLevel) : null;

    const tabs: { key: TriageTab; label: string; icon: string }[] = [
        { key: 'medications', label: 'Medications', icon: '💊' },
        { key: 'summary', label: 'Chart Summary', icon: '📋' },
        { key: 'labs', label: 'Lab Monitoring', icon: '🧪' },
    ];

    return (
        <div className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
            {/* Header with Safety Score */}
            <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-gray-50 via-white to-blue-50/30">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        <h3 className="text-base font-semibold text-gray-900">Smart Triage</h3>
                        {isDemo && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-600 rounded-full">DEMO</span>
                        )}
                    </div>
                    {safetyConfig && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${safetyConfig.bg} ${safetyConfig.border} border`}>
                            <span className="text-sm">{safetyConfig.emoji}</span>
                            <span className={`text-xs font-bold ${safetyConfig.color}`}>
                                {safetyScore}
                            </span>
                            <span className={`text-xs font-medium ${safetyConfig.color}`}>
                                {safetyConfig.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 bg-gray-100/80 rounded-xl p-0.5">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === tab.key
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 border-3 border-blue-200 rounded-full animate-spin border-t-blue-500" />
                            <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
                        </div>
                        <p className="text-sm text-gray-500">Analyzing patient data...</p>
                        <p className="text-xs text-gray-400">This may take a few seconds</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-sm text-red-700">{error}</p>
                        <button
                            onClick={() => activeTab === 'medications' ? runMedicationTriage() : runChartSummary()}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {activeTab === 'medications' && medResult && (
                            <MedicationSafetyCard data={medResult} />
                        )}
                        {activeTab === 'summary' && summaryResult && (
                            <ChartSummaryCard data={summaryResult} />
                        )}
                        {activeTab === 'labs' && medResult && (
                            <LabMonitoringCard
                                labs={(medResult as Record<string, unknown>).lab_monitoring as Record<string, unknown>[] || []}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
