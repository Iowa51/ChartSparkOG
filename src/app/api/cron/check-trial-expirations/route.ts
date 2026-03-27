/**
 * Check Trial Expirations Cron Job
 * POST /api/cron/check-trial-expirations
 * 
 * SEC-REMEDIATION: Secured with mandatory CRON_SECRET validation
 * Run daily to check and update expired trial subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, logInfo, logWarn, sanitizeError } from '@/lib/logging/safe-logger';
import { isValidBearerSecret } from '@/lib/security/timing-safe';

/**
 * Validate cron secret - fails CLOSED in production
 */
function validateCronSecret(request: NextRequest): { valid: boolean; error?: string } {
    const cronSecret = process.env.CRON_SECRET;

    // SEC-PT2-F5: CRON_SECRET required in ALL environments — fail closed
    if (!cronSecret) {
        logError({ action: 'CRON_SECRET_NOT_SET', error: 'CRON_SECRET must be configured in all environments' });
        return { valid: false, error: 'CRON_SECRET not configured' };
    }

    // Verify authorization header
    const authHeader = request.headers.get('authorization');
    if (!isValidBearerSecret(authHeader, cronSecret)) {
        return { valid: false, error: 'Unauthorized' };
    }

    return { valid: true };
}

export async function POST(request: NextRequest) {
    try {
        // SEC-REMEDIATION: Validate cron secret FIRST
        const { valid, error } = validateCronSecret(request);
        if (!valid) {
            return NextResponse.json({ error }, { status: 401 });
        }

        // SEC-REMEDIATION: Use service role client for cron operations
        const supabase = createServiceRoleClient();

        if (!supabase) {
            logWarn({ action: 'CRON_TRIAL_NO_DATABASE', status: 'demo_mode' });
            return NextResponse.json({ success: true, expired: 0, demo: true });
        }

        const now = new Date().toISOString();

        // Find expired trials
        const { data: expiredTrials, error: queryError } = await supabase
            .from('organization_subscriptions')
            .select('id, organization_id')
            .eq('status', 'trialing')
            .lt('trial_ends_at', now);

        if (queryError) {
            logError({ action: 'CRON_QUERY_ERROR', error: sanitizeError(queryError) });
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!expiredTrials || expiredTrials.length === 0) {
            return NextResponse.json({ success: true, expired: 0 });
        }

        // Update to expired status
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        let updatedCount = 0;
        for (const trial of expiredTrials) {
            const { error: updateError } = await supabase
                .from('organization_subscriptions')
                .update({
                    status: 'expired',
                    read_only_started_at: now,
                    deletion_scheduled_at: thirtyDaysFromNow.toISOString(),
                })
                .eq('id', trial.id);

            if (!updateError) {
                updatedCount++;
            }
        }

        logInfo({ action: 'CRON_TRIAL_EXPIRATIONS_PROCESSED', count: updatedCount });

        return NextResponse.json({
            success: true,
            expired: updatedCount,
        });
    } catch (error) {
        logError({ action: 'CRON_CHECK_TRIALS_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
