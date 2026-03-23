// src/app/api/ai/smart-triage/medication-review/route.ts
// AI-powered medication safety triage analysis

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import {
    buildMedicationTriagePrompt,
    getDemoMedicationTriageResponse,
    PROMPT_VERSION,
} from '@/lib/ai/smart-triage-prompts';
import { getSafetyLevel } from '@/lib/types/smart-triage';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { MedicationReviewSchema, validateRequest } from '@/lib/validation/schemas';

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();

        // Validate input with Zod schema
        const validation = validateRequest(MedicationReviewSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { patient_id } = validation.data;

        const supabase = await createClient();

        // Check for cached result (24h)
        if (supabase) {
            const { data: cached } = await supabase
                .from('smart_triage_results')
                .select('*')
                .eq('patient_id', patient_id)
                .eq('triage_type', 'medication_review')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (cached) {
                return NextResponse.json({
                    result: cached.result_data,
                    safety_score: cached.safety_score,
                    cached: true,
                    created_at: cached.created_at,
                });
            }
        }

        // Gather patient context
        let patientData: Record<string, unknown> = {};
        let medications: { name: string; dose: string; frequency: string }[] = [];
        let diagnoses: string[] = [];
        let allergies: string[] = [];

        if (supabase) {
            // Fetch patient demographics
            const { data: patient } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patient_id)
                .single();

            if (patient) {
                patientData = patient;

                // Calculate age
                if (patient.date_of_birth) {
                    const dob = new Date(patient.date_of_birth);
                    const ageDiff = Date.now() - dob.getTime();
                    patientData.age = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
                }
            }

            // Fetch medications (from patient_medications if exists, or from extended schema)
            try {
                const { data: meds } = await supabase
                    .from('patient_medications')
                    .select('medication, dosage, frequency')
                    .eq('patient_id', patient_id)
                    .eq('status', 'active');

                if (meds) {
                    medications = meds.map((m: Record<string, string>) => ({
                        name: m.medication,
                        dose: m.dosage || '',
                        frequency: m.frequency || '',
                    }));
                }
            } catch {
                // Table may not exist yet — continue with empty array
            }

            // Fetch diagnoses
            try {
                const { data: problems } = await supabase
                    .from('patient_problems')
                    .select('problem, icd10_code')
                    .eq('patient_id', patient_id)
                    .eq('status', 'active');

                if (problems) {
                    diagnoses = problems.map((p: Record<string, string>) =>
                        `${p.problem}${p.icd10_code ? ` (${p.icd10_code})` : ''}`
                    );
                }
            } catch {
                // Table may not exist — continue
            }

            // Fetch allergies
            try {
                const { data: allergyData } = await supabase
                    .from('patient_allergies')
                    .select('allergy, severity')
                    .eq('patient_id', patient_id);

                if (allergyData) {
                    allergies = allergyData.map((a: Record<string, string>) => a.allergy);
                }
            } catch {
                // Table may not exist — continue
            }
        }

        // Build AI prompt
        const prompt = buildMedicationTriagePrompt({
            age: (patientData.age as number) || 35,
            sex: (patientData.gender as string) || 'Unknown',
            weight: (patientData.weight as number) || undefined,
            diagnoses,
            allergies,
            medications,
        });

        let result;
        let isDemo = false;

        // Call AI or use demo fallback
        if (safeAzureOpenAI.isAvailable() && medications.length > 0) {
            try {
                const response = await safeAzureOpenAI.chat(prompt, []);
                result = JSON.parse(response);
            } catch (parseError) {
                logError({ action: 'ERROR_PARSING_AI_RESPONSE', error: sanitizeError(parseError) });
                result = getDemoMedicationTriageResponse();
                isDemo = true;
            }
        } else {
            result = getDemoMedicationTriageResponse();
            isDemo = true;
        }

        const safetyScore = result.overall_safety_score || 78;

        // Cache result
        if (supabase) {
            const interactionsCount = result.drug_drug_interactions?.length || 0;
            const criticalCount = result.drug_drug_interactions?.filter(
                (d: { severity: string }) => d.severity === 'critical' || d.severity === 'high'
            ).length || 0;

            await supabase.from('smart_triage_results').insert({
                organization_id: context.user.organizationId,
                patient_id,
                triage_type: 'medication_review',
                safety_score: safetyScore,
                result_data: result,
                alerts_count: interactionsCount + (result.black_box_warnings?.length || 0),
                critical_alerts_count: criticalCount,
                ai_model: isDemo ? 'demo' : 'gpt-4o',
                ai_prompt_version: PROMPT_VERSION,
            });
        }

        await logAuditEvent({
            eventType: 'NOTE_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'smart_triage',
            details: {
                action: 'MEDICATION_TRIAGE',
                patient_id,
                safety_score: safetyScore,
                safety_level: getSafetyLevel(safetyScore),
                isDemo,
            },
            phiAccessed: true,
            riskLevel: safetyScore < 70 ? 'HIGH' : 'MEDIUM',
        });

        return NextResponse.json({
            result,
            safety_score: safetyScore,
            safety_level: getSafetyLevel(safetyScore),
            isDemo,
            cached: false,
        });
    } catch (error) {
        logError({ action: 'ERROR_IN_MEDICATION_REVIEW', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to run medication triage', isDemo: true, result: getDemoMedicationTriageResponse() },
            { status: 200 } // Return 200 with demo data for graceful degradation
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
