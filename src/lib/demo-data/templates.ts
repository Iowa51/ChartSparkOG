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
    }
];

export const systemTemplates = templates;
export const getTemplateById = (id: string) => templates.find(t => t.id === id);
export const getDefaultTemplate = () => templates.find(t => t.is_default) || templates[0];
