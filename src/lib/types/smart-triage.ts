// src/lib/types/smart-triage.ts
// TypeScript interfaces for vitals, screenings, and smart triage system

// =============================================
// VITALS
// =============================================

export interface Vital {
    id: string;
    organization_id: string;
    patient_id: string;
    encounter_id?: string;
    recorded_by: string;

    // Standard Vitals
    bp_systolic?: number;
    bp_diastolic?: number;
    heart_rate?: number;
    temperature?: number;
    temperature_unit: 'F' | 'C';
    respiratory_rate?: number;
    spo2?: number;
    weight?: number;
    weight_unit: 'lbs' | 'kg';
    height?: number;
    height_unit: 'in' | 'cm';
    bmi?: number;
    pain_scale?: number;

    // Behavioral Health
    waist_circumference?: number;
    waist_unit: 'in' | 'cm';

    // Flags
    has_abnormal_values: boolean;
    abnormal_flags: string[];

    recorded_at: string;
    created_at: string;
    updated_at: string;
}

export interface VitalFormData {
    bp_systolic?: number;
    bp_diastolic?: number;
    heart_rate?: number;
    temperature?: number;
    temperature_unit: 'F' | 'C';
    respiratory_rate?: number;
    spo2?: number;
    weight?: number;
    weight_unit: 'lbs' | 'kg';
    height?: number;
    height_unit: 'in' | 'cm';
    pain_scale?: number;
    waist_circumference?: number;
    waist_unit: 'in' | 'cm';
}

// =============================================
// SCREENING INSTRUMENTS
// =============================================

export type ScreeningInstrument = 'PHQ9' | 'GAD7' | 'CSSRS' | 'AUDITC' | 'DAST10' | 'MDQ' | 'PCL5';

export type ScreeningSeverity =
    | 'minimal'
    | 'mild'
    | 'moderate'
    | 'moderately_severe'
    | 'severe'
    | 'positive'
    | 'negative';

export interface ScreeningScore {
    id: string;
    organization_id: string;
    patient_id: string;
    encounter_id?: string;
    administered_by: string;
    instrument: ScreeningInstrument;
    total_score: number;
    severity?: ScreeningSeverity;
    item_responses: Record<string, number>;
    clinical_notes?: string;
    risk_flags: string[];
    administered_at: string;
    created_at: string;
}

export interface ScreeningQuestion {
    id: string;
    text: string;
    options: { value: number; label: string }[];
}

export interface ScreeningInstrumentConfig {
    code: ScreeningInstrument;
    name: string;
    abbreviation: string;
    questions: ScreeningQuestion[];
    maxScore: number;
    getSeverity: (score: number) => ScreeningSeverity;
    severityRanges: { label: string; min: number; max: number; color: string }[];
}

// =============================================
// SMART TRIAGE
// =============================================

export type TriageType = 'medication_review' | 'chart_summary' | 'prescribing_check';

export type SafetyLevel = 'green' | 'yellow' | 'red' | 'black';

export interface SmartTriageResult {
    id: string;
    organization_id: string;
    patient_id: string;
    encounter_id?: string;
    triage_type: TriageType;
    safety_score?: number;
    result_data: TriageAnalysis | ChartSummaryAnalysis | PrescribingCheckResult;
    alerts_count: number;
    critical_alerts_count: number;
    reviewed_by?: string;
    reviewed_at?: string;
    acknowledged: boolean;
    ai_model?: string;
    ai_prompt_version?: string;
    token_count?: number;
    expires_at: string;
    created_at: string;
}

// Medication Review Analysis
export interface TriageAnalysis {
    overall_safety_score: number;
    safety_level: SafetyLevel;
    drug_drug_interactions: DrugDrugInteraction[];
    black_box_warnings: BlackBoxWarning[];
    pregnancy_safety: PregnancySafetyItem[];
    lab_monitoring: LabMonitoringItem[];
    metabolic_risk: MetabolicRisk;
    clinical_pearls: string[];
    summary: string;
}

export interface DrugDrugInteraction {
    med_a: string;
    med_b: string;
    severity: 'critical' | 'high' | 'moderate' | 'low';
    mechanism: string;
    clinical_significance: string;
    recommended_action: string;
    alternative_suggestions: string[];
    evidence_level?: string;
}

export interface BlackBoxWarning {
    medication: string;
    warning_text: string;
    patient_relevance: string;
}

export interface PregnancySafetyItem {
    medication: string;
    fda_category: string;
    risk_description: string;
    trimester_concerns?: string;
}

export interface LabMonitoringItem {
    medication: string;
    required_lab: string;
    last_checked?: string;
    due_date?: string;
    status: 'current' | 'due' | 'overdue';
}

export interface MetabolicRisk {
    risk_level: 'low' | 'moderate' | 'high';
    contributing_factors: string[];
    recommendations: string[];
}

// Chart Summary Analysis
export interface ChartSummaryAnalysis {
    clinical_summary: string;
    problem_list: ProblemListItem[];
    medication_effectiveness: MedicationEffectiveness[];
    screening_trends: ScreeningTrend[];
    visit_alerts: VisitAlert[];
    suggested_agenda: string[];
}

