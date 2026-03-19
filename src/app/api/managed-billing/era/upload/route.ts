/**
 * Upload ERA/835 File API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * POST /api/managed-billing/era/upload - Super Admin only
 */

import { NextResponse } from 'next/server';
import { processERAFile } from '@/lib/managed-billing/era-service';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handlePost(context: AuthContext) {
    try {
        const formData = await context.request.formData();
        const file = formData.get('file') as File;
        const organizationId = formData.get('organizationId') as string;

        if (!file || !organizationId) {
            return NextResponse.json(
                { error: 'File and organizationId required' },
                { status: 400 }
            );
        }

        const content = await file.text();
        const result = await processERAFile(organizationId, file.name, content);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        logAuditEventAsync({
            eventType: 'BILLING_RECORD_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: organizationId,
            ipAddress,
            userAgent,
            resourceType: 'era_file',
            details: { action: 'ERA_UPLOAD', fileName: file.name, matched: result.matched, unmatched: result.unmatched },
            phiAccessed: true,
            riskLevel: 'HIGH',
        });

        return NextResponse.json({
            success: true,
            matched: result.matched,
            unmatched: result.unmatched,
        });
    } catch (error) {
        logError({ action: 'ERA_UPLOAD_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to process ERA file' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, {
    requiredRole: ['SUPER_ADMIN'],
    requireMFA: true,
});
