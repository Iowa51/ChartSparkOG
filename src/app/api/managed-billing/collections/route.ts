/**
 * Collections API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * GET /api/managed-billing/collections - Get collection summary
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { getCollectionSummary } from '@/lib/managed-billing/collection-service';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handleGet(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const summary = await getCollectionSummary(context.user.organizationId!);

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'collection_summary',
            details: { action: 'COLLECTIONS_VIEW' },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json(summary);
    } catch (error) {
        logError({ action: 'COLLECTIONS_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
