/**
 * Clearinghouse Configuration API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * GET/PUT /api/managed-billing/admin/clearinghouse - Super Admin only
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import {
    getAllClearinghouseConfigs,
    updateClearinghouseConfig
} from '@/lib/managed-billing/clearinghouse-service';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

// SEC-PT5-F8: Zod schema for clearinghouse config update — whitelist fields,
// explicitly exclude api_endpoint to prevent clearinghouse redirection.
const ClearinghouseConfigUpdateSchema = z.object({
    clearinghouse: z.string().min(1).max(100),
    is_active: z.boolean().optional(),
    environment: z.enum(['production', 'test']).optional(),
    api_key_encrypted: z.string().optional(),
    api_secret_encrypted: z.string().optional(),
    sftp_host: z.string().max(255).optional(),
    sftp_port: z.number().int().min(1).max(65535).optional(),
    sftp_username: z.string().max(255).optional(),
    sftp_password_encrypted: z.string().optional(),
    submitter_id: z.string().max(100).optional(),
    submitter_name: z.string().max(255).optional(),
    submitter_npi: z.string().max(20).optional(),
    submitter_tax_id: z.string().max(20).optional(),
}).strict();

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
        const rawConfig = await context.request.json();

        // SEC-PT5-F8: Validate against strict schema — rejects unknown fields (including api_endpoint)
        const parsed = ClearinghouseConfigUpdateSchema.safeParse(rawConfig);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
        }
        const config = parsed.data;

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
