/**
 * Patient Context for AI Note Generation
 *
 * Aggregates demographics, active medications, allergies, and active problems
 * for a patient so the AI note generator can ground output in real record
 * data instead of fabricating plausible-sounding clinical facts.
 *
 * Uses the user-scoped Supabase client so RLS enforces tenant isolation via
 * the organization_id filter.
 */

import { createClient } from '@/lib/supabase/server';
import { logError, logWarn, sanitizeError } from '@/lib/logging/safe-logger';
import { calculateAge } from './utils';

export interface PatientContextForAI {
    demographics: {
        age: number | null;
        sex: string | null;
    };
    medications: Array<{
        name: string;
        dosage: string | null;
        frequency: string | null;
    }>;
    allergies: Array<{
        allergen: string;
        severity: string | null;
        reaction: string | null;
    }>;
    problems: Array<{
        problem: string;
        icd10_code: string | null;
    }>;
}

function toAge(dob: string | null): number | null {
    if (!dob) return null;
    try {
        const age = calculateAge(dob);
        if (!Number.isFinite(age) || age < 0) return null;
        return age;
    } catch {
        return null;
    }
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Fetch patient demographics + active medications + allergies + active
 * problems for a given patient. Returns null if the patient does not exist
 * within the caller's organization or if any fatal error prevents the
 * lookup. Non-fatal errors on individual related tables are logged and
 * return empty arrays so the AI still gets partial grounding context.
 */
export async function getPatientContextForAI(
    patientId: string,
    organizationId: string,
): Promise<PatientContextForAI | null> {
    try {
        const supabase = await createClient();
        if (!supabase) return null;

        const [patientResult, allergiesResult, medicationsResult, problemsResult] =
            await Promise.all([
                supabase
                    .from('patients')
                    .select('date_of_birth, gender')
                    .eq('id', patientId)
                    .eq('organization_id', organizationId)
                    .maybeSingle(),
                supabase
                    .from('patient_allergies')
                    .select('allergy, severity, reaction')
                    .eq('patient_id', patientId),
                supabase
                    .from('patient_medications')
                    .select('medication, dosage, frequency')
                    .eq('patient_id', patientId)
                    .eq('status', 'active'),
                supabase
                    .from('patient_problems')
                    .select('problem, icd10_code')
                    .eq('patient_id', patientId)
                    .eq('status', 'active'),
            ]);

        if (patientResult.error) {
            logError({
                action: 'GET_PATIENT_CONTEXT_FAILED',
                error: sanitizeError(patientResult.error),
                resourceType: 'patient',
            });
            return null;
        }

        if (!patientResult.data) {
            return null;
        }

        if (allergiesResult.error) {
            logWarn({
                action: 'GET_PATIENT_CONTEXT_ALLERGIES_FAILED',
                error: sanitizeError(allergiesResult.error),
            });
        }
        if (medicationsResult.error) {
            logWarn({
                action: 'GET_PATIENT_CONTEXT_MEDICATIONS_FAILED',
                error: sanitizeError(medicationsResult.error),
            });
        }
        if (problemsResult.error) {
            logWarn({
                action: 'GET_PATIENT_CONTEXT_PROBLEMS_FAILED',
                error: sanitizeError(problemsResult.error),
            });
        }

        const patientRow = patientResult.data as {
            date_of_birth: string | null;
            gender: string | null;
        };
        const medicationRows = (medicationsResult.data || []) as Array<{
            medication: string;
            dosage: string | null;
            frequency: string | null;
        }>;
        const allergyRows = (allergiesResult.data || []) as Array<{
            allergy: string;
            severity: string | null;
            reaction: string | null;
        }>;
        const problemRows = (problemsResult.data || []) as Array<{
            problem: string;
            icd10_code: string | null;
        }>;

        const genderRaw = (patientRow.gender || '').trim();
        return {
            demographics: {
                age: toAge(patientRow.date_of_birth),
                sex: genderRaw ? capitalize(genderRaw) : null,
            },
            medications: medicationRows.map((m) => ({
                name: m.medication,
                dosage: m.dosage ?? null,
                frequency: m.frequency ?? null,
            })),
            allergies: allergyRows.map((a) => ({
                allergen: a.allergy,
                severity: a.severity ?? null,
                reaction: a.reaction ?? null,
            })),
            problems: problemRows.map((p) => ({
                problem: p.problem,
                icd10_code: p.icd10_code ?? null,
            })),
        };
    } catch (err) {
        logError({
            action: 'GET_PATIENT_CONTEXT_FAILED',
            error: sanitizeError(err),
            resourceType: 'patient',
        });
        return null;
    }
}

/**
 * Render a PatientContextForAI as a prompt-injectable string block. Handles
 * all edge cases: missing age, missing sex, empty medications/allergies/
 * problems arrays, and medications that lack dosage or frequency metadata.
 *
 * Token footprint: ~200 tokens for a typical patient (5 meds, 2 allergies,
 * 3 problems). Heavy patients (20/10/15) come in around 800-1000 tokens —
 * well inside the Azure OpenAI GPT-4o 128K window. No truncation today.
 */
export function formatPatientContextForPrompt(ctx: PatientContextForAI): string {
    const ageLine =
        ctx.demographics.age != null
            ? `- Age: ${ctx.demographics.age}`
            : '- Age: [Not recorded]';
    const sexLine =
        ctx.demographics.sex && ctx.demographics.sex.length > 0
            ? `- Sex: ${ctx.demographics.sex}`
            : '- Sex: [Not recorded]';

    const medsBlock =
        ctx.medications.length === 0
            ? 'Active Medications: [None recorded]'
            : [
                  'Active Medications:',
                  ...ctx.medications.map((m) => {
                      const parts = [m.name];
                      if (m.dosage) parts.push(m.dosage);
                      if (m.frequency) parts.push(m.frequency);
                      return `- ${parts.join(' ')}`;
                  }),
              ].join('\n');

    const allergiesBlock =
        ctx.allergies.length === 0
            ? 'Known Allergies: [None recorded]'
            : [
                  'Known Allergies:',
                  ...ctx.allergies.map((a) => {
                      const suffix = a.severity ? ` (${a.severity})` : '';
                      return `- ${a.allergen}${suffix}`;
                  }),
              ].join('\n');

    const problemsBlock =
        ctx.problems.length === 0
            ? 'Active Problems: [None recorded]'
            : [
                  'Active Problems:',
                  ...ctx.problems.map((p) => {
                      const suffix = p.icd10_code ? ` (${p.icd10_code})` : '';
                      return `- ${p.problem}${suffix}`;
                  }),
              ].join('\n');

    return [
        'Patient Context:',
        'Demographics:',
        ageLine,
        sexLine,
        '',
        medsBlock,
        '',
        allergiesBlock,
        '',
        problemsBlock,
    ].join('\n');
}
