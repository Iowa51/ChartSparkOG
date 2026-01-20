// src/app/api/ai/treatment-plan/route.ts
// SEC-004: Secured AI treatment plan endpoint with authentication

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

async function handler(context: AuthContext) {
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

        console.log('[Treatment Plan] Generating plan for:', patientProfile.name || 'Unknown patient');

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

// SEC-004: Export with authentication (removed AI_TREATMENT feature requirement for demo mode)
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    // requiredFeature: 'AI_TREATMENT', // Disabled for demo mode
});
