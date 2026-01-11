/**
 * Quick Phrases for Clinical Documentation
 * 
 * Quick phrases are pre-written text snippets that clinicians can quickly insert
 * into their notes. They are organized by category and specialty.
 */

export interface QuickPhrase {
    id: string;
    category: string;
    specialty: 'mental_health' | 'geriatric' | 'both';
    shortcut: string; // e.g., "/mmse" or "/gds"
    label: string;
    content: string;
    isSystem: boolean;
}

export const quickPhrases: QuickPhrase[] = [
    // ===== GERIATRIC - COGNITIVE ASSESSMENTS =====
    {
        id: "qp-mmse-normal",
        category: "Cognitive Assessment",
        specialty: "geriatric",
        shortcut: "/mmse-normal",
        label: "MMSE - Normal",
        content: "Mini-Mental State Examination (MMSE) Score: 28/30. Patient demonstrates intact orientation to person, place, and time. Registration and recall are preserved. Attention and calculation skills intact. Language function normal. No significant cognitive impairment noted at this time.",
        isSystem: true,
    },
    {
        id: "qp-mmse-mci",
        category: "Cognitive Assessment",
        specialty: "geriatric",
        shortcut: "/mmse-mci",
        label: "MMSE - Mild Cognitive Impairment",
        content: "Mini-Mental State Examination (MMSE) Score: 24/30. Patient demonstrates mild impairment in delayed recall (1/3 words) and attention/calculation (serial 7s incomplete). Orientation and language preserved. Findings consistent with Mild Cognitive Impairment. Recommend follow-up testing in 6 months.",
        isSystem: true,
    },
    {
        id: "qp-mmse-dementia",
        category: "Cognitive Assessment",
        specialty: "geriatric",
        shortcut: "/mmse-dementia",
        label: "MMSE - Moderate Dementia",
        content: "Mini-Mental State Examination (MMSE) Score: 18/30. Patient demonstrates impairment in orientation (disoriented to date/day), registration (2/3), recall (0/3), and attention. Language shows word-finding difficulty. Findings consistent with moderate dementia. Caregiving support and safety evaluation recommended.",
        isSystem: true,
    },
    {
        id: "qp-moca-normal",
        category: "Cognitive Assessment",
        specialty: "geriatric",
        shortcut: "/moca",
        label: "MoCA - Normal",
        content: "Montreal Cognitive Assessment (MoCA) Score: 27/30. Visuospatial/executive function, naming, memory, attention, language, abstraction, and orientation all within normal limits. No cognitive impairment detected.",
        isSystem: true,
    },
    {
        id: "qp-clock-drawing",
        category: "Cognitive Assessment",
        specialty: "geriatric",
        shortcut: "/clock",
        label: "Clock Drawing Test",
        content: "Clock Drawing Test: Patient drew a clock with all numbers present and correctly placed. Hands are correctly positioned for requested time. Score: 4/4. No visuospatial or executive dysfunction noted.",
        isSystem: true,
    },

    // ===== GERIATRIC - FALL RISK =====
    {
        id: "qp-fall-low",
        category: "Fall Risk",
        specialty: "geriatric",
        shortcut: "/fall-low",
        label: "Fall Risk - Low",
        content: "Fall Risk Assessment: LOW RISK. Timed Up and Go (TUG): 10 seconds. No falls in past 12 months. Gait steady, no assistive device required. Balance intact on tandem stand. Medications reviewed - no high-risk medications. Patient educated on fall prevention. Reassess annually.",
        isSystem: true,
    },
    {
        id: "qp-fall-moderate",
        category: "Fall Risk",
        specialty: "geriatric",
        shortcut: "/fall-mod",
        label: "Fall Risk - Moderate",
        content: "Fall Risk Assessment: MODERATE RISK. Timed Up and Go (TUG): 15 seconds. One fall in past 12 months without injury. Mild unsteadiness on turning. Uses cane intermittently. Taking 2 high-risk medications (antihypertensive, sedative). Referral to PT for balance training. Home safety evaluation recommended.",
        isSystem: true,
    },
    {
        id: "qp-fall-high",
        category: "Fall Risk",
        specialty: "geriatric",
        shortcut: "/fall-high",
        label: "Fall Risk - High",
        content: "Fall Risk Assessment: HIGH RISK. Timed Up and Go (TUG): 22 seconds. Two or more falls in past 6 months, one resulting in ED visit. Uses walker but not consistently. Polypharmacy (8 medications including 3 fall-risk medications). Urgent PT referral placed. Medication review with pharmacist. Caregiver education provided. Consider Vitamin D supplementation.",
        isSystem: true,
    },

    // ===== GERIATRIC - DEPRESSION SCREENING =====
    {
        id: "qp-gds-negative",
        category: "Depression Screening",
        specialty: "geriatric",
        shortcut: "/gds-neg",
        label: "GDS-15 - Negative",
        content: "Geriatric Depression Scale-15 (GDS-15) Score: 3/15. No significant depressive symptoms endorsed. Patient reports good mood, adequate sleep, maintained interests, and positive outlook. Depression screening negative. Routine follow-up recommended.",
        isSystem: true,
    },
    {
        id: "qp-gds-positive",
        category: "Depression Screening",
        specialty: "geriatric",
        shortcut: "/gds-pos",
        label: "GDS-15 - Positive",
        content: "Geriatric Depression Scale-15 (GDS-15) Score: 8/15. Patient endorses feeling helpless, decreased energy, memory concerns, and social withdrawal. Screening positive for depressive symptoms. Safety assessment completed - no suicidal ideation. Consider antidepressant therapy and counseling referral. Follow-up in 2 weeks.",
        isSystem: true,
    },
    {
        id: "qp-phq9-minimal",
        category: "Depression Screening",
        specialty: "both",
        shortcut: "/phq9-min",
        label: "PHQ-9 - Minimal",
        content: "PHQ-9 Score: 3/27 (Minimal depression). Patient denies significant depressive symptoms. Sleep adequate, appetite normal, energy acceptable. No suicidal ideation. Continue supportive care and routine screening.",
        isSystem: true,
    },

    // ===== GERIATRIC - FUNCTIONAL STATUS =====
    {
        id: "qp-adl-independent",
        category: "Functional Status",
        specialty: "geriatric",
        shortcut: "/adl-ind",
        label: "ADLs - Independent",
        content: "Activities of Daily Living (ADLs): Patient is INDEPENDENT in all basic ADLs including bathing, dressing, toileting, transferring, continence, and feeding. No assistance required for self-care activities.",
        isSystem: true,
    },
    {
        id: "qp-adl-partial",
        category: "Functional Status",
        specialty: "geriatric",
        shortcut: "/adl-part",
        label: "ADLs - Partial Assistance",
        content: "Activities of Daily Living (ADLs): Patient requires PARTIAL ASSISTANCE. Independent in feeding, toileting, and transferring. Requires assistance with bathing (unable to safely enter/exit tub) and dressing (difficulty with buttons, zippers). Continent of bowel/bladder. Katz ADL Index: 4/6.",
        isSystem: true,
    },
    {
        id: "qp-iadl-independent",
        category: "Functional Status",
        specialty: "geriatric",
        shortcut: "/iadl-ind",
        label: "IADLs - Independent",
        content: "Instrumental Activities of Daily Living (IADLs): Patient is INDEPENDENT in all IADLs including telephone use, shopping, food preparation, housekeeping, laundry, transportation, medication management, and finances. Lawton IADL Scale: 8/8.",
        isSystem: true,
    },
    {
        id: "qp-iadl-impaired",
        category: "Functional Status",
        specialty: "geriatric",
        shortcut: "/iadl-imp",
        label: "IADLs - Impaired",
        content: "Instrumental Activities of Daily Living (IADLs): Patient requires ASSISTANCE with several IADLs. No longer driving (license surrendered). Family manages finances and medication setup. Uses meal delivery service. Can use telephone with large buttons. Lawton IADL Scale: 4/8. Caregiver support adequate.",
        isSystem: true,
    },

    // ===== MENTAL HEALTH =====
    {
        id: "qp-mse-normal",
        category: "Mental Status",
        specialty: "mental_health",
        shortcut: "/mse-normal",
        label: "MSE - Normal",
        content: "Mental Status Exam: Patient is alert and oriented x4. Appearance appropriate, behavior cooperative. Speech normal rate/rhythm/volume. Mood euthymic, affect congruent and full range. Thought process linear and goal-directed. No delusions, hallucinations, or paranoia. Judgment and insight intact. Cognition grossly intact. No suicidal or homicidal ideation.",
        isSystem: true,
    },
    {
        id: "qp-mse-depressed",
        category: "Mental Status",
        specialty: "mental_health",
        shortcut: "/mse-dep",
        label: "MSE - Depressed",
        content: "Mental Status Exam: Patient is alert and oriented x4. Appearance with mild psychomotor retardation, decreased eye contact. Speech soft and slow. Mood described as \"sad\" and \"hopeless.\" Affect constricted, tearful at times. Thought process coherent but with ruminative features. Denies suicidal ideation, plan, or intent. Judgment fair, insight improving. Cognition intact.",
        isSystem: true,
    },
    {
        id: "qp-safety-negative",
        category: "Safety Assessment",
        specialty: "mental_health",
        shortcut: "/safe-neg",
        label: "Safety Assessment - Negative",
        content: "Safety Assessment: Patient denies suicidal ideation, intent, or plan. Denies homicidal ideation. No access to firearms in home. Protective factors include: supportive family, engaged in treatment, reasons for living. Current risk level: LOW. Safety plan not indicated at this time.",
        isSystem: true,
    },
    {
        id: "qp-safety-plan",
        category: "Safety Assessment",
        specialty: "mental_health",
        shortcut: "/safe-plan",
        label: "Safety Plan Created",
        content: "Safety Plan: Reviewed and updated safety plan with patient. Warning signs identified. Coping strategies: deep breathing, calling friend, going for walk. Social contacts: sister (XXX-XXX-XXXX). Crisis resources: 988 Suicide & Crisis Lifeline, local ED. Removed access to means. Patient verbalized understanding and commitment to safety plan.",
        isSystem: true,
    },

    // ===== BILLING SUPPORT =====
    {
        id: "qp-time-45min",
        category: "Time Documentation",
        specialty: "both",
        shortcut: "/time45",
        label: "Time - 45 Minutes",
        content: "Total face-to-face time with patient: 45 minutes. Greater than 50% of visit time spent in counseling and/or coordination of care, discussing diagnosis, prognosis, treatment options, and addressing patient questions.",
        isSystem: true,
    },
    {
        id: "qp-time-60min",
        category: "Time Documentation",
        specialty: "both",
        shortcut: "/time60",
        label: "Time - 60 Minutes",
        content: "Total face-to-face time with patient: 60 minutes. Greater than 50% of visit time spent in counseling and/or coordination of care, discussing diagnosis, prognosis, treatment options, medication management, and addressing patient and family questions.",
        isSystem: true,
    },
    {
        id: "qp-mdm-high",
        category: "Time Documentation",
        specialty: "both",
        shortcut: "/mdm-high",
        label: "MDM - High Complexity",
        content: "Medical Decision Making: HIGH complexity. Multiple chronic conditions with acute exacerbation. New prescription with monitoring required. Review of external records and diagnostic data. High risk of morbidity due to drug therapy requiring intensive monitoring.",
        isSystem: true,
    },
];

export const getQuickPhrasesBySpecialty = (specialty: 'mental_health' | 'geriatric' | 'both') =>
    quickPhrases.filter(qp => qp.specialty === specialty || qp.specialty === 'both');

export const getQuickPhrasesByCategory = (category: string) =>
    quickPhrases.filter(qp => qp.category === category);

export const searchQuickPhrases = (query: string) =>
    quickPhrases.filter(qp =>
        qp.label.toLowerCase().includes(query.toLowerCase()) ||
        qp.shortcut.toLowerCase().includes(query.toLowerCase()) ||
        qp.content.toLowerCase().includes(query.toLowerCase())
    );

export const getQuickPhraseCategories = () =>
    [...new Set(quickPhrases.map(qp => qp.category))];
