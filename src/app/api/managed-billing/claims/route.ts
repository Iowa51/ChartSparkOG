/**
 * Claims List API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * GET /api/managed-billing/claims - List claims for organization
 * POST /api/managed-billing/claims - Create new claim
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { searchParams } = new URL(context.request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = supabase
            .from('billing_claims')
            .select(`
                *,
                patients (id, first_name, last_name),
                users!billing_claims_provider_id_fkey (id, first_name, last_name)
            `, { count: 'exact' })
            .eq('organization_id', context.user.organizationId!)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: claims, count, error } = await query;

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
        }

        return NextResponse.json({
            claims,
            pagination: {
                page, limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        logError({ action: 'CLAIMS_LIST_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const body = await context.request.json();
        const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const { data: claim, error } = await supabase
            .from('billing_claims')
            .insert({
                organization_id: context.user.organizationId,
                patient_id: body.patientId,
                provider_id: body.providerId,
                encounter_id: body.encounterId,
                claim_number: claimNumber,
                service_date: body.serviceDate,
                diagnosis_codes: body.diagnosisCodes || [],
                procedure_codes: body.procedureCodes || [],
                billed_amount: body.billedAmount || 0,
                payer_name: body.payerName,
                status: 'draft',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
        }

        return NextResponse.json({ claim }, { status: 201 });
    } catch (error) {
        logError({ action: 'CREATE_CLAIM_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
});
