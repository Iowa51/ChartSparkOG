// src/lib/ai/smart-triage-prompts.ts
// Versioned prompt templates for Smart Triage system

export const PROMPT_VERSION = '1.0';

export function buildMedicationTriagePrompt(params: {
    age: number;
    sex: string;
    weight?: number;
    diagnoses: string[];
    allergies: string[];
    pregnancyStatus?: string;
    renalFunction?: string;
    hepaticFunction?: string;
    medications: { name: string; dose: string; frequency: string }[];
    newMedication?: { name: string; dose: string; frequency: string };
    labResults?: { name: string; value: string; date: string }[];
}): string {
    const medsText = params.medications.length > 0
        ? params.medications.map(m => `- ${m.name} ${m.dose} ${m.frequency}`).join('\n')
        : 'No current medications';

    const newMedText = params.newMedication
        ? `${params.newMedication.name} ${params.newMedication.dose} ${params.newMedication.frequency}`
        : 'N/A';

    const labsText = params.labResults && params.labResults.length > 0
        ? params.labResults.map(l => `- ${l.name}: ${l.value} (${l.date})`).join('\n')
        : 'No recent labs available';

    return `You are a clinical pharmacology AI assistant for psychiatric medication management. Analyze the following patient's medication regimen for a psychiatric nurse practitioner.

PATIENT CONTEXT:
- Age: ${params.age}, Sex: ${params.sex}, Weight: ${params.weight || 'Unknown'}kg
- Diagnoses: ${params.diagnoses.join(', ') || 'None listed'}
- Allergies: ${params.allergies.join(', ') || 'NKDA'}
- Pregnancy status: ${params.pregnancyStatus || 'Unknown'}
- Renal function: ${params.renalFunction || 'Not available'}
- Hepatic function: ${params.hepaticFunction || 'Not available'}

CURRENT MEDICATIONS:
${medsText}

NEW PRESCRIPTION (if applicable):
${newMedText}

RECENT LAB VALUES:
${labsText}

Analyze and return a JSON response with:
1. overall_safety_score (0-100)
2. drug_drug_interactions (array of objects with: med_a, med_b, severity [critical/high/moderate/low], mechanism, clinical_significance, recommended_action, alternative_suggestions)
3. black_box_warnings (array of objects with: medication, warning_text, patient_relevance)
4. pregnancy_safety (array of objects with: medication, fda_category, risk_description, trimester_concerns)
5. lab_monitoring (array of objects with: medication, required_lab, last_checked, due_date, status [current/due/overdue])
6. metabolic_risk (object with: risk_level, contributing_factors, recommendations)
7. clinical_pearls (array of 2-3 brief clinical insights specific to this patient's regimen)
8. summary (a 2-3 sentence plain-language summary of the most important findings)

Be evidence-based. Cite clinical guidelines where possible (APA, CANMAT, Maudsley). Flag serotonin syndrome risk combinations explicitly. Consider CYP450 metabolism interactions (2D6, 3A4, 2C19). For elderly patients (>=65), apply Beers Criteria. For pediatric patients, note off-label use.

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting or code blocks.`;
}

