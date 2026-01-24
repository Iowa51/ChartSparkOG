/**
 * Invoice Service
 * Generates monthly invoices for managed billing clients
 */

import { createClient } from '@/lib/supabase/server';
import { closeCollectionPeriod, getPeriodClaims } from './collection-service';

export interface Invoice {
    id: string;
    organizationId: string;
    invoiceNumber: string;
    periodId: string;
    periodStart: string;
    periodEnd: string;
    totalClaims: number;
    totalBilled: number;
    totalCollected: number;
    managementFee: number;
    netToClient: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    dueDate: string;
    paidAt?: string;
    createdAt: string;
}

export interface InvoiceLineItem {
    id: string;
    invoiceId: string;
    claimId: string;
    patientName: string;
    serviceDate: string;
    procedureCodes: string[];
    billedAmount: number;
    paidAmount: number;
    adjustmentAmount: number;
}

/**
 * Generate monthly invoice for an organization
 */
export async function generateMonthlyInvoice(
    organizationId: string,
    periodId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    const supabase = await createClient();
    if (!supabase) return { success: false, error: 'Database not available' };

    const { data: period } = await supabase
        .from('collection_periods')
        .select('*')
        .eq('id', periodId)
        .eq('organization_id', organizationId)
        .single();

    if (!period) return { success: false, error: 'Period not found' };

    // Check existing
    const { data: existing } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('period_id', periodId)
        .maybeSingle();

    if (existing) {
        return { success: true, invoiceId: existing.id, error: 'Invoice exists' };
    }

    // Close period if open
    if (period.status === 'open') {
        await closeCollectionPeriod(periodId);
    }

    const invoiceNumber = await generateInvoiceNumber(supabase, organizationId);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            organization_id: organizationId,
            invoice_number: invoiceNumber,
            period_id: periodId,
            period_start: period.period_start,
            period_end: period.period_end,
            total_claims: period.total_claims,
            total_billed: period.total_billed,
            total_collected: period.total_collected,
            management_fee: period.management_fee,
            net_to_client: period.net_to_client,
            status: 'draft',
            due_date: dueDate.toISOString(),
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // Create line items
    const claims = await getPeriodClaims(periodId);
    const lineItems = claims.filter(c => c.status === 'paid').map(c => ({
        invoice_id: invoice.id,
        claim_id: c.id,
        patient_name: `${c.patients?.last_name || ''}, ${c.patients?.first_name || ''}`,
        service_date: c.service_date,
        procedure_codes: c.procedure_codes || [],
        billed_amount: c.billed_amount || 0,
        paid_amount: c.paid_amount || 0,
        adjustment_amount: c.adjustment_amount || 0,
    }));

    if (lineItems.length > 0) {
        await supabase.from('invoice_line_items').insert(lineItems);
    }

    await supabase
        .from('collection_periods')
        .update({ status: 'invoiced' })
        .eq('id', periodId);

    return { success: true, invoiceId: invoice.id };
}

/**
 * Get invoices for an organization
 */
export async function getInvoices(organizationId: string): Promise<Invoice[]> {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    return (data || []).map(mapInvoice);
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(invoiceId: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    if (!supabase) return { success: false };

    const { data: invoice } = await supabase
        .from('invoices')
        .select('period_id')
        .eq('id', invoiceId)
        .single();

    if (!invoice) return { success: false };

    await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);

    await supabase
        .from('collection_periods')
        .update({ status: 'paid' })
        .eq('id', invoice.period_id);

    return { success: true };
}

/**
 * Generate invoices for all clients (scheduled job)
 */
export async function generateAllMonthlyInvoices(): Promise<{
    generated: number;
    errors: string[];
}> {
    const supabase = await createClient();
    if (!supabase) {
        return { generated: 0, errors: ['Database not available'] };
    }

    // Get all managed billing subscriptions
    const { data: subscriptions } = await supabase
        .from('managed_billing_subscriptions')
        .select('organization_id')
        .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
        return { generated: 0, errors: [] };
    }

    // Get last month's period dates
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let generated = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
        const { data: period } = await supabase
            .from('collection_periods')
            .select('id, status')
            .eq('organization_id', sub.organization_id)
            .gte('period_start', lastMonth.toISOString())
            .lte('period_end', lastMonthEnd.toISOString())
            .maybeSingle();

        if (!period) continue;
        if (period.status === 'invoiced' || period.status === 'paid') continue;

        const result = await generateMonthlyInvoice(sub.organization_id, period.id);
        if (result.success && !result.error?.includes('exists')) {
            generated++;
        } else if (!result.success) {
            errors.push(`${sub.organization_id}: ${result.error}`);
        }
    }

    return { generated, errors };
}

async function generateInvoiceNumber(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string
): Promise<string> {
    if (!supabase) return `INV-${Date.now()}`;
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    return `INV-${ym}-${String((count || 0) + 1).padStart(3, '0')}`;
}

function mapInvoice(r: Record<string, unknown>): Invoice {
    return {
        id: r.id as string,
        organizationId: r.organization_id as string,
        invoiceNumber: r.invoice_number as string,
        periodId: r.period_id as string,
        periodStart: r.period_start as string,
        periodEnd: r.period_end as string,
        totalClaims: (r.total_claims as number) || 0,
        totalBilled: (r.total_billed as number) || 0,
        totalCollected: (r.total_collected as number) || 0,
        managementFee: (r.management_fee as number) || 0,
        netToClient: (r.net_to_client as number) || 0,
        status: r.status as Invoice['status'],
        dueDate: r.due_date as string,
        paidAt: r.paid_at as string | undefined,
        createdAt: r.created_at as string,
    };
}
