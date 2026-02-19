// src/app/api/billing/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';

async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();
        const { data: billing, error } = await supabase.from('billing').select(`
      *,
      patient:patients(id, first_name, last_name),
      provider:profiles(id, first_name, last_name)
    `).eq('organization_id', context.user.organizationId).order('service_date', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ billing });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        const billingData = await context.request.json();
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const { data: billing, error } = await supabase.from('billing').insert([{
            ...billingData,
            organization_id: context.user.organizationId,
            provider_id: context.user.id,
            invoice_number: invoiceNumber,
            outstanding_balance: billingData.amount
        }]).select().single();

        if (error) throw error;
        return NextResponse.json({ billing }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const POST = withAuth(handlePost, { requireOrganization: true });
