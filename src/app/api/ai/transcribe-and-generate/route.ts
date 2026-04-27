// AI-powered audio transcription + SOAP note generation endpoint
// Accepts multipart form data with an audio file, transcribes via Azure OpenAI Whisper,
// then generates a structured clinical note from the transcript.

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI, { AIProviderUnavailableError } from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getSafeAuditErrorDetails } from '@/lib/security/audit-error-codes';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { analyzeNoteForCodes } from '@/lib/billing/code-analyzer';

// Max audio file size: 25MB (Azure OpenAI Whisper limit)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = new Set([
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp3',
    'audio/flac',
    'audio/x-m4a',
]);

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        // Parse multipart form data
        const formData = await context.request.formData();
        const audioFile = formData.get('audio') as File | null;
        const templateFormat = (formData.get('templateFormat') as string) || 'soap';
        const selectedPhrasesRaw = formData.get('selectedPhrases') as string | null;
        const patientId = formData.get('patientId') as string | null;

        // Validate audio file presence
        if (!audioFile || !(audioFile instanceof File)) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Validate file size
        if (audioFile.size > MAX_AUDIO_SIZE) {
            return NextResponse.json(
                { error: `Audio file too large (max ${MAX_AUDIO_SIZE / 1024 / 1024}MB)` },
                { status: 400 }
            );
        }

        // Validate file type (permissive — browser MediaRecorder output may have generic types)
        const mimeType = audioFile.type || 'audio/webm';
        if (mimeType !== 'application/octet-stream' && !ALLOWED_AUDIO_TYPES.has(mimeType)) {
            return NextResponse.json(
                { error: `Unsupported audio format: ${mimeType}` },
                { status: 400 }
            );
        }

        // Parse selected phrases if provided
        let selectedPhrases: Record<string, string[]> = {};
        if (selectedPhrasesRaw) {
            try {
                selectedPhrases = JSON.parse(selectedPhrasesRaw);
            } catch {
                // Ignore malformed JSON — proceed without phrases
            }
        }

        // Audit log: transcription initiated (metadata only — no PHI)
        await logAuditEvent({
            eventType: 'NOTE_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_transcribe_and_generate',
            details: {
                action: 'AI_AUDIO_TRANSCRIPTION_INITIATED',
                audioSizeBytes: audioFile.size,
                audioType: mimeType,
                templateFormat,
                hasPatientId: !!patientId,
                phraseCount: Object.values(selectedPhrases).flat().length,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        // ── Step 1: Transcribe audio ──
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const transcriptionResult = await safeAzureOpenAI.transcribeAudio(audioBuffer, audioFile.name);

        const transcript = transcriptionResult.transcript;
        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json(
                { error: 'Transcription produced no text. Please try recording again with clearer audio.' },
                { status: 422 }
            );
        }

        // ── Step 2: Generate SOAP note from transcript ──
        // Build context from phrase selections + transcript
        const phraseContext = Object.entries(selectedPhrases)
            .filter(([_, phrases]) => phrases && phrases.length > 0)
            .map(([section, phrases]) => `${section}: ${phrases.join(', ')}`)
            .join('\n');

        const sessionData = {
            subjective: transcript,
            objective: selectedPhrases?.['Objective']?.join('. ') || '',
            symptoms: [
                ...(selectedPhrases?.['Subjective'] || []),
                ...(selectedPhrases?.['Objective'] || []),
            ],
            assessment: selectedPhrases?.['Assessment']?.join('. ') || '',
        };

        const generatedNote = await safeAzureOpenAI.generateSOAPNote(sessionData);

        // Parse into sections
        let sections: Record<string, string> = {};
        if (typeof generatedNote === 'string') {
            if (templateFormat === 'soap') {
                const subjMatch = generatedNote.match(/\*?\*?SUBJECTIVE\*?\*?\s*([\s\S]*?)(?=\*?\*?OBJECTIVE|$)/i);
                const objMatch = generatedNote.match(/\*?\*?OBJECTIVE\*?\*?\s*([\s\S]*?)(?=\*?\*?ASSESSMENT|$)/i);
                const assMatch = generatedNote.match(/\*?\*?ASSESSMENT\*?\*?\s*([\s\S]*?)(?=\*?\*?PLAN|$)/i);
                const planMatch = generatedNote.match(/\*?\*?PLAN\*?\*?\s*([\s\S]*?)$/i);

                sections = {
                    subjective: (subjMatch?.[1] || transcript).trim(),
                    objective: (objMatch?.[1] || '').trim(),
                    assessment: (assMatch?.[1] || '').trim(),
                    plan: (planMatch?.[1] || 'Continue current treatment plan. Follow up as scheduled.').trim(),
                };
            } else {
                sections = { content: generatedNote };
            }
        }

        // ── Step 3: Analyze for billing codes ──
        const noteForAnalysis = {
            subjective: sections.subjective || '',
            objective: sections.objective || '',
            assessment: sections.assessment || '',
            plan: sections.plan || '',
            fullContent: Object.values(sections).join(' '),
        };
        const codeAnalysis = analyzeNoteForCodes(noteForAnalysis, {
            templateType: templateFormat,
            maxCPT: 4,
            maxICD10: 5,
        });

        const suggestedCodes = {
            cpt: codeAnalysis.cpt,
            icd10: codeAnalysis.icd10,
            cptDetails: codeAnalysis.cptDetails,
            icd10Details: codeAnalysis.icd10Details,
        };

        return NextResponse.json({
            success: true,
            transcript,
            sections,
            suggestedCodes,
            isDemo: transcriptionResult.isDemo,
            transcriptionTime: transcriptionResult.processingTime,
        });

    } catch (error: unknown) {
        if (error instanceof AIProviderUnavailableError) {
            // Either Whisper or Azure OpenAI failed; the `upstream` field
            // identifies which phase. Production fail-closed: response body
            // contains NO transcript, NO sections, NO clinical content.
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
                    route: '/api/ai/transcribe-and-generate',
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
            action: 'ai_transcribe_and_generate_error',
            error: sanitizeError(error),
            resourceType: 'ai_transcribe_and_generate',
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
            resourceType: 'ai_transcribe_and_generate',
            details: { errorCode, errorStatus },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json(
            { error: 'Failed to transcribe and generate note' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
