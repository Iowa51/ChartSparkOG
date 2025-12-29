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
}

export const templates: Template[] = [
    {
        id: "tpl-progress-note",
        name: "Standard Progress Note",
        description: "Standard SOAP note optimized for insurance billing and clinical quality.",
        specialties: ["Psychiatry", "Psychology", "Family Medicine"],
        isSystem: true,
        is_system: true,
        is_default: true,
        cpt_suggestions: ["99213", "99214", "99215"],
        sections: [
            { id: "s1", label: "Subjective", placeholder: "Chief complaint, HPI, ROS, current medications...", required: true },
            { id: "s2", label: "Objective", placeholder: "Vitals, physical exam, mental status exam...", required: true },
            { id: "s3", label: "Assessment", placeholder: "Diagnostic formulation, ICD-10 codes, risk level...", required: true },
            { id: "s4", label: "Plan", placeholder: "Medications, therapy, follow-up, patient education...", required: true },
        ]
    },
    {
        id: "tpl-intake-eval",
        name: "Initial Intake Evaluation",
        description: "Comprehensive bio-psychosocial assessment for new patient admissions.",
        specialties: ["Psychiatry", "Social Work"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["90792", "90791"],
        sections: [
            { id: "i1", label: "History of Present Illness", placeholder: "Detailed onset, duration, and severity of symptoms...", required: true },
            { id: "i2", label: "Psychiatric History", placeholder: "Past hospitalizations, medications, and treatments...", required: true },
            { id: "i3", label: "Social & Family History", placeholder: "Support systems, employment, family medical history...", required: true },
            { id: "i4", label: "Mental Status Exam", placeholder: "Appearance, affect, thought process...", required: true },
            { id: "i5", label: "Formulation & Plan", placeholder: "Holistic treatment recommendations...", required: true },
        ]
    },
    {
        id: "tpl-med-management",
        name: "Medication Management",
        description: "Brief visit focused on medication effectiveness and side effect monitoring.",
        specialties: ["Psychiatry", "Neurology"],
        isSystem: true,
        is_system: true,
        is_default: false,
        cpt_suggestions: ["99214", "90833"],
        sections: [
            { id: "m1", label: "Current Medications", placeholder: "List all active meds and dosages...", required: true },
            { id: "m2", label: "Effectiveness & Side Effects", placeholder: "How is the patient tolerating the regime?", required: true },
            { id: "m3", label: "Target Symptoms", placeholder: "Changes in primary symptoms since last visit...", required: true },
            { id: "m4", label: "Revised Plan", placeholder: "Refills, dosage adjustments, monitoring labs...", required: true },
        ]
    }
];

export const systemTemplates = templates;
export const getTemplateById = (id: string) => templates.find(t => t.id === id);
export const getDefaultTemplate = () => templates.find(t => t.is_default) || templates[0];
