// src/app/api/ai/recommendations/route.ts
// SEC-004: Secured AI recommendations endpoint with authentication

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

async function handler(context: AuthContext) {
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

        // Use generateTreatmentPlan which provides recommendations
        const result = await safeAzureOpenAI.generateTreatmentPlan(patientProfile, [diagnosis]);

        return NextResponse.json({
            success: true,
            recommendations: result
        });

    } catch (error: unknown) {
        console.error('Error in recommendations API:', error);
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
    requiredFeature: 'AI_DIAGNOSIS',
});
