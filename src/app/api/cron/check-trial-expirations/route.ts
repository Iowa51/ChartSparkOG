/**
 * Check Trial Expirations Cron Job
 * POST /api/cron/check-trial-expirations
 * 
 * Run daily to check and update expired trial subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const now = new Date().toISOString();

        // Find expired trials
        const { data: expiredTrials } = await supabase
            .from('organization_subscriptions')
            .select('id, organization_id')
            .eq('status', 'trialing')
            .lt('trial_ends_at', now);

        if (!expiredTrials || expiredTrials.length === 0) {
            return NextResponse.json({ success: true, expired: 0 });
        }

        // Update to expired status
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        for (const trial of expiredTrials) {
            await supabase
                .from('organization_subscriptions')
                .update({
                    status: 'expired',
                    read_only_started_at: now,
                    deletion_scheduled_at: thirtyDaysFromNow.toISOString(),
                })
                .eq('id', trial.id);
        }

        console.log(`[Cron] Expired ${expiredTrials.length} trial subscriptions`);

        return NextResponse.json({
            success: true,
            expired: expiredTrials.length,
        });
    } catch (error) {
        console.error('[Cron] Check trials error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
