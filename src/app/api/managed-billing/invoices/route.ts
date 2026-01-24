/**
 * Invoices API Route
 * GET /api/managed-billing/invoices - List invoices
 * POST /api/managed-billing/invoices - Generate invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInvoices, generateMonthlyInvoice } from '@/lib/managed-billing/invoice-service';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization' }, { status: 403 });
        }

        const invoices = await getInvoices(profile.organization_id);

        return NextResponse.json({ invoices });
    } catch (error) {
        console.error('[API] Invoices list error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { periodId } = body;

        if (!periodId) {
            return NextResponse.json({ error: 'Period ID required' }, { status: 400 });
        }

        const result = await generateMonthlyInvoice(profile.organization_id, periodId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ invoiceId: result.invoiceId }, { status: 201 });
    } catch (error) {
        console.error('[API] Generate invoice error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
