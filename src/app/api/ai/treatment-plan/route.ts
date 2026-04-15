import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getSafeAuditErrorDetails } from '@/lib/security/audit-error-codes';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { AITreatmentPlanSchema, validateRequest } from '@/lib/validation/schemas';

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();

        // F-025: Validate input with Zod schema
        // Support both patientData (from frontend) and patientProfile (legacy)
        const normalizedBody = {
            patientProfile: body.patientData || body.patientProfile,
            diagnoses: body.diagnoses,
        };

        const validation = validateRequest(AITreatmentPlanSchema, normalizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { patientProfile, diagnoses } = validation.data;

        // F-025: Audit event without PHI (patientName removed from details)
        await logAuditEvent({
            eventType: 'AI_TREATMENT_PLAN_REQUEST',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_treatment_plan',
            details: {
                action: 'AI_TREATMENT_PLAN_GENERATION',
                diagnosisCount: Array.isArray(diagnoses) ? diagnoses.length : 1,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        const result = await safeAzureOpenAI.generateTreatmentPlan(patientProfile, diagnoses);

        return NextResponse.json(result);

    } catch (error: unknown) {
        logError({ action: 'AI_TREATMENT_PLAN_ERROR', error: sanitizeError(error) });
        const { errorCode, errorStatus } = getSafeAuditErrorDetails(error);

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_treatment_plan',
            details: { errorCode, errorStatus },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json(
            { error: 'Failed to generate treatment plan' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
