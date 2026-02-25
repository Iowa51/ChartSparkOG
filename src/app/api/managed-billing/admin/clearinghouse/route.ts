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

async function handleGet(context: AuthContext) {
    try {
        const configs = await getAllClearinghouseConfigs();
        return NextResponse.json({ configs });
    } catch (error) {
        logError({ action: 'CLEARINGHOUSE_CONFIG_GET_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to get configs' }, { status: 500 });
    }
}

async function handlePut(context: AuthContext) {
    try {
        const config = await context.request.json();
        const result = await updateClearinghouseConfig(config);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({ action: 'CLEARINGHOUSE_CONFIG_PUT_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requiredRole: ['SUPER_ADMIN'] });
export const PUT = withAuth(handlePut, { requiredRole: ['SUPER_ADMIN'] });
