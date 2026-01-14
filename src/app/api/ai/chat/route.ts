// src/app/api/ai/chat/route.ts
// SEC-004: Secured AI chat endpoint with authentication and validation

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

async function handler(context: AuthContext) {
    try {
        const body = await context.request.json();
        const { message, conversationHistory = [] } = body;

        // Basic validation
        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string' },
                { status: 400 }
            );
        }

        if (message.length > 8000) {
            return NextResponse.json(
                { error: 'Message too long (max 8000 characters)' },
                { status: 400 }
            );
        }

        if (!Array.isArray(conversationHistory) || conversationHistory.length > 50) {
            return NextResponse.json(
                { error: 'Invalid conversation history' },
                { status: 400 }
            );
        }

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const response = await safeAzureOpenAI.chat(message, conversationHistory);

        return NextResponse.json({
            response,
            isDemo: !safeAzureOpenAI.isAvailable(),
            timestamp: new Date().toISOString()
        });

    } catch (error: unknown) {
        console.error('Error in AI chat API:', error);
        return NextResponse.json(
            { error: 'Failed to get AI response' },
            { status: 500 }
        );
    }
}

// SEC-004: Export with authentication - requires login and AI feature
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requiredFeature: 'AI_NOTE_GENERATION',
});
