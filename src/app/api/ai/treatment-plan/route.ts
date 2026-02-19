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
        // Support both patientData (from frontend) and patientProfile (legacy)
        const patientProfile = body.patientData || body.patientProfile;
        const { diagnoses } = body;

        // Validation
        if (!patientProfile || !diagnoses) {
            console.log('[Treatment Plan] Missing data:', { hasPatientProfile: !!patientProfile, hasDiagnoses: !!diagnoses, bodyKeys: Object.keys(body) });
            return NextResponse.json(
                { error: 'Patient profile and diagnoses are required' },
                { status: 400 }
            );
        }

        if (typeof patientProfile === 'string' && patientProfile.length > 5000) {
            return NextResponse.json(
                { error: 'Patient profile too long' },
                { status: 400 }
            );
        }

        // Log AI PHI processing - patient clinical data sent to AI
        await logAuditEvent({
            eventType: 'NOTE_CREATE', // Creating treatment plan
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_treatment_plan',
            details: {
                action: 'AI_TREATMENT_PLAN_GENERATION',
                patientName: patientProfile.name || 'Unknown',
                diagnosisCount: Array.isArray(diagnoses) ? diagnoses.length : 1,
            },
            phiAccessed: true, // Patient profile contains PHI
            riskLevel: 'MEDIUM',
        });

        // PHI removed from console logs — audit_logs captures access for HIPAA compliance
        console.log('[Treatment Plan] Generating plan (see audit_logs for details)');

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const result = await safeAzureOpenAI.generateTreatmentPlan(patientProfile, diagnoses);

        return NextResponse.json(result);

    } catch (error: unknown) {
        logError({ action: 'AI_TREATMENT_PLAN_ERROR', error: sanitizeError(error) });

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_treatment_plan',
            details: { error: error instanceof Error ? error.message : 'Unknown' },
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
});
