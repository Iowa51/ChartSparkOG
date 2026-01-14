// src/app/api/ai/treatment-plan/route.ts
// SEC-004: Secured AI treatment plan endpoint with authentication

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

async function handler(context: AuthContext) {
    try {
        const body = await context.request.json();
        const { patientProfile, diagnoses } = body;

        // Validation
        if (!patientProfile || !diagnoses) {
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

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const result = await safeAzureOpenAI.generateTreatmentPlan(patientProfile, diagnoses);

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error('Error in treatment plan API:', error);
        return NextResponse.json(
            { error: 'Failed to generate treatment plan' },
            { status: 500 }
        );
    }
}

// SEC-004: Export with authentication
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requiredFeature: 'AI_TREATMENT',
});
