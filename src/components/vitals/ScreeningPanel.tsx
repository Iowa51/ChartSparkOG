'use client';

// ScreeningPanel — Interactive behavioral health screening instruments
// Supports PHQ-9, GAD-7, C-SSRS, AUDIT-C, DAST-10

import React, { useState, useMemo, useCallback } from 'react';
import { type ScreeningInstrument, type ScreeningSeverity } from '@/lib/types/smart-triage';

interface ScreeningPanelProps {
    patientId: string;
    encounterId?: string;
    onSave?: (instrument: string, score: number, severity: string) => void;
}

// =============================================
// INSTRUMENT DEFINITIONS
// =============================================

const RESPONSE_OPTIONS_4PT = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
];

const PHQ9_QUESTIONS = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    'Trouble concentrating on things, such as reading the newspaper or watching television',
    'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless',
    'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const GAD7_QUESTIONS = [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it\'s hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid, as if something awful might happen',
];

const AUDITC_QUESTIONS = [
    'How often do you have a drink containing alcohol?',
    'How many drinks containing alcohol do you have on a typical day when you are drinking?',
    'How often do you have 6 or more drinks on one occasion?',
];

const AUDITC_OPTIONS = [
    [
        { value: 0, label: 'Never' },
        { value: 1, label: 'Monthly or less' },
        { value: 2, label: '2-4 times a month' },
        { value: 3, label: '2-3 times a week' },
        { value: 4, label: '4+ times a week' },
    ],
    [
        { value: 0, label: '1-2' },
        { value: 1, label: '3-4' },
        { value: 2, label: '5-6' },
        { value: 3, label: '7-9' },
        { value: 4, label: '10+' },
    ],
    [
        { value: 0, label: 'Never' },
        { value: 1, label: 'Less than monthly' },
        { value: 2, label: 'Monthly' },
        { value: 3, label: 'Weekly' },
        { value: 4, label: 'Daily or almost daily' },
    ],
];

const INSTRUMENTS: Record<string, {
    code: ScreeningInstrument;
    name: string;
    icon: string;
    color: string;
    questions: string[];
    options: { value: number; label: string }[][] | { value: number; label: string }[];
    isUniform: boolean;
    maxScore: number;
    getSeverity: (score: number) => { label: string; color: string; bg: string };
}> = {
    PHQ9: {
        code: 'PHQ9',
        name: 'PHQ-9 Depression',
        icon: '🧠',
        color: 'from-indigo-500 to-purple-600',
        questions: PHQ9_QUESTIONS,
        options: RESPONSE_OPTIONS_4PT,
        isUniform: true,
        maxScore: 27,
        getSeverity: (score: number) => {
            if (score <= 4) return { label: 'Minimal', color: 'text-emerald-700', bg: 'bg-emerald-100' };
            if (score <= 9) return { label: 'Mild', color: 'text-yellow-700', bg: 'bg-yellow-100' };
            if (score <= 14) return { label: 'Moderate', color: 'text-orange-700', bg: 'bg-orange-100' };
            if (score <= 19) return { label: 'Moderately Severe', color: 'text-red-600', bg: 'bg-red-100' };
            return { label: 'Severe', color: 'text-red-800', bg: 'bg-red-200' };
        },
    },
    GAD7: {
        code: 'GAD7',
        name: 'GAD-7 Anxiety',
        icon: '💭',
        color: 'from-teal-500 to-cyan-600',
        questions: GAD7_QUESTIONS,
        options: RESPONSE_OPTIONS_4PT,
        isUniform: true,
        maxScore: 21,
        getSeverity: (score: number) => {
            if (score <= 4) return { label: 'Minimal', color: 'text-emerald-700', bg: 'bg-emerald-100' };
            if (score <= 9) return { label: 'Mild', color: 'text-yellow-700', bg: 'bg-yellow-100' };
            if (score <= 14) return { label: 'Moderate', color: 'text-orange-700', bg: 'bg-orange-100' };
            return { label: 'Severe', color: 'text-red-800', bg: 'bg-red-200' };
        },
    },
    AUDITC: {
        code: 'AUDITC',
        name: 'AUDIT-C Alcohol',
        icon: '🍷',
        color: 'from-amber-500 to-orange-600',
        questions: AUDITC_QUESTIONS,
        options: AUDITC_OPTIONS,
        isUniform: false,
        maxScore: 12,
        getSeverity: (score: number) => {
            if (score <= 2) return { label: 'Low Risk', color: 'text-emerald-700', bg: 'bg-emerald-100' };
            if (score <= 5) return { label: 'At-Risk', color: 'text-amber-700', bg: 'bg-amber-100' };
            return { label: 'High Risk', color: 'text-red-700', bg: 'bg-red-100' };
        },
    },
};

