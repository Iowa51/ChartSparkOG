/**
 * Cleanup Expired Telehealth Tokens Cron Job
 * POST /api/cron/cleanup-telehealth-tokens
 *
 * SEC-PT4-F7: HIPAA data minimization — delete used/expired tokens
 * that contain encrypted PHI (room URLs, meeting tokens).
 * Runs daily. Requires CRON_SECRET in all environments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, logInfo, sanitizeError } from '@/lib/logging/safe-logger';
import { isValidBearerSecret } from '@/lib/security/timing-safe';

function validateCronSecret(request: NextRequest): { valid: boolean; error?: string } {
    const cronSecret = process.env.CRON_SECRET;

    // SEC-PT2-F5: CRON_SECRET required in ALL environments — fail closed
    if (!cronSecret) {
        logError({ action: 'CRON_SECRET_NOT_SET', error: 'CRON_SECRET must be configured in all environments' });
        return { valid: false, error: 'CRON_SECRET not configured' };
    }

    const authHeader = request.headers.get('authorization');
    if (!isValidBearerSecret(authHeader, cronSecret)) {
        return { valid: false, error: 'Unauthorized' };
    }

    return { valid: true };
}

export async function POST(request: NextRequest) {
    try {
        const { valid, error } = validateCronSecret(request);
        if (!valid) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const supabase = createServiceRoleClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        // Delete tokens that are used AND expired for > 24 hours
        const { data, error: deleteError } = await supabase
            .from('telehealth_session_tokens')
            .delete()
            .eq('used', true)
            .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .select('id');

        if (deleteError) {
            logError({ action: 'TELEHEALTH_TOKEN_CLEANUP_ERROR', error: sanitizeError(deleteError) });
            return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
        }

        const deletedCount = data?.length ?? 0;
        logInfo({ action: 'TELEHEALTH_TOKEN_CLEANUP_SUCCESS', status: `deleted_${deletedCount}_tokens` });

        return NextResponse.json({ success: true, deletedCount });
    } catch (error) {
        logError({ action: 'TELEHEALTH_TOKEN_CLEANUP_EXCEPTION', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
