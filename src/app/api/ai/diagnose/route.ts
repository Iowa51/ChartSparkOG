import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { AIDiagnoseSchema, validateRequest } from '@/lib/validation/schemas';

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();

        // Validate input with Zod schema
        const validation = validateRequest(AIDiagnoseSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { sessionNotes, specialty } = validation.data;

        // Log AI PHI processing - patient clinical data sent to AI
        await logAuditEvent({
            eventType: 'NOTE_VIEW', // AI is processing clinical notes
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_diagnose',
            details: {
                specialty,
                inputLength: sessionNotes.length,
                action: 'AI_DIAGNOSIS_GENERATION',
            },
            phiAccessed: true, // Clinical notes contain PHI
            riskLevel: 'MEDIUM',
        });

        // Use Azure OpenAI wrapper
        const result = await safeAzureOpenAI.diagnose(sessionNotes, specialty);

        return NextResponse.json(result);

    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logError({ action: 'AI_DIAGNOSE_ERROR', error: sanitizeError(error) });

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_diagnose',
            details: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        // Map known error patterns to user-friendly messages without exposing internals
        if (errorMsg.includes('not configured')) {
            return NextResponse.json(
                { error: 'Azure OpenAI is not configured. Please set up your API credentials.' },
                { status: 503 }
            );
        }

        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Azure OpenAI authentication failed. Please check your API key.' },
                { status: 401 }
            );
        }

        if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'AI analysis failed. Please try again.' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
