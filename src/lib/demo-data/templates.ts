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
        id: "tpl-progress-note",
        name: "Progress Note (PRIMARY)",
        description: "Standard SOAP note optimized for insurance billing and clinical quality.",
        specialties: ["Psychiatry", "Psychology", "Family Medicine"],
        isSystem: true,
        is_system: true,
        is_default: true,
        cpt_suggestions: ["99213", "99214", "99215"],
        format: "soap",
        sections: [
            { id: "s1", label: "Subjective", placeholder: "Chief complaint, HPI, ROS, current medications...", required: true },
            { id: "s2", label: "Objective", placeholder: "Vitals, physical exam, mental status exam...", required: true },
            { id: "s3", label: "Assessment", placeholder: "Diagnostic formulation, ICD-10 codes, risk level...", required: true },
            { id: "s4", label: "Plan", placeholder: "Medications, therapy, follow-up, patient education...", required: true },
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
        format: "soap",
        sections: [
            { id: "m1", label: "Current Medications", placeholder: "List all active meds and dosages...", required: true },
            { id: "m2", label: "Effectiveness & Side Effects", placeholder: "How is the patient tolerating the regime?", required: true },
            { id: "m3", label: "Target Symptoms", placeholder: "Changes in primary symptoms since last visit...", required: true },
            { id: "m4", label: "Revised Plan", placeholder: "Refills, dosage adjustments, monitoring labs...", required: true },
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
        format: "soap",
        sections: [
            { id: "c1", label: "Agenda & Objective", placeholder: "Topics covered, CBT techniques applied...", required: true },
            { id: "c2", label: "Interventions", placeholder: "Cognitive restructuring, behavioral activation...", required: true },
            { id: "c3", label: "Progress & Insights", placeholder: "Patient's response to therapy, homework review...", required: true },
            { id: "c4", label: "Home Tasks", placeholder: "Assigned tasks for next session...", required: true },
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
        format: "soap",
        sections: [
            { id: "v1", label: "Medical History", placeholder: "Relevant medical conditions, allergies, labs...", required: true },
            { id: "v2", label: "Current Symptoms", placeholder: "Primary complaints and symptom severity...", required: true },
            { id: "v3", label: "Treatment Goals", placeholder: "What the patient hopes to achieve...", required: true },
            { id: "v4", label: "Initial Prescription", placeholder: "Starting dose, monitor plan, risks explained...", required: true },
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
        format: "soap",
        sections: [
            { id: "awv1", label: "Health Risk Assessment", placeholder: "Current health conditions, family history, medications review...", required: true },
            { id: "awv2", label: "Functional Status", placeholder: "ADLs, IADLs, mobility, vision, hearing screening...", required: true },
            { id: "awv3", label: "Cognitive Assessment", placeholder: "MMSE score, orientation, memory concerns...", required: true },
            { id: "awv4", label: "Depression Screening", placeholder: "PHQ-9 or GDS-15 score, mood assessment...", required: true },
            { id: "awv5", label: "Fall Risk Assessment", placeholder: "Timed Up and Go, balance, previous falls...", required: true },
            { id: "awv6", label: "Personalized Prevention Plan", placeholder: "Vaccinations, screenings, advance directives...", required: true },
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
        format: "soap",
        sections: [
            { id: "cog1", label: "Chief Complaint", placeholder: "Memory concerns, confusion, behavioral changes reported by patient/family...", required: true },
            { id: "cog2", label: "Cognitive Testing", placeholder: "MMSE, MoCA, clock drawing, verbal fluency scores...", required: true },
            { id: "cog3", label: "Neurological Exam", placeholder: "Cranial nerves, motor, sensory, reflexes, gait...", required: true },
            { id: "cog4", label: "Functional Impact", placeholder: "Impact on daily activities, safety concerns, driving ability...", required: true },
            { id: "cog5", label: "Diagnosis & Staging", placeholder: "Dementia type, stage, reversible causes ruled out...", required: true },
            { id: "cog6", label: "Care Plan", placeholder: "Medications, caregiver support, referrals, follow-up...", required: true },
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
        format: "soap",
        sections: [
            { id: "fall1", label: "Fall History", placeholder: "Previous falls (number, circumstances, injuries)...", required: true },
            { id: "fall2", label: "Medication Review", placeholder: "High-risk medications (sedatives, antihypertensives, polypharmacy)...", required: true },
            { id: "fall3", label: "Physical Assessment", placeholder: "Gait, balance, strength, TUG test, Berg Balance...", required: true },
            { id: "fall4", label: "Environmental Factors", placeholder: "Home hazards, assistive devices, footwear...", required: true },
            { id: "fall5", label: "Risk Level & Interventions", placeholder: "Risk score, PT referral, medication adjustments, home modifications...", required: true },
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
        format: "soap",
        sections: [
            { id: "ccm1", label: "Conditions Managed", placeholder: "List of chronic conditions addressed this month...", required: true },
            { id: "ccm2", label: "Time Spent", placeholder: "Total minutes of care coordination (must be 20+ for 99490)...", required: true },
            { id: "ccm3", label: "Care Activities", placeholder: "Phone calls, medication reconciliation, care coordination...", required: true },
            { id: "ccm4", label: "Patient Education", placeholder: "Self-management support, disease education provided...", required: true },
            { id: "ccm5", label: "Next Steps", placeholder: "Upcoming appointments, labs, specialist referrals...", required: true },
        ]
    }
];

export const systemTemplates = templates;
export const getTemplateById = (id: string) => templates.find(t => t.id === id);
export const getDefaultTemplate = () => templates.find(t => t.is_default) || templates[0];
export const getGeriatricTemplates = () => templates.filter(t => t.id.includes('geriatric'));
