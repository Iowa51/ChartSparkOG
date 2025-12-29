// Demo templates data
import { NoteTemplate } from "@/types/database";

export const systemTemplates: NoteTemplate[] = [
    {
        id: "tpl-progress-note",
        name: "Progress Note",
        description: "Primary template for insurance billing. SOAP format optimized to reduce claim rejections.",
        structure: {
            subjective: {
                label: "Subjective",
                required: true,
                placeholder: "Chief complaint, HPI, ROS, current medications, allergies...",
            },
            objective: {
                label: "Objective",
                required: true,
                placeholder: "Vitals, physical exam findings, mental status exam, lab results...",
            },
            assessment: {
                label: "Assessment",
                required: true,
                placeholder: "Diagnoses with ICD-10 codes, clinical impressions, risk assessment...",
            },
            plan: {
                label: "Plan",
                required: true,
                placeholder: "Treatment plan, medications, follow-up, patient education...",
            },
        },
        cpt_suggestions: ["99213", "99214", "99215"],
        is_default: true,
        is_system: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "tpl-follow-up-med",
        name: "Follow-up Medication Visit",
        description: "Routine medication management visit with mental health add-on billing codes.",
        structure: {
            subjective: { label: "Subjective", required: true, placeholder: "Medication effectiveness, side effects, symptoms..." },
            objective: { label: "Objective", required: true, placeholder: "Vitals, mental status, physical findings..." },
            assessment: { label: "Assessment", required: true, placeholder: "Response to treatment, diagnosis update..." },
            plan: { label: "Plan", required: true, placeholder: "Medication changes, refills, next visit..." },
        },
        cpt_suggestions: ["99214", "90833"],
        is_default: false,
        is_system: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "tpl-individual-cbt",
        name: "Individual Psychotherapy CBT",
        description: "Cognitive behavioral therapy session documentation for individuals.",
        structure: {
            subjective: { label: "Subjective", required: true, placeholder: "Patient's reported concerns, mood, events since last session..." },
            objective: { label: "Objective", required: true, placeholder: "Affect, behavior, engagement, mental status..." },
            assessment: { label: "Assessment", required: true, placeholder: "Progress toward goals, therapeutic interventions used..." },
            plan: { label: "Plan", required: true, placeholder: "Homework, coping strategies, next session focus..." },
        },
        cpt_suggestions: ["90834", "90837"],
        is_default: false,
        is_system: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "tpl-bio-psycho",
        name: "Bio-Psychosocial Assessment",
        description: "Comprehensive psychiatric diagnostic evaluation for new patients.",
        structure: {
            subjective: { label: "Subjective", required: true, placeholder: "Chief complaint, psychiatric history, medical history, social history, family history..." },
            objective: { label: "Objective", required: true, placeholder: "Mental status exam, physical exam, current medications, labs..." },
            assessment: { label: "Assessment", required: true, placeholder: "Diagnostic formulation, differential diagnoses, risk assessment..." },
            plan: { label: "Plan", required: true, placeholder: "Treatment recommendations, medications, therapy, referrals, safety plan..." },
        },
        cpt_suggestions: ["90792", "90791"],
        is_default: false,
        is_system: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "tpl-initial-med",
        name: "Initial Medication Visit",
        description: "New patient medication evaluation and initiation for complex cases.",
        structure: {
            subjective: { label: "Subjective", required: true, placeholder: "Reason for visit, psychiatric history, past medications, allergies..." },
            objective: { label: "Objective", required: true, placeholder: "Vitals, mental status exam, physical exam findings..." },
            assessment: { label: "Assessment", required: true, placeholder: "Primary and secondary diagnoses with ICD-10..." },
            plan: { label: "Plan", required: true, placeholder: "New medications, titration schedule, monitoring, follow-up..." },
        },
        cpt_suggestions: ["99205", "99204"],
        is_default: false,
        is_system: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

export function getTemplateById(id: string): NoteTemplate | undefined {
    return systemTemplates.find((t) => t.id === id);
}

export function getDefaultTemplate(): NoteTemplate {
    return systemTemplates.find((t) => t.is_default) || systemTemplates[0];
}
