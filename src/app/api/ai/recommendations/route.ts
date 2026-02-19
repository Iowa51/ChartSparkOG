import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();
        const { diagnosis, symptoms, history, previousTreatments } = body;

        // Validation
        if (!diagnosis || !symptoms) {
            return NextResponse.json(
                { error: 'Diagnosis and symptoms are required' },
                { status: 400 }
            );
        }

        if (typeof diagnosis === 'string' && diagnosis.length > 2000) {
            return NextResponse.json(
                { error: 'Diagnosis too long' },
                { status: 400 }
            );
        }

        // Build patient profile from the provided context
        const patientProfile = {
            symptoms,
            history: history || 'No history provided',
            previousTreatments: previousTreatments || 'None noted'
        };

        // Log AI PHI processing - patient clinical data sent to AI
        await logAuditEvent({
            eventType: 'NOTE_VIEW', // AI is processing patient data
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_recommendations',
            details: {
                action: 'AI_TREATMENT_RECOMMENDATIONS',
                hasDiagnosis: !!diagnosis,
                hasHistory: !!history,
            },
            phiAccessed: true, // Diagnosis and symptoms are PHI
            riskLevel: 'MEDIUM',
        });

        // Use generateTreatmentPlan which provides recommendations
        const result = await safeAzureOpenAI.generateTreatmentPlan(patientProfile, [diagnosis]);

        return NextResponse.json({
            success: true,
            recommendations: result
        });

    } catch (error: unknown) {
        logError({ action: 'AI_RECOMMENDATIONS_ERROR', error: sanitizeError(error) });

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_recommendations',
            details: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json(
            { error: 'Failed to generate recommendations' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
