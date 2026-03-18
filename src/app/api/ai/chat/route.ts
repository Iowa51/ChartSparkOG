import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { AIChatSchema, validateRequest } from '@/lib/validation/schemas';

async function handler(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();

        // Validate input with Zod schema
        const validation = validateRequest(AIChatSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { message, conversationHistory } = validation.data;

        if (!Array.isArray(conversationHistory) || conversationHistory.length > 50) {
            return NextResponse.json(
                { error: 'Invalid conversation history' },
                { status: 400 }
            );
        }

        // Log AI chat - may contain PHI in questions
        await logAuditEvent({
            eventType: 'AI_CHAT_REQUEST', // F-024: Use correct AI-specific audit type
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
    requireMFA: true,
});
