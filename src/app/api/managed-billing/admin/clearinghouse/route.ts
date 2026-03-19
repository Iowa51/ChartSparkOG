/**
 * Clearinghouse Configuration API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * GET/PUT /api/managed-billing/admin/clearinghouse - Super Admin only
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import {
    getAllClearinghouseConfigs,
    updateClearinghouseConfig
} from '@/lib/managed-billing/clearinghouse-service';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handleGet(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const configs = await getAllClearinghouseConfigs();

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'clearinghouse_config',
            details: { action: 'CLEARINGHOUSE_CONFIG_VIEW', recordCount: configs?.length || 0 },
            phiAccessed: false,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ configs });
    } catch (error) {
        logError({ action: 'CLEARINGHOUSE_CONFIG_GET_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to get configs' }, { status: 500 });
    }
}

async function handlePut(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const config = await context.request.json();
        const result = await updateClearinghouseConfig(config);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'clearinghouse_config',
            details: { action: 'CLEARINGHOUSE_CONFIG_UPDATE', clearinghouse: config.clearinghouse },
            phiAccessed: false,
            riskLevel: 'HIGH',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({ action: 'CLEARINGHOUSE_CONFIG_PUT_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requiredRole: ['SUPER_ADMIN'], requireMFA: true });
export const PUT = withAuth(handlePut, { requiredRole: ['SUPER_ADMIN'], requireMFA: true });
