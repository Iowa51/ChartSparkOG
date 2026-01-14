// src/app/api/ai/diagnose/route.ts
// SEC-004: Secured AI diagnose endpoint with authentication

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

async function handler(context: AuthContext) {
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

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const result = await safeAzureOpenAI.diagnose(sessionNotes, specialty);

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error('Error in diagnose API:', error);
        return NextResponse.json(
            { error: 'Failed to analyze clinical notes' },
            { status: 500 }
        );
    }
}

// SEC-004: Export with authentication
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requiredFeature: 'AI_DIAGNOSIS',
});
