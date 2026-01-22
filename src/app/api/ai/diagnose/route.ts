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

        // Use Azure OpenAI wrapper
        const result = await safeAzureOpenAI.diagnose(sessionNotes, specialty);

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error('Error in diagnose API:', error);

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
