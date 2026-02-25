/**
 * Check Trial Expirations Cron Job
 * POST /api/cron/check-trial-expirations
 * 
 * SEC-REMEDIATION: Secured with mandatory CRON_SECRET validation
 * Run daily to check and update expired trial subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

/**
 * Validate cron secret - fails CLOSED in production
 */
function validateCronSecret(request: NextRequest): { valid: boolean; error?: string } {
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    // SEC-REMEDIATION: In production, CRON_SECRET is REQUIRED
    if (isProduction && !cronSecret) {
        logError({ action: 'SECURITY_CRON_SECRET_NOT_SET_IN_PRODUCTION', error: 'SECURITY: CRON_SECRET not set in production' });
        return { valid: false, error: 'Server configuration error' };
    }

    // In development without secret, allow for testing
    if (!cronSecret) {
        console.warn('[Cron] CRON_SECRET not set - allowing in development');
        return { valid: true };
    }

    // Verify authorization header
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (providedSecret !== cronSecret) {
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
            console.warn('[Cron] No database - running in demo mode');
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

        console.log(`[Cron] Expired ${updatedCount} trial subscriptions`);

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
