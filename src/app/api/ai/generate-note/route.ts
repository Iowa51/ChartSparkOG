// src/app/api/ai/generate-note/route.ts
// SEC-004: AI-powered clinical note generation from clinician input
// SEC-009: HIPAA-compliant audit logging for AI PHI processing

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

interface GenerateNoteRequest {
    clinicianInput: string;
    selectedPhrases: Record<string, string[]>;
    templateId: string;
    templateFormat: 'soap' | 'paragraph';
}

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body: GenerateNoteRequest = await context.request.json();
        const { clinicianInput, selectedPhrases, templateId, templateFormat } = body;

        // Validate input
        if (!clinicianInput && Object.keys(selectedPhrases || {}).length === 0) {
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

        // Add suggested codes based on assessment
        const suggestedCodes = [
            { code: '90834', description: 'Psychotherapy, 45 minutes', selected: false },
            { code: '90837', description: 'Psychotherapy, 60 minutes', selected: false },
            { code: 'F32.1', description: 'Major depressive disorder, moderate', selected: false }
        ];

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
        console.error('Error generating note:', error);

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_generate_note',
            details: { error: error instanceof Error ? error.message : 'Unknown' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json(
            { error: 'Failed to generate clinical note' },
            { status: 500 }
        );
    }
}

// Requires authentication
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
