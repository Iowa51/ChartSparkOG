/**
 * Generate Invoices Cron Job
 * POST /api/cron/generate-invoices
 * 
 * Run monthly to generate invoices for all managed billing clients
 * Should be triggered by Vercel Cron or external scheduler
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Dynamic import to avoid loading at build time
        const { generateAllMonthlyInvoices } = await import('@/lib/managed-billing/invoice-service');
        const result = await generateAllMonthlyInvoices();

        console.log(`[Cron] Generated ${result.generated} invoices`);
        if (result.errors.length > 0) {
            console.error('[Cron] Invoice errors:', result.errors);
        }

        return NextResponse.json({
            success: true,
            generated: result.generated,
            errors: result.errors.length,
        });
    } catch (error) {
        console.error('[Cron] Generate invoices error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
    return POST(request);
}
