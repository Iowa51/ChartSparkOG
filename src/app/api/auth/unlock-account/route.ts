// src/app/api/auth/unlock-account/route.ts
// Admin endpoint to unlock a locked user account

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { z } from 'zod';
import { validateRequest, UUIDSchema } from '@/lib/validation/schemas';

const UnlockAccountSchema = z.object({
    userId: UUIDSchema,
});

async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const rawData = await context.request.json();

        const validation = validateRequest(UnlockAccountSchema, rawData);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { userId } = validation.data;

        const adminClient = createServiceRoleClient();
        if (!adminClient) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        // Verify the target user exists and get their org
        const { data: targetUser, error: fetchError } = await adminClient
            .from('users')
            .select('id, email, organization_id, is_active')
            .eq('id', userId)
            .single();

        if (fetchError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Non-super-admins can only unlock users in their own org
        if (context.user.role !== 'SUPER_ADMIN' && targetUser.organization_id !== context.user.organizationId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Unlock: set is_active to true
        const { error: updateError } = await adminClient
            .from('users')
            .update({ is_active: true })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Reset failed login attempts
        const { error: resetError } = await adminClient
            .from('login_attempts')
            .delete()
            .eq('email', targetUser.email);

        if (resetError) {
            // Non-fatal: log but continue
            logError({ action: 'UNLOCK_RESET_ATTEMPTS_ERROR', error: sanitizeError(resetError) });
        }

        // Log the unlock action
        logAuditEventAsync({
            eventType: 'USER_DEACTIVATED', // closest event type for account status change
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'user',
            resourceId: userId,
            details: { action: 'unlock_account', targetEmail: targetUser.email },
            phiAccessed: false,
            riskLevel: 'HIGH',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({
            action: 'UNLOCK_ACCOUNT_ERROR',
            error: sanitizeError(error),
        });
        return NextResponse.json({ error: 'Failed to unlock account' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
});
