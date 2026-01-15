// src/app/api/test-azure/route.ts
// SEC-003: Protected Azure OpenAI health check endpoint
// Restricted to SUPER_ADMIN only

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext, isSuperAdmin } from '@/lib/auth/api-auth';
import azureOpenAIService from '@/services/azureOpenAIService';

// Prevent static generation - this route requires runtime environment
export const dynamic = 'force-dynamic';

interface TestAzureContext extends AuthContext {
    // No additional context needed
}

// Health check handler - SUPER_ADMIN only
async function handleTestAzure(context: TestAzureContext): Promise<NextResponse> {
    const { user } = context;

    // Double-check SUPER_ADMIN (withAuth already validates, but defense in depth)
    if (!isSuperAdmin(user)) {
        return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    try {
        // Simple health check with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await azureOpenAIService.chat(
            "Respond with exactly: 'Azure OpenAI connection verified'",
            []
        );

        clearTimeout(timeoutId);

        // Return safe health response - no PHI, no sensitive data
        return NextResponse.json({
            success: true,
            status: 'healthy',
            service: 'Azure OpenAI',
            timestamp: new Date().toISOString(),
            // Only metadata, not actual response content
            responseLength: response?.length || 0,
        });
    } catch (error) {
        // Don't log error details that could contain sensitive info
        console.error('[test-azure] Health check failed');

        return NextResponse.json({
            success: false,
            status: 'unhealthy',
            service: 'Azure OpenAI',
            timestamp: new Date().toISOString(),
            error: 'Connection failed - check Azure configuration'
        }, { status: 503 });
    }
}

// Wrap with auth - SUPER_ADMIN only
export const GET = withAuth(handleTestAzure, {
    requiredRole: ['SUPER_ADMIN'],
});

// Also protect POST for backwards compatibility
export const POST = withAuth(handleTestAzure, {
    requiredRole: ['SUPER_ADMIN'],
});
