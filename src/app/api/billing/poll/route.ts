import { NextRequest, NextResponse } from "next/server";
import { StatusPollingService } from "@/lib/managed-billing/status-polling-service";

/**
 * Trigger Billing Polling
 * 
 * Secure endpoint to trigger clearinghouse status checks.
 * Ideally called by a CRON job (Vercel Cron, GitHub Actions, etc.)
 */
export async function GET(req: NextRequest) {
    // 1. Verify Authorization (Cron Secret)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Fetch all organizations with active billing (Demo/POC shortcut)
        // In production, we'd query the db for orgs with clearinghouse_configs
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
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 500 });
    }
}
