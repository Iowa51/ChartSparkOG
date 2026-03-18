// src/app/api/billing/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { BillingCreateSchema, validateRequest } from '@/lib/validation/schemas';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handleGet(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const supabase = await createClient();
        const { data: billing, error } = await supabase.from('billing').select(`
      *,
      patient:patients(id, first_name, last_name),
      provider:profiles(id, first_name, last_name)
    `).eq('organization_id', context.user.organizationId).order('service_date', { ascending: false });

        if (error) throw error;

        // F-034: Audit log billing record access (PHI under HIPAA)
        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'billing',
            details: { action: 'BILLING_LIST_VIEW', recordCount: billing?.length || 0 },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ billing });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const supabase = await createClient();
        const rawBody = await context.request.json();

        // SEC-INTEGRITY-2: Validate input with Zod — no arbitrary fields accepted
        const validation = validateRequest(BillingCreateSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const billingData = validation.data;

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
                const { data: existingBilling, error: fetchError } = await supabase
                    .from('billing')
                    .select('*')
                    .eq('id', existing.id)
                    .single();
                if (fetchError || !existingBilling) {
                    return NextResponse.json({ error: 'Failed to retrieve existing billing record' }, { status: 500 });
                }
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

        // SEC-INTEGRITY-2: Explicit fields only — no spread of raw client data
        const insertData: Record<string, unknown> = {
            patient_id: billingData.patient_id,
            encounter_id: billingData.encounter_id ?? null,
            service_date: billingData.service_date ?? null,
            amount: billingData.amount,
            cpt_code: billingData.cpt_code ?? null,
            icd_codes: billingData.icd_codes ?? null,
            status: billingData.status,
            insurance_claim_id: billingData.insurance_claim_id ?? null,
            notes: billingData.notes ?? null,
            organization_id: context.user.organizationId,
            provider_id: context.user.id,
            invoice_number: invoiceNumber,
            outstanding_balance: billingData.amount,
        };

        if (idempotencyKey) {
            insertData.idempotency_key = idempotencyKey;
        }

        const { data: billing, error } = await supabase.from('billing').insert([insertData]).select().single();

        if (error) {
            // SEC-INTEGRITY-3: Handle DB-level unique constraint violations gracefully
            if (error.code === '23505') {
                // Unique violation — fetch and return the existing record
                let existingRecord = null;
                if (idempotencyKey) {
                    const { data } = await supabase
                        .from('billing')
                        .select('*')
                        .eq('idempotency_key', idempotencyKey)
                        .maybeSingle();
                    existingRecord = data;
                }
                if (!existingRecord && billingData.encounter_id && billingData.service_date) {
                    const { data } = await supabase
                        .from('billing')
                        .select('*')
                        .eq('encounter_id', billingData.encounter_id)
                        .eq('service_date', billingData.service_date)
                        .eq('organization_id', context.user.organizationId)
                        .maybeSingle();
                    existingRecord = data;
                }
                if (existingRecord) {
                    return NextResponse.json({ billing: existingRecord, duplicate: true }, { status: 200 });
                }
            }
            throw error;
        }

        // F-034: Audit log billing record creation (PHI under HIPAA)
        logAuditEventAsync({
            eventType: 'BILLING_RECORD_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'billing',
            resourceId: billing.id,
            details: { action: 'BILLING_CREATE', patient_id: billingData.patient_id, invoice_number: invoiceNumber },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ billing }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const POST = withAuth(handlePost, { requireOrganization: true });
