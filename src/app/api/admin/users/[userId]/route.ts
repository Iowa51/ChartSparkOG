/**
 * Admin User Management API
 * SEC-PT6-F7: Server-side user modifications with audit logging.
 * Replaces client-side direct Supabase mutations from admin/users page.
 * PATCH /api/admin/users/[userId]
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

// Explicit field whitelist — only these fields can be modified
const AdminUserUpdateSchema = z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    specialty: z.string().max(100).optional(),
    is_active: z.boolean().optional(),
}).strict();

async function handlePatch(context: AuthContext) {
    try {
        const userId = context.params?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        const rawBody = await context.request.json();
        const parsed = AdminUserUpdateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
        }

        const updates = parsed.data;
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        // Verify target user is in the same organization
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('id, organization_id, role')
            .eq('id', userId)
            .single();

        if (fetchError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (targetUser.organization_id !== context.user.organizationId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Perform the update
        const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .eq('organization_id', context.user.organizationId);

        if (updateError) {
            logError({ action: 'ADMIN_USER_UPDATE_ERROR', error: sanitizeError(updateError) });
            return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
        }

        // SEC-PT6-F7: Audit log for every admin user modification
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        await logAuditEvent({
            eventType: updates.is_active === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'user',
            resourceId: userId,
            details: {
                action: 'ADMIN_USER_UPDATE',
                fields_updated: Object.keys(updates),
                target_user_role: targetUser.role,
            },
            phiAccessed: false,
            riskLevel: updates.is_active !== undefined ? 'HIGH' : 'MEDIUM',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({ action: 'ADMIN_USER_UPDATE_EXCEPTION', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export const PATCH = withAuth(handlePatch, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
