/**
 * Generate Invoices Cron Job
 * POST /api/cron/generate-invoices
 * 
 * SEC-REMEDIATION: Secured with mandatory CRON_SECRET validation
 * Run monthly to generate invoices for all managed billing clients
 * Should be triggered by Vercel Cron or external scheduler
 */

import { NextRequest, NextResponse } from 'next/server';
import { logError, logInfo, logWarn, sanitizeError } from '@/lib/logging/safe-logger';

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
        logWarn({ action: 'CRON_SECRET_NOT_SET', status: 'allowing_in_development' });
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

        // Dynamic import to avoid loading at build time
        const { generateAllMonthlyInvoices } = await import('@/lib/managed-billing/invoice-service');
        const result = await generateAllMonthlyInvoices();

        logInfo({ action: 'CRON_INVOICES_GENERATED', count: result.generated });
        if (result.errors.length > 0) {
            logError({ action: 'CRON_INVOICE_ERRORS', error: sanitizeError(result.errors) });
        }

        return NextResponse.json({
            success: true,
            generated: result.generated,
            errors: result.errors.length,
        });
    } catch (error) {
        logError({ action: 'CRON_GENERATE_INVOICES_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
    return POST(request);
}
