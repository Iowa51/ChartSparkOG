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

        // SEC-CODEX-5a: Idempotency-Key header to prevent duplicate submissions
        const idempotencyKey = context.request.headers.get('Idempotency-Key');
        if (idempotencyKey) {
            const { data: existing } = await supabase
                .from('billing')
                .select('id')
                .eq('idempotency_key', idempotencyKey)
                .maybeSingle();

            if (existing) {
                // Return the existing record instead of creating a duplicate
                const { data: existingBilling } = await supabase
                    .from('billing')
                    .select('*')
                    .eq('id', existing.id)
                    .single();
                return NextResponse.json({ billing: existingBilling, duplicate: true }, { status: 200 });
            }
        }

        // SEC-CODEX-5b: Uniqueness check on encounter_id + service_date to prevent duplicate billing
        if (billingData.encounter_id && billingData.service_date) {
            const { data: duplicateBilling } = await supabase
                .from('billing')
                .select('id, invoice_number')
                .eq('encounter_id', billingData.encounter_id)
                .eq('service_date', billingData.service_date)
                .eq('organization_id', context.user.organizationId)
                .maybeSingle();

            if (duplicateBilling) {
                return NextResponse.json(
                    { error: 'A billing record already exists for this encounter and service date', existing_invoice: duplicateBilling.invoice_number },
                    { status: 409 }
                );
            }
        }

        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const insertData: Record<string, unknown> = {
            ...billingData,
            organization_id: context.user.organizationId,
            provider_id: context.user.id,
            invoice_number: invoiceNumber,
            outstanding_balance: billingData.amount,
        };

        if (idempotencyKey) {
            insertData.idempotency_key = idempotencyKey;
        }

        const { data: billing, error } = await supabase.from('billing').insert([insertData]).select().single();

        if (error) throw error;
        return NextResponse.json({ billing }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const POST = withAuth(handlePost, { requireOrganization: true });