export default function ScreeningPanel({
    patientId,
    encounterId,
    onSave,
}: ScreeningPanelProps) {
    const [activeInstrument, setActiveInstrument] = useState<string | null>(null);
    const [responses, setResponses] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<string | null>(null);
    const [error, setError] = useState('');

    const instrument = activeInstrument ? INSTRUMENTS[activeInstrument] : null;

    const totalScore = useMemo(() => {
        if (!instrument) return 0;
        return instrument.questions.reduce((sum, _, i) => {
            return sum + (responses[`q${i}`] ?? 0);
        }, 0);
    }, [instrument, responses]);

    const severity = useMemo(() => {
        return instrument?.getSeverity(totalScore) ?? null;
    }, [instrument, totalScore]);

    const allAnswered = useMemo(() => {
        if (!instrument) return false;
        return instrument.questions.every((_, i) => responses[`q${i}`] !== undefined);
    }, [instrument, responses]);

    const handleResponse = useCallback((questionIndex: number, value: number) => {
        setResponses(prev => ({ ...prev, [`q${questionIndex}`]: value }));
        setSaved(null);
    }, []);

    const handleSave = async () => {
        if (!instrument) return;
        setSaving(true);
        setError('');

        const severityLabel = severity?.label.toLowerCase().replace(/ /g, '_') as ScreeningSeverity;
        const riskFlags: string[] = [];
        if (instrument.code === 'PHQ9' && (responses.q8 ?? 0) > 0) {
            riskFlags.push('suicidal_ideation');
        }

        try {
            const response = await fetch('/api/screenings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    encounter_id: encounterId,
                    instrument: instrument.code,
                    total_score: totalScore,
                    severity: severityLabel,
                    item_responses: responses,
                    risk_flags: riskFlags,
                }),
            });

            if (!response.ok) throw new Error('Failed to save screening');

            setSaved(instrument.code);
            onSave?.(instrument.code, totalScore, severityLabel);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setResponses({});
        setSaved(null);
        setError('');
    };

    // =============================================
    // INSTRUMENT SELECTION VIEW
    // =============================================
    if (!activeInstrument) {
        return (
            <div className="p-5">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <span className="text-lg">📋</span> Screening Instruments
                </h3>
                <div className="space-y-2">
                    {Object.entries(INSTRUMENTS).map(([key, inst]) => (
                        <button
                            key={key}
                            onClick={() => { setActiveInstrument(key); resetForm(); }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white
                hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 group text-left"
                        >
                            <span className="text-xl">{inst.icon}</span>
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
                                    {inst.name}
                                </span>
                                <span className="block text-xs text-gray-400">{inst.questions.length} items • Max {inst.maxScore}</span>
                            </div>
                            {saved === key && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">✓ Done</span>
                            )}
                            <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // =============================================
    // QUESTIONNAIRE VIEW
    // =============================================
    const getOptions = (questionIndex: number) => {
        if (instrument!.isUniform) {
            return instrument!.options as { value: number; label: string }[];
        }
        return (instrument!.options as { value: number; label: string }[][])[questionIndex] || [];
    };

    return (
        <div className="p-5">
            {/* Instrument Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => setActiveInstrument(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{instrument!.icon} {instrument!.name}</h3>
                    <p className="text-xs text-gray-400">{instrument!.questions.length} questions</p>
                </div>
            </div>

            {/* Score Bar */}
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">Score</span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-800">{totalScore}</span>
                        <span className="text-xs text-gray-400">/ {instrument!.maxScore}</span>
                        {severity && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${severity.bg} ${severity.color}`}>
                                {severity.label}
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${instrument!.color} transition-all duration-500 ease-out`}
                        style={{ width: `${(totalScore / instrument!.maxScore) * 100}%` }}
                    />
                </div>
            </div>

            {/* PHQ-9 Item 9 Suicidal Ideation Alert */}
            {instrument!.code === 'PHQ9' && (responses.q8 ?? 0) > 0 && (
                <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-300">
                    <p className="text-xs font-bold text-red-800">⚠️ Suicidal Ideation Endorsed</p>
                    <p className="text-xs text-red-600 mt-1">
                        Patient endorsed thoughts of self-harm (Q9). Perform immediate safety assessment (C-SSRS recommended).
                    </p>
                </div>
            )}

            {/* Questions */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {instrument!.questions.map((question, i) => (
                    <div key={i} className="p-3 rounded-lg border border-gray-100 bg-white/80">
                        <p className="text-xs text-gray-700 mb-2">
                            <span className="font-semibold text-gray-400 mr-1">{i + 1}.</span>
                            {question}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {getOptions(i).map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleResponse(i, opt.value)}
                                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all duration-150 ${responses[`q${i}`] === opt.value
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Error / Success */}
            {error && (
                <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving || !allAnswered}
                className="mt-4 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white
          bg-gradient-to-r from-blue-500 to-indigo-600 
          hover:from-blue-600 hover:to-indigo-700
          shadow-sm hover:shadow-md transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
                {saving ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                    </span>
                ) : !allAnswered ? (
                    `Answer all ${instrument!.questions.length} questions to save`
                ) : (
                    `Save ${instrument!.name} — Score: ${totalScore}`
                )}
            </button>
        </div>
    );
}
