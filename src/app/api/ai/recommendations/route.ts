// src/app/api/ai/recommendations/route.ts
// SEC-004: Secured AI recommendations endpoint with authentication
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
        console.error('Error in recommendations API:', error);

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_recommendations',
            details: { error: error instanceof Error ? error.message : 'Unknown' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to generate recommendations: ' + message },
            { status: 500 }
        );
    }
}

// SEC-004: Export with authentication
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