export function buildChartSummaryPrompt(params: {
    demographics: string;
    diagnoses: string[];
    medications: { name: string; dose: string; frequency: string }[];
    allergies: string[];
    clinicalNotes: string[];
    screeningScores: { instrument: string; scores: { date: string; score: number }[] }[];
    labHistory: { name: string; value: string; date: string }[];
    weightTrend: { date: string; weight: number }[];
    bpTrend: { date: string; systolic: number; diastolic: number }[];
}): string {
    const medsText = params.medications.length > 0
        ? params.medications.map(m => `- ${m.name} ${m.dose} ${m.frequency}`).join('\n')
        : 'No current medications';

    const notesText = params.clinicalNotes.length > 0
        ? params.clinicalNotes.map((n, i) => `--- Note ${i + 1} ---\n${n}`).join('\n\n')
        : 'No clinical notes available';

    const screeningsText = params.screeningScores.length > 0
        ? params.screeningScores.map(s =>
            `${s.instrument}: ${s.scores.map(sc => `${sc.score} (${sc.date})`).join(', ')}`
        ).join('\n')
        : 'No screening scores available';

    const labsText = params.labHistory.length > 0
        ? params.labHistory.map(l => `- ${l.name}: ${l.value} (${l.date})`).join('\n')
        : 'No recent labs';

    const weightText = params.weightTrend.length > 0
        ? params.weightTrend.map(w => `${w.weight}lbs (${w.date})`).join(' → ')
        : 'No weight data';

    const bpText = params.bpTrend.length > 0
        ? params.bpTrend.map(b => `${b.systolic}/${b.diastolic} (${b.date})`).join(' → ')
        : 'No BP data';

    return `You are a clinical AI assistant for psychiatric chart review. Generate a concise clinical summary for a psychiatric nurse practitioner who is about to see this patient.

PATIENT: ${params.demographics}
DIAGNOSES: ${params.diagnoses.join(', ') || 'None listed'}
MEDICATIONS:
${medsText}
ALLERGIES: ${params.allergies.join(', ') || 'NKDA'}

LAST 5 CLINICAL NOTES (most recent first):
${notesText}

SCREENING SCORES HISTORY:
${screeningsText}

LAB HISTORY:
${labsText}

VITALS TREND:
Weight: ${weightText}
BP: ${bpText}

Generate a JSON response with:
1. clinical_summary (4-5 sentence narrative paragraph summarizing the patient's current clinical picture, treatment trajectory, and key concerns)
2. problem_list (array of objects: problem, icd10, status [improving/stable/worsening/new], last_addressed_date)
3. medication_effectiveness (array of objects: medication, dose, purpose, assessment [effective/partially_effective/ineffective/too_early], evidence_basis)
4. screening_trends (array of objects: instrument, scores_array_with_dates, trend [improving/stable/worsening])
5. visit_alerts (array of 3-5 prioritized items the clinician should address this visit, each with urgency [high/medium/low] and rationale)
6. suggested_agenda (a brief 2-3 item suggested visit agenda based on the analysis)

Use clinical language appropriate for a psychiatric NP. Be concise. Prioritize actionable insights over generic observations. If screening scores indicate worsening, flag prominently.

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting or code blocks.`;
}

// Demo fallback responses
export function getDemoMedicationTriageResponse() {
    return {
        overall_safety_score: 78,
        drug_drug_interactions: [
            {
                med_a: 'Sertraline 100mg',
                med_b: 'Tramadol 50mg',
                severity: 'high' as const,
                mechanism: 'Both increase serotonergic activity — serotonin syndrome risk (pharmacodynamic)',
                clinical_significance: 'Serotonin syndrome risk with concurrent use of SSRI and opioid with serotonergic properties',
                recommended_action: 'Consider discontinuing tramadol or switching to a non-serotonergic analgesic',
                alternative_suggestions: ['Acetaminophen', 'NSAIDs (if no contraindications)', 'Gabapentin for neuropathic pain'],
                evidence_level: 'Well-established',
            },
            {
                med_a: 'Lithium 600mg',
                med_b: 'Lisinopril 10mg',
                severity: 'moderate' as const,
                mechanism: 'ACE inhibitors reduce renal clearance of lithium (pharmacokinetic)',
                clinical_significance: 'Increased lithium levels — risk of toxicity',
                recommended_action: 'Monitor lithium levels more frequently (every 2-4 weeks)',
                alternative_suggestions: ['Consider ARB with closer monitoring', 'Amlodipine as alternative antihypertensive'],
                evidence_level: 'Well-established',
            },
        ],
        black_box_warnings: [
            {
                medication: 'Sertraline',
                warning_text: 'Increased risk of suicidal thinking and behavior in children, adolescents, and young adults (18-24)',
                patient_relevance: 'Patient should be monitored for clinical worsening and emergence of suicidal ideation',
            },
        ],
        pregnancy_safety: [
            {
                medication: 'Sertraline',
                fda_category: 'C',
                risk_description: 'Third trimester use may cause neonatal complications. Generally considered one of the safer SSRIs in pregnancy.',
                trimester_concerns: 'Third trimester: risk of persistent pulmonary hypertension of the newborn (PPHN)',
            },
            {
                medication: 'Lithium',
                fda_category: 'D',
                risk_description: 'Risk of Ebstein anomaly (cardiac malformation) — first trimester. Risk appears lower than historically reported (~0.1%).',
                trimester_concerns: 'First trimester: cardiac risk. Third trimester: neonatal toxicity, floppy infant syndrome',
            },
        ],
        lab_monitoring: [
            {
                medication: 'Lithium 600mg',
                required_lab: 'Serum Lithium Level',
                last_checked: '2025-11-15',
                due_date: '2026-02-15',
                status: 'overdue' as const,
            },
            {
                medication: 'Lithium 600mg',
                required_lab: 'TSH, Creatinine, eGFR',
                last_checked: '2025-08-20',
                due_date: '2026-02-20',
                status: 'due' as const,
            },
        ],
        metabolic_risk: {
            risk_level: 'moderate' as const,
            contributing_factors: ['Weight gain 4kg since treatment start', 'BMI 28.5 (overweight)'],
            recommendations: ['Order fasting lipid panel and HbA1c', 'Discuss dietary counseling', 'Consider metabolic monitoring every 3 months'],
        },
        clinical_pearls: [
            'Sertraline has the most favorable CYP interaction profile among SSRIs — minimal 2D6 inhibition compared to fluoxetine/paroxetine.',
            'Lithium levels should be drawn 12 hours post-dose for accurate trough measurement.',
            'Consider thyroid function monitoring — lithium-induced hypothyroidism occurs in up to 20% of patients.',
        ],
        summary: 'Overall medication safety is moderate (score: 78). The primary concern is the serotonin syndrome risk with concurrent sertraline and tramadol. Lithium monitoring labs are overdue and should be ordered immediately. Metabolic monitoring is recommended given weight gain trajectory.',
    };
}

