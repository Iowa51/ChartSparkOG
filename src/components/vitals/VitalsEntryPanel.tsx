'use client';

// VitalsEntryPanel — Full vitals form with standard + behavioral health fields
// Includes BMI auto-calc, abnormal flagging, unit toggles, pain scale slider

import React, { useState, useEffect, useCallback } from 'react';
import {
    VitalFormData,
    calculateBMI,
    detectAbnormalVitals,
    getBMICategory,
    ABNORMAL_THRESHOLDS,
} from '@/lib/types/smart-triage';

interface VitalsEntryPanelProps {
    patientId: string;
    encounterId?: string;
    previousVitals?: Partial<VitalFormData> & { recorded_at?: string };
    onSave?: (vitals: VitalFormData) => void;
    compact?: boolean;
}

const INITIAL_VITALS: VitalFormData = {
    bp_systolic: undefined,
    bp_diastolic: undefined,
    heart_rate: undefined,
    temperature: undefined,
    temperature_unit: 'F',
    respiratory_rate: undefined,
    spo2: undefined,
    weight: undefined,
    weight_unit: 'lbs',
    height: undefined,
    height_unit: 'in',
    pain_scale: undefined,
    waist_circumference: undefined,
    waist_unit: 'in',
};

export default function VitalsEntryPanel({
    patientId,
    encounterId,
    previousVitals,
    onSave,
    compact = false,
}: VitalsEntryPanelProps) {
    const [vitals, setVitals] = useState<VitalFormData>(INITIAL_VITALS);
    const [bmi, setBmi] = useState<number | null>(null);
    const [abnormalFlags, setAbnormalFlags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Auto-calculate BMI when weight/height change
    useEffect(() => {
        if (vitals.weight && vitals.height) {
            const weightLbs = vitals.weight_unit === 'kg' ? vitals.weight * 2.20462 : vitals.weight;
            const heightIn = vitals.height_unit === 'cm' ? vitals.height / 2.54 : vitals.height;
            setBmi(calculateBMI(weightLbs, heightIn));
        } else {
            setBmi(null);
        }
    }, [vitals.weight, vitals.weight_unit, vitals.height, vitals.height_unit]);

    // Detect abnormal values
    useEffect(() => {
        setAbnormalFlags(detectAbnormalVitals(vitals));
    }, [vitals.bp_systolic, vitals.bp_diastolic, vitals.heart_rate, vitals.temperature, vitals.temperature_unit, vitals.spo2]);

    const updateField = useCallback((field: keyof VitalFormData, value: unknown) => {
        setVitals(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const response = await fetch('/api/vitals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    encounter_id: encounterId,
                    ...vitals,
                }),
            });

            if (!response.ok) throw new Error('Failed to save vitals');

            setSaved(true);
            onSave?.(vitals);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const isAbnormal = (field: string) => abnormalFlags.includes(field);

    const inputClass = (abnormalField?: string) =>
        `w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none ${abnormalField && isAbnormal(abnormalField)
            ? 'border-red-400 bg-red-50 text-red-900'
            : 'border-gray-200 bg-white/80 text-gray-900 hover:border-gray-300'
        }`;

    const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

    return (
        <div className={`${compact ? '' : 'p-5'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">🩺</span> Vitals
                    {abnormalFlags.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full animate-pulse">
                            {abnormalFlags.length} abnormal
                        </span>
                    )}
                </h3>
                {previousVitals?.recorded_at && (
                    <span className="text-xs text-gray-400">
                        Last: {new Date(previousVitals.recorded_at).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Abnormal Alert Banner */}
            {abnormalFlags.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-start gap-2">
                        <span className="text-red-500 text-sm">⚠️</span>
                        <div>
                            <p className="text-xs font-semibold text-red-800">Abnormal Values Detected</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                {abnormalFlags.map(f => {
                                    if (f === 'bp_high') return `BP ≥ ${ABNORMAL_THRESHOLDS.bp_systolic_high}/${ABNORMAL_THRESHOLDS.bp_diastolic_high}`;
                                    if (f === 'hr_high') return `HR > ${ABNORMAL_THRESHOLDS.hr_high}`;
                                    if (f === 'hr_low') return `HR < ${ABNORMAL_THRESHOLDS.hr_low}`;
                                    if (f === 'temp_high') return `Temp > ${ABNORMAL_THRESHOLDS.temp_high_f}°F`;
                                    if (f === 'spo2_low') return `SpO2 < ${ABNORMAL_THRESHOLDS.spo2_low}%`;
                                    return f;
                                }).join(' • ')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Blood Pressure */}
                <div>
                    <label className={labelClass}>Blood Pressure (mmHg)</label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                placeholder="Systolic"
                                value={vitals.bp_systolic ?? ''}
                                onChange={e => updateField('bp_systolic', e.target.value ? Number(e.target.value) : undefined)}
                                className={inputClass('bp_high')}
                            />
                            {previousVitals?.bp_systolic && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                    prev: {previousVitals.bp_systolic}
                                </span>
                            )}
                        </div>
                        <span className="text-gray-400 font-light">/</span>
                        <div className="relative flex-1">
                            <input
                                type="number"
                                placeholder="Diastolic"
                                value={vitals.bp_diastolic ?? ''}
                                onChange={e => updateField('bp_diastolic', e.target.value ? Number(e.target.value) : undefined)}
                                className={inputClass('bp_high')}
                            />
                            {previousVitals?.bp_diastolic && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                    prev: {previousVitals.bp_diastolic}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* HR + Temp Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Heart Rate (bpm)</label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="HR"
                                value={vitals.heart_rate ?? ''}
                                onChange={e => updateField('heart_rate', e.target.value ? Number(e.target.value) : undefined)}
                                className={inputClass(isAbnormal('hr_high') ? 'hr_high' : isAbnormal('hr_low') ? 'hr_low' : undefined)}
                            />
                            {previousVitals?.heart_rate && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                    prev: {previousVitals.heart_rate}
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Temperature</label>
                        <div className="flex gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Temp"
                                value={vitals.temperature ?? ''}
                                onChange={e => updateField('temperature', e.target.value ? Number(e.target.value) : undefined)}
                                className={`${inputClass('temp_high')} flex-1`}
                            />
                            <select
                                value={vitals.temperature_unit}
                                onChange={e => updateField('temperature_unit', e.target.value)}
                                className="px-1 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 cursor-pointer"
                            >
                                <option value="F">°F</option>
                                <option value="C">°C</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* RR + SpO2 Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Respiratory Rate</label>
                        <input
                            type="number"
                            placeholder="breaths/min"
                            value={vitals.respiratory_rate ?? ''}
                            onChange={e => updateField('respiratory_rate', e.target.value ? Number(e.target.value) : undefined)}
                            className={inputClass()}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>SpO2 (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="SpO2"
                            value={vitals.spo2 ?? ''}
                            onChange={e => updateField('spo2', e.target.value ? Number(e.target.value) : undefined)}
                            className={inputClass('spo2_low')}
                        />
                    </div>
                </div>

                {/* Weight + Height Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Weight</label>
                        <div className="flex gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Weight"
                                value={vitals.weight ?? ''}
                                onChange={e => updateField('weight', e.target.value ? Number(e.target.value) : undefined)}
                                className={`${inputClass()} flex-1`}
                            />
                            <select
                                value={vitals.weight_unit}
                                onChange={e => updateField('weight_unit', e.target.value)}
                                className="px-1 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 cursor-pointer"
                            >
                                <option value="lbs">lbs</option>
                                <option value="kg">kg</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Height</label>
                        <div className="flex gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Height"
                                value={vitals.height ?? ''}
                                onChange={e => updateField('height', e.target.value ? Number(e.target.value) : undefined)}
                                className={`${inputClass()} flex-1`}
                            />
                            <select
                                value={vitals.height_unit}
                                onChange={e => updateField('height_unit', e.target.value)}
                                className="px-1 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 cursor-pointer"
                            >
                                <option value="in">in</option>
                                <option value="cm">cm</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* BMI Display */}
                {bmi && bmi > 0 && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">BMI (auto-calculated)</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-800">{bmi}</span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBMICategory(bmi).bg} ${getBMICategory(bmi).color}`}>
                                    {getBMICategory(bmi).label}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pain Scale */}
                <div>
                    <label className={labelClass}>
                        Pain Scale: <span className="font-bold text-gray-700">{vitals.pain_scale ?? '—'}</span>/10
                    </label>
                    <div className="relative">
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={vitals.pain_scale ?? 0}
                            onChange={e => updateField('pain_scale', Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, 
                  #10b981 0%, #10b981 10%, 
                  #f59e0b 30%, #f59e0b 50%, 
                  #ef4444 70%, #ef4444 100%)`,
                            }}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-emerald-600">No Pain</span>
                            <span className="text-[10px] text-amber-600">Moderate</span>
                            <span className="text-[10px] text-red-600">Worst</span>
                        </div>
                    </div>
                </div>

                {/* Waist Circumference */}
                <div>
                    <label className={labelClass}>Waist Circumference</label>
                    <div className="flex gap-1">
                        <input
                            type="number"
                            step="0.1"
                            placeholder="Waist"
                            value={vitals.waist_circumference ?? ''}
                            onChange={e => updateField('waist_circumference', e.target.value ? Number(e.target.value) : undefined)}
                            className={`${inputClass()} flex-1`}
                        />
                        <select
                            value={vitals.waist_unit}
                            onChange={e => updateField('waist_unit', e.target.value)}
                            className="px-1 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 cursor-pointer"
                        >
                            <option value="in">in</option>
                            <option value="cm">cm</option>
                        </select>
                    </div>
                </div>

                {/* Error / Success */}
                {error && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        {error}
                    </div>
                )}
                {saved && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1">
                        <span>✓</span> Vitals saved successfully
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-r from-blue-500 to-indigo-600 
            hover:from-blue-600 hover:to-indigo-700
            shadow-sm hover:shadow-md
            transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed
            active:scale-[0.98]"
                >
                    {saving ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </span>
                    ) : saved ? (
                        '✓ Saved'
                    ) : (
                        'Save Vitals'
                    )}
                </button>
            </div>
        </div>
    );
}
