/**
 * Invoices API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * GET /api/managed-billing/invoices - List invoices
 * POST /api/managed-billing/invoices - Generate invoice
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { getInvoices, generateMonthlyInvoice } from '@/lib/managed-billing/invoice-service';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handleGet(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const invoices = await getInvoices(context.user.organizationId!);

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'invoice',
            details: { action: 'INVOICE_LIST_VIEW', recordCount: invoices?.length || 0 },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ invoices });
    } catch (error) {
        logError({ action: 'INVOICES_LIST_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const body = await context.request.json();
        const { periodId } = body;

        if (!periodId) {
            return NextResponse.json({ error: 'Period ID required' }, { status: 400 });
        }

        const result = await generateMonthlyInvoice(context.user.organizationId!, periodId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'invoice',
            resourceId: result.invoiceId,
            details: { action: 'INVOICE_GENERATE', periodId },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ invoiceId: result.invoiceId }, { status: 201 });
    } catch (error) {
        logError({ action: 'GENERATE_INVOICE_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
