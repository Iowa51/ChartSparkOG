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

        // Log AI chat - may contain PHI in questions
        await logAuditEvent({
            eventType: 'NOTE_VIEW', // User querying AI about clinical data
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_chat',
            details: {
                action: 'AI_CLINICAL_CHAT',
                messageLength: message.length,
                historyLength: conversationHistory.length,
            },
            phiAccessed: true, // Chat may contain patient information
            riskLevel: 'LOW',
        });

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const response = await safeAzureOpenAI.chat(message, conversationHistory);

        return NextResponse.json({
            response,
            isDemo: !safeAzureOpenAI.isAvailable(),
            timestamp: new Date().toISOString()
        });

    } catch (error: unknown) {
        logError({ action: 'AI_CHAT_ERROR', error: sanitizeError(error) });

        await logAuditEvent({
            eventType: 'API_ERROR',
            userId: context.user.id,
            userEmail: context.user.email,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'ai_chat',
            details: { error: error instanceof Error ? error.message : 'Unknown' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json(
            { error: 'Failed to get AI response' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
