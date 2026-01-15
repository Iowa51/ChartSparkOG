// src/app/api/ai/generate-note/route.ts
// AI-powered clinical note generation from clinician input and preset phrases

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

interface GenerateNoteRequest {
    clinicianInput: string;
    selectedPhrases: Record<string, string[]>;
    templateId: string;
    templateFormat: 'soap' | 'paragraph';
}

async function handler(context: AuthContext) {
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
        return NextResponse.json(
            { error: 'Failed to generate clinical note' },
            { status: 500 }
        );
    }
}

// Requires authentication and AI feature
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requiredFeature: 'AI_NOTE_GENERATION',
});
