// AI-powered clinical note generation from clinician input

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI, { AIProviderUnavailableError } from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getSafeAuditErrorDetails } from '@/lib/security/audit-error-codes';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { analyzeNoteForCodes } from '@/lib/billing/code-analyzer';
import { AIGenerateNoteSchema, validateRequest } from '@/lib/validation/schemas';
import { getPatientLatestVitals, type LatestVitals } from '@/lib/data/vitals';
import {
    getPatientContextForAI,
    formatPatientContextForPrompt,
} from '@/lib/data/patient-context';



function buildVitalsContext(vitals: LatestVitals | null): string {
    if (!vitals) {
        return 'Vitals recorded: [Not recorded at this encounter]';
    }
    const bp =
        vitals.bp_systolic != null && vitals.bp_diastolic != null
            ? `${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg`
            : '[Not recorded]';
    const hr = vitals.heart_rate != null ? `${vitals.heart_rate} bpm` : '[Not recorded]';
    const temp =
        vitals.temperature != null
            ? `${vitals.temperature}°${vitals.temperature_unit || 'F'}`
            : '[Not recorded]';
    const rr =
        vitals.respiratory_rate != null
            ? `${vitals.respiratory_rate} breaths/min`
            : '[Not recorded]';
    const bmi = vitals.bmi != null ? `${vitals.bmi} kg/m²` : '[Not recorded]';
    const recordedAt = vitals.recorded_at || '[Not applicable]';

    return [
        'Vitals recorded:',
        `- Blood pressure: ${bp}`,
        `- Heart rate: ${hr}`,
        `- Temperature: ${temp}`,
        `- Respiratory rate: ${rr}`,
        `- BMI: ${bmi}`,
        `- Recorded at: ${recordedAt}`,
    ].join('\n');
}

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    // Parse body once (request.json() can only be called once)
    const body = await context.request.json();

    try {
        // Validate input with Zod schema (enforces 50K char limit)
        const validation = validateRequest(AIGenerateNoteSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { clinicianInput, selectedPhrases, templateId, templateFormat, patientId, encounterId } = validation.data;

        // Require at least some input
        if (!clinicianInput && Object.keys(selectedPhrases).length === 0) {
            return NextResponse.json(
                { error: 'Please provide input text or select preset phrases' },
                { status: 400 }
            );
        }

        // Build context from phrase selections
        const phraseContext = Object.entries(selectedPhrases || {})
            .filter(([_, phrases]) => phrases && phrases.length > 0)
            .map(([section, phrases]) => `${section}: ${phrases.join(', ')}`)
            .join('\n');

        // Combine all input for the AI
        const fullInput = [
            clinicianInput ? `Clinician Notes: ${clinicianInput}` : '',
            phraseContext ? `Selected Observations:\n${phraseContext}` : ''
        ].filter(Boolean).join('\n\n');

        // Log AI clinical note generation - highly sensitive PHI
        await logAuditEvent({
            eventType: 'NOTE_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_generate_note',
            details: {
                action: 'AI_CLINICAL_NOTE_GENERATION',
                templateId,
                templateFormat,
                inputLength: fullInput.length,
                phraseCount: Object.values(selectedPhrases || {}).flat().length,
            },
            phiAccessed: true, // Clinical notes are PHI
            riskLevel: 'MEDIUM',
        });

        // Fetch real vitals + patient context in parallel so the AI doesn't
        // have to invent them. If no patientId is provided, both blocks are
        // omitted and the prompt falls back to the pre-existing placeholder
        // behavior for vitals.
        let vitalsContext: string | undefined;
        let patientContext: string | undefined;
        let activeProblemIcd10: Array<{ code: string; description: string; source: 'active_problem' }> = [];
        if (patientId) {
            const orgId = context.user.organizationId || undefined;
            const [vitals, patientCtx] = await Promise.all([
                getPatientLatestVitals(patientId, encounterId),
                orgId ? getPatientContextForAI(patientId, orgId) : Promise.resolve(null),
            ]);
            vitalsContext = buildVitalsContext(vitals);
            if (patientCtx) {
                patientContext = formatPatientContextForPrompt(patientCtx);
                // A patient can have multiple patient_problems rows with the
                // same icd10_code (e.g. the same diagnosis recorded in two
                // encounters). Keep only the first occurrence per code so a
                // single chip surfaces, preserving its description.
                const seenCodes = new Set<string>();
                activeProblemIcd10 = [];
                for (const p of patientCtx.problems) {
                    const code = p.icd10_code?.trim().toUpperCase();
                    if (!code || seenCodes.has(code)) continue;
                    seenCodes.add(code);
                    activeProblemIcd10.push({
                        code,
                        description: p.problem,
                        source: 'active_problem' as const,
                    });
                }
            }
        }

        // Prepare session data for AI
        const sessionData = {
            subjective: selectedPhrases?.['Subjective']?.join('. ') || clinicianInput || '',
            objective: selectedPhrases?.['Objective']?.join('. ') || '',
            symptoms: [
                ...(selectedPhrases?.['Subjective'] || []),
                ...(selectedPhrases?.['Objective'] || [])
            ],
            assessment: selectedPhrases?.['Assessment']?.join('. ') || '',
            vitalsContext,
            patientContext,
        };

        // Generate with AI (will use Azure OpenAI or demo fallback)
        const generatedNote = await safeAzureOpenAI.generateSOAPNote(sessionData);

        // If AI returned a single string, parse it into sections
        let sections: Record<string, string> = {};

        if (typeof generatedNote === 'string') {
            if (templateFormat === 'soap') {
                // Parse SOAP sections from generated text. Headers must be on
                // their own line (`^...$` with `/m`) so prose containing
                // "plan" or "assessment" isn't misread as a header boundary.
                // `(?![\s\S])` = end of string (JS has no \Z).
                const subjMatch = generatedNote.match(/^\s*\*?\*?SUBJECTIVE\*?\*?\s*:?\s*$([\s\S]*?)(?=^\s*\*?\*?OBJECTIVE\*?\*?\s*:?\s*$|(?![\s\S]))/im);
                const objMatch = generatedNote.match(/^\s*\*?\*?OBJECTIVE\*?\*?\s*:?\s*$([\s\S]*?)(?=^\s*\*?\*?ASSESSMENT\*?\*?\s*:?\s*$|(?![\s\S]))/im);
                const assMatch = generatedNote.match(/^\s*\*?\*?ASSESSMENT\*?\*?\s*:?\s*$([\s\S]*?)(?=^\s*\*?\*?PLAN\*?\*?\s*:?\s*$|(?![\s\S]))/im);
                const planMatch = generatedNote.match(/^\s*\*?\*?PLAN\*?\*?\s*:?\s*$([\s\S]*?)(?![\s\S])/im);

                sections = {
                    subjective: (subjMatch?.[1] || sessionData.subjective).trim(),
                    objective: (objMatch?.[1] || sessionData.objective).trim(),
                    assessment: (assMatch?.[1] || sessionData.assessment).trim(),
                    plan: (planMatch?.[1] || 'Continue current treatment plan. Follow up as scheduled.').trim()
                };
            } else {
                sections = { content: generatedNote };
            }
        }

        // Keyword-match against clinician-authored input (raw dictation +
        // selected preset phrases), NOT the AI-generated output. Running the
        // matcher over AI prose lets hallucinated keywords ("major depressive
        // disorder", "suicidal ideation") drive code suggestions — exactly
        // the failure mode the 2026-04-18 grounding fix closed. The text the
        // clinician OWNS is the only reliable input surface for this.
        const codeAnalysis = analyzeNoteForCodes({ fullContent: fullInput }, {
            templateType: templateFormat,
            maxCPT: 4,
            maxICD10: 5
        });

        // Merge active-problem ICD-10 codes with keyword-matched codes. When a
        // code is present in both sources, active_problem wins (grounded in
        // persistent patient record rather than a single dictation). Both
        // sides are trimmed+uppercased so " e11.9 " and "E11.9" dedup.
        const activeProblemCodeSet = new Set(
            activeProblemIcd10.map((c) => c.code.trim().toUpperCase()),
        );
        const inputIcd10: Array<{ code: string; description: string; source: 'clinician_input' }> =
            codeAnalysis.icd10Details
                .map((c) => ({ ...c, code: c.code.trim().toUpperCase() }))
                .filter((c) => !activeProblemCodeSet.has(c.code))
                .map((c) => ({
                    code: c.code,
                    description: c.title,
                    source: 'clinician_input' as const,
                }));

        const suggestedCodes = {
            cpt: codeAnalysis.cptDetails.map((c) => ({
                code: c.code.trim().toUpperCase(),
                description: c.title,
                source: 'clinician_input' as const,
            })),
            icd10: [...activeProblemIcd10, ...inputIcd10],
        };

        return NextResponse.json({
            success: true,
            sections,
            suggestedCodes,
            isDemo: !safeAzureOpenAI.isAvailable(),
            inputUsed: {
                hasClinicianInput: !!clinicianInput,
                phraseCount: Object.values(selectedPhrases || {}).flat().length
            }
        });

    } catch (error: unknown) {
        if (error instanceof AIProviderUnavailableError) {
            // Production fail-closed: never return clinical content when the AI
            // provider is down. Audit details intentionally omit transcript /
            // patient identifiers / prompt body — only the upstream failure
            // marker and route are recorded.
            await logAuditEvent({
                eventType: 'API_ERROR',
                userId: context.user.id,
                userEmail: context.user.email,
                organizationId: context.user.organizationId || undefined,
                ipAddress,
                userAgent,
                resourceType: 'clinical_note',
                details: {
                    action: 'AI_PROVIDER_UNAVAILABLE',
                    upstream: error.upstream,
                    route: '/api/ai/generate-note',
                },
                phiAccessed: false,
                riskLevel: 'MEDIUM',
            });

            return NextResponse.json(
                {
                    error: 'AI provider temporarily unavailable',
                    code: error.code,
                    upstream: error.upstream,
                    retryable: true,
                },
                { status: 503 }
            );
        }

        logError({
            action: 'ai_generate_note_error',
            error: sanitizeError(error),
            resourceType: 'ai_generate_note',
            userId: context.user.id,
        });
        const { errorCode, errorStatus } = getSafeAuditErrorDetails(error);

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_generate_note',
            details: { errorCode, errorStatus },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json(
            { error: 'Failed to generate clinical note' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
