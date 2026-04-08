export interface TemplateSection {
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
}

export interface Template {
    id: string;
    name: string;
    description: string;
    specialties: string[];
    sections: TemplateSection[];
    isSystem: boolean;
    is_system?: boolean; // Legacy support
    is_default?: boolean; // Legacy support
    cpt_suggestions: string[]; // Required for billing flow
    format: "soap" | "paragraph";
}

export const templates: Template[] = [
    {
        id: "tpl-soap-note",
        name: "SOAP Note",
        description: "Standard SOAP format note (Subjective, Objective, Assessment, Plan).",
        specialties: ["Psychiatry", "Psychology", "Family Medicine", "Internal Medicine"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99213", "99214", "99215"],
        format: "soap",
        sections: [
            { id: "subjective", label: "Subjective", placeholder: "Chief complaint, HPI, ROS, current medications, patient-reported symptoms...", required: true },
            { id: "objective", label: "Objective", placeholder: "Vitals, physical exam, mental status exam, lab results...", required: true },
            { id: "assessment", label: "Assessment", placeholder: "Diagnostic formulation, ICD-10 codes, risk level...", required: true },
            { id: "plan", label: "Plan", placeholder: "Medications, therapy, follow-up, patient education...", required: true }
        ]
    },
    {
        id: "tpl-progress-note",
        name: "Progress Note (PRIMARY)",
        description: "Standard SOAP note optimized for insurance billing and clinical quality.",
        specialties: ["Psychiatry", "Psychology", "Family Medicine"],
        isSystem: true,
        is_system: true,
        is_default: true,
        cpt_suggestions: ["99213", "99214", "99215"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Session Notes", placeholder: "Document the visit including: Subjective (chief complaint, HPI, ROS, current medications), Objective (vitals, physical exam, mental status exam), Assessment (diagnostic formulation, ICD-10 codes, risk level), and Plan (medications, therapy, follow-up, patient education)...", required: true }
        ]
    },
    {
        id: "tpl-followup-med",
        name: "Follow-up Medication Visit",
        description: "Brief visit focused on medication effectiveness and side effect monitoring.",
        specialties: ["Psychiatry", "Neurology"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99214", "90833"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Session Notes", placeholder: "Document the medication follow-up including: Current medications and dosages, effectiveness and side effects, changes in target symptoms since last visit, and revised plan (refills, dosage adjustments, monitoring labs)...", required: true }
        ]
    },
    {
        id: "tpl-psych-cbt",
        name: "Individual Psychotherapy (CBT)",
        description: "Focused Cognitive Behavioral Therapy session with structured clinical outcomes.",
        specialties: ["Psychology", "Social Work", "Psychiatry"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["90834", "90837"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Session Notes", placeholder: "Document the therapy session including: Agenda & objectives, CBT techniques applied (cognitive restructuring, behavioral activation), patient's response and insights, homework assignments for next session...", required: true }
        ]
    },
    {
        id: "tpl-intake-eval",
        name: "Bio-Psychosocial Assessment",
        description: "Comprehensive initial evaluation for new patient admissions.",
        specialties: ["Psychiatry", "Social Work"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["90792", "90791"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Assessment Details", placeholder: "Enter complete bio-psychosocial assessment details...", required: true }
        ]
    },
    {
        id: "tpl-initial-med",
        name: "Initial Medication Visit",
        description: "In-depth first visit for medication initiation and medical clearance.",
        specialties: ["Psychiatry", "Nursing"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99204", "99205"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Visit Documentation", placeholder: "Document the initial medication visit including: Medical history and allergies, current symptoms and severity, treatment goals, initial prescription with starting dose, monitoring plan, and risks explained to patient...", required: true }
        ]
    },
    // ===== GERIATRIC TEMPLATES =====
    {
        id: "tpl-geriatric-awv",
        name: "Annual Wellness Visit (AWV)",
        description: "Medicare Annual Wellness Visit with health risk assessment and personalized prevention plan.",
        specialties: ["Geriatric Medicine", "Family Medicine", "Internal Medicine"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["G0438", "G0439", "99490"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Annual Wellness Visit Documentation", placeholder: "Document the complete AWV including: Health Risk Assessment (conditions, family history, medications), Functional Status (ADLs, IADLs, mobility, vision, hearing), Cognitive Assessment (MMSE score, orientation, memory), Depression Screening (PHQ-9/GDS-15 score), Fall Risk Assessment (TUG test, balance, previous falls), and Personalized Prevention Plan (vaccinations, screenings, advance directives)...", required: true }
        ]
    },
    {
        id: "tpl-geriatric-cognitive",
        name: "Cognitive Evaluation",
        description: "Comprehensive cognitive assessment for dementia screening and monitoring.",
        specialties: ["Geriatric Medicine", "Neurology", "Psychiatry"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99483", "96116", "96132"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Session Notes", placeholder: "Document the cognitive evaluation including: Chief complaint (memory concerns, confusion, behavioral changes), cognitive testing (MMSE, MoCA, clock drawing scores), neurological exam findings, functional impact on daily activities, diagnosis and staging, and care plan (medications, caregiver support, referrals)...", required: true }
        ]
    },
    {
        id: "tpl-geriatric-fall-risk",
        name: "Fall Risk Assessment",
        description: "Comprehensive fall risk evaluation with intervention planning.",
        specialties: ["Geriatric Medicine", "Physical Therapy", "Family Medicine"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99213", "99214", "97110"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Session Notes", placeholder: "Document the fall risk assessment including: Fall history (number, circumstances, injuries), medication review (high-risk medications, polypharmacy), physical assessment (gait, balance, TUG test), environmental factors (home hazards, assistive devices), and risk level with interventions (PT referral, medication adjustments, home modifications)...", required: true }
        ]
    },
    {
        id: "tpl-geriatric-chronic-care",
        name: "Chronic Care Management",
        description: "Monthly chronic care management documentation for Medicare CCM billing.",
        specialties: ["Geriatric Medicine", "Family Medicine", "Internal Medicine"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99490", "99491", "99487"],
        format: "paragraph",
        sections: [
            { id: "full", label: "Session Notes", placeholder: "Document the chronic care management including: Conditions managed this month, time spent on care coordination (20+ minutes for 99490), care activities (phone calls, medication reconciliation), patient education provided, and next steps (upcoming appointments, labs, referrals)...", required: true }
        ]
    }
];

export const systemTemplates = templates;
export const getTemplateById = (id: string) => templates.find(t => t.id === id);
export const getDefaultTemplate = () => templates.find(t => t.is_default) || templates[0];
export const getGeriatricTemplates = () => templates.filter(t => t.id.includes('geriatric'));