export interface ProblemListItem {
    problem: string;
    icd10: string;
    status: 'improving' | 'stable' | 'worsening' | 'new';
    last_addressed_date?: string;
}

export interface MedicationEffectiveness {
    medication: string;
    dose: string;
    purpose: string;
    assessment: 'effective' | 'partially_effective' | 'ineffective' | 'too_early';
    evidence_basis: string;
}

export interface ScreeningTrend {
    instrument: string;
    scores: { date: string; score: number }[];
    trend: 'improving' | 'stable' | 'worsening';
}

export interface VisitAlert {
    message: string;
    urgency: 'high' | 'medium' | 'low';
    rationale: string;
    icon?: string;
}

// Prescribing Check
export interface PrescribingCheckResult {
    new_medication: string;
    dose: string;
    overall_risk: SafetyLevel;
    interactions: DrugDrugInteraction[];
    dosing_guidance: string;
    alternatives: string[];
    requires_acknowledgment: boolean;
    summary: string;
}

// =============================================
// MEDICATION INTERACTION LOG
// =============================================

export type InteractionAction = 'acknowledged' | 'modified' | 'overridden' | 'alternative_chosen';

export interface MedicationInteractionLog {
    id: string;
    organization_id: string;
    patient_id: string;
    medication_a: string;
    medication_b: string;
    severity: 'critical' | 'high' | 'moderate' | 'low';
    interaction_type?: string;
    action_taken: InteractionAction;
    provider_id: string;
    provider_rationale?: string;
    created_at: string;
}

// =============================================
// TRIAGE BADGE
// =============================================

export interface TriageBadgeData {
    patient_id: string;
    level: SafetyLevel | 'none';
    alerts_count: number;
    critical_count: number;
    last_updated?: string;
}

// =============================================
// UTILITY — Abnormal Value Detection
// =============================================

export const ABNORMAL_THRESHOLDS = {
    bp_systolic_high: 140,
    bp_diastolic_high: 90,
    hr_high: 100,
    hr_low: 50,
    temp_high_f: 100.4,
    temp_high_c: 38.0,
    spo2_low: 95,
} as const;

export const BMI_CATEGORIES = {
    underweight: { max: 18.5, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Underweight' },
    normal: { max: 25, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Normal' },
    overweight: { max: 30, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Overweight' },
    obese: { max: Infinity, color: 'text-red-600', bg: 'bg-red-100', label: 'Obese' },
} as const;

export function getBMICategory(bmi: number) {
    if (bmi < BMI_CATEGORIES.underweight.max) return BMI_CATEGORIES.underweight;
    if (bmi < BMI_CATEGORIES.normal.max) return BMI_CATEGORIES.normal;
    if (bmi < BMI_CATEGORIES.overweight.max) return BMI_CATEGORIES.overweight;
    return BMI_CATEGORIES.obese;
}

export function calculateBMI(weightLbs: number, heightInches: number): number {
    if (!weightLbs || !heightInches || heightInches === 0) return 0;
    return Math.round((703 * weightLbs) / (heightInches * heightInches) * 10) / 10;
}

export function detectAbnormalVitals(vitals: Partial<VitalFormData>): string[] {
    const flags: string[] = [];
    if (vitals.bp_systolic && vitals.bp_systolic >= ABNORMAL_THRESHOLDS.bp_systolic_high) flags.push('bp_high');
    if (vitals.bp_diastolic && vitals.bp_diastolic >= ABNORMAL_THRESHOLDS.bp_diastolic_high) flags.push('bp_high');
    if (vitals.heart_rate && vitals.heart_rate > ABNORMAL_THRESHOLDS.hr_high) flags.push('hr_high');
    if (vitals.heart_rate && vitals.heart_rate < ABNORMAL_THRESHOLDS.hr_low) flags.push('hr_low');
    if (vitals.temperature) {
        const tempF = vitals.temperature_unit === 'C'
            ? (vitals.temperature * 9) / 5 + 32
            : vitals.temperature;
        if (tempF > ABNORMAL_THRESHOLDS.temp_high_f) flags.push('temp_high');
    }
    if (vitals.spo2 && vitals.spo2 < ABNORMAL_THRESHOLDS.spo2_low) flags.push('spo2_low');
    return flags;
}

export function getSafetyLevel(score: number): SafetyLevel {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 40) return 'red';
    return 'black';
}

export function getSafetyLevelConfig(level: SafetyLevel) {
    const configs = {
        green: { label: 'All Clear', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-300', emoji: '🟢', range: '90-100' },
        yellow: { label: 'Caution', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', emoji: '🟡', range: '70-89' },
        red: { label: 'Alert', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', emoji: '🔴', range: '40-69' },
        black: { label: 'Critical', color: 'text-gray-900', bg: 'bg-gray-800 text-white', border: 'border-gray-900', emoji: '⚫', range: '0-39' },
    };
    return configs[level];
}