export function getDemoChartSummaryResponse() {
    return {
        clinical_summary: 'Jane Doe is a 34-year-old female with Major Depressive Disorder (recurrent, moderate) and Generalized Anxiety Disorder, established patient since March 2024. Currently stable on Sertraline 150mg daily and Buspirone 10mg BID with reported improvement in PHQ-9 from 18 to 8 over the past 6 months. Last visit on 01/15/2026 focused on medication titration and sleep concerns — Trazodone 50mg QHS was added. No active suicidal ideation. Key monitoring items: weight has increased 4kg since starting Sertraline, and annual metabolic labs are due.',
        problem_list: [
            { problem: 'Major Depressive Disorder, recurrent', icd10: 'F33.1', status: 'improving' as const, last_addressed_date: '2026-01-15' },
            { problem: 'Generalized Anxiety Disorder', icd10: 'F41.1', status: 'stable' as const, last_addressed_date: '2026-01-15' },
            { problem: 'Insomnia', icd10: 'G47.00', status: 'new' as const, last_addressed_date: '2026-01-15' },
            { problem: 'Obesity', icd10: 'E66.01', status: 'worsening' as const, last_addressed_date: '2025-12-01' },
        ],
        medication_effectiveness: [
            { medication: 'Sertraline', dose: '150mg daily', purpose: 'MDD + GAD', assessment: 'effective' as const, evidence_basis: 'PHQ-9 improved 56% (18→8)' },
            { medication: 'Buspirone', dose: '10mg BID', purpose: 'GAD augmentation', assessment: 'effective' as const, evidence_basis: 'GAD-7 stable at 6' },
            { medication: 'Trazodone', dose: '50mg QHS', purpose: 'Insomnia', assessment: 'too_early' as const, evidence_basis: 'Started 4 weeks ago' },
        ],
        screening_trends: [
            { instrument: 'PHQ-9', scores: [{ date: '2024-06-15', score: 18 }, { date: '2024-09-20', score: 14 }, { date: '2025-01-10', score: 10 }, { date: '2025-07-15', score: 9 }, { date: '2025-11-20', score: 8 }, { date: '2026-01-15', score: 8 }], trend: 'improving' as const },
            { instrument: 'GAD-7', scores: [{ date: '2024-06-15', score: 15 }, { date: '2024-09-20', score: 10 }, { date: '2025-01-10', score: 8 }, { date: '2025-07-15', score: 7 }, { date: '2025-11-20', score: 6 }, { date: '2026-01-15', score: 6 }], trend: 'stable' as const },
        ],
        visit_alerts: [
            { message: '⚠️ Weight gain of 4kg since starting Sertraline — discuss metabolic monitoring', urgency: 'high' as const, rationale: 'Progressive weight gain may indicate medication side effect requiring intervention' },
            { message: '📋 Annual metabolic labs overdue — order CMP, lipid panel, HbA1c', urgency: 'high' as const, rationale: 'Standard of care for patients on psychotropic medications' },
            { message: '💊 Trazodone was started 4 weeks ago — assess sleep improvement and morning sedation', urgency: 'medium' as const, rationale: 'New medication requires efficacy and tolerability assessment' },
            { message: '📅 PHQ-9 due — last administered 5 weeks ago', urgency: 'medium' as const, rationale: 'Routine depression monitoring during active treatment' },
            { message: '🔄 Consider Sertraline dose optimization — PHQ-9 at 8, target <5 for full remission', urgency: 'low' as const, rationale: 'Partial response may benefit from dose increase or augmentation' },
        ],
        suggested_agenda: [
            'Assess Trazodone effectiveness for insomnia (4-week check)',
            'Order metabolic labs (CMP, lipid panel, HbA1c) and discuss weight management',
            'Administer PHQ-9 and GAD-7 — discuss treatment optimization if scores plateau',
        ],
    };
}
