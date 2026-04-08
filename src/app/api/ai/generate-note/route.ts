// AI-powered clinical note generation from clinician input

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getSafeAuditErrorDetails } from '@/lib/security/audit-error-codes';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { analyzeNoteForCodes } from '@/lib/billing/code-analyzer';
import { AIGenerateNoteSchema, validateRequest } from '@/lib/validation/schemas';



async function handler(context: AuthContext) {
    // Proxy to external scribe service if configured
    const scribeUrl = process.env.SCRIBE_SERVICE_URL;
    if (scribeUrl) {
        const body = await context.request.json();
        try {
            console.log("Proxying generate-note request to scribe sidecar:", scribeUrl);
            const proxyResponse = await fetch(`${scribeUrl}/api/ai/generate-note`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            console.log("Scribe generate-note proxy response status:", proxyResponse.status);
            const data = await proxyResponse.json();
            return NextResponse.json(data, { status: proxyResponse.status });
        } catch (error) {
            console.error("Scribe generate-note proxy failed:", error);
            return NextResponse.json(
                { success: false, error: "Note generation service unavailable" },
                { status: 503 }
            );
        }
    }

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

        const { clinicianInput, selectedPhrases, templateId, templateFormat } = validation.data;

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

        // Prepare session data for AI
        const sessionData = {
            subjective: selectedPhrases?.['Subjective']?.join('. ') || clinicianInput || '',
            objective: selectedPhrases?.['Objective']?.join('. ') || '',
            symptoms: [
                ...(selectedPhrases?.['Subjective'] || []),
                ...(selectedPhrases?.['Objective'] || [])
            ],
            assessment: selectedPhrases?.['Assessment']?.join('. ') || ''
        };

        // Generate with AI (will use Azure OpenAI or demo fallback)
        const generatedNote = await safeAzureOpenAI.generateSOAPNote(sessionData);

        // If AI returned a single string, parse it into sections
        let sections: Record<string, string> = {};

        if (typeof generatedNote === 'string') {
            if (templateFormat === 'soap') {
                // Parse SOAP sections from generated text
                const subjMatch = generatedNote.match(/\*?\*?SUBJECTIVE\*?\*?\s*([\s\S]*?)(?=\*?\*?OBJECTIVE|$)/i);
                const objMatch = generatedNote.match(/\*?\*?OBJECTIVE\*?\*?\s*([\s\S]*?)(?=\*?\*?ASSESSMENT|$)/i);
                const assMatch = generatedNote.match(/\*?\*?ASSESSMENT\*?\*?\s*([\s\S]*?)(?=\*?\*?PLAN|$)/i);
                const planMatch = generatedNote.match(/\*?\*?PLAN\*?\*?\s*([\s\S]*?)$/i);

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

        // Dynamically analyze generated note content for relevant billing codes
        const noteForAnalysis = {
            subjective: sections.subjective || '',
            objective: sections.objective || '',
            assessment: sections.assessment || '',
            plan: sections.plan || '',
            fullContent: Object.values(sections).join(' ')
        };
        const codeAnalysis = analyzeNoteForCodes(noteForAnalysis, {
            templateType: templateFormat,
            maxCPT: 4,
            maxICD10: 5
        });

        const suggestedCodes = {
            cpt: codeAnalysis.cpt,
            icd10: codeAnalysis.icd10,
            // Include full details so frontend can display descriptions
            cptDetails: codeAnalysis.cptDetails,
            icd10Details: codeAnalysis.icd10Details
        };

        return NextResponse.json({
            success: true,
            sections,
            suggestedCodes,
            isDemo: !safeAzureOpenAI.isAvailable(),
            inputUsed: {
                hasClinicalInput: !!clinicianInput,
                phraseCount: Object.values(selectedPhrases || {}).flat().length
            }
        });

    } catch (error: unknown) {
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
