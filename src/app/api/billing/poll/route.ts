import { NextRequest, NextResponse } from "next/server";
import { StatusPollingService } from "@/lib/managed-billing/status-polling-service";
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

/**
 * Trigger Billing Polling
 * 
 * Secure endpoint to trigger clearinghouse status checks.
 * Called by CRON job (Vercel Cron, GitHub Actions, etc.)
 */
export async function GET(req: NextRequest) {
    // Verify Authorization — CRON_SECRET required in ALL environments
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logError({ action: 'BILLING_POLL_NO_SECRET', error: 'CRON_SECRET not configured' });
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch all organizations with active billing
        const activeOrgIds = ['demo-org-123'];

        const results = [];
        for (const orgId of activeOrgIds) {
            const result = await StatusPollingService.pollOrganization(orgId);
            results.push({ orgId, ...result });
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error: unknown) {
        logError({ action: 'BILLING_POLL_ERROR', error: sanitizeError(error) });
        return NextResponse.json({
            success: false,
            error: 'Billing poll failed'
        }, { status: 500 });
    }
}
