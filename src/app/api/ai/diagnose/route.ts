// src/app/api/ai/diagnose/route.ts
// SEC-004: Secured AI diagnose endpoint with authentication
// SEC-009: HIPAA-compliant audit logging for AI PHI processing

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();
        const { sessionNotes, specialty = 'mental_health' } = body;

        // Validation
        if (!sessionNotes || typeof sessionNotes !== 'string') {
            return NextResponse.json(
                { error: 'Session notes are required' },
                { status: 400 }
            );
        }

        if (sessionNotes.length > 10000) {
            return NextResponse.json(
                { error: 'Session notes too long (max 10000 characters)' },
                { status: 400 }
            );
        }

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
        console.error('Error in diagnose API:', error);

        // Log the error
        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_diagnose',
            details: { error: error instanceof Error ? error.message : 'Unknown' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        // Provide more specific error messages
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('not configured')) {
            return NextResponse.json(
                { error: 'Azure OpenAI is not configured. Please set up your API credentials.' },
                { status: 503 }
            );
        }

        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Azure OpenAI authentication failed. Please check your API key.' },
                { status: 401 }
            );
        }

        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: `AI analysis failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}

// SEC-004: Export with authentication
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
