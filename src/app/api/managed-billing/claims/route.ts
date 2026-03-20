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
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { ManagedBillingClaimCreateSchema, validateRequest } from '@/lib/validation/schemas';

async function handleGet(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
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

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'billing_claim',
            details: { action: 'CLAIMS_LIST_VIEW', recordCount: claims?.length || 0 },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

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
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const body = await context.request.json();
        const validation = validateRequest(ManagedBillingClaimCreateSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const validatedBody = validation.data;
        const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const [{ data: patient }, { data: provider }] = await Promise.all([
            supabase
                .from('patients')
                .select('id')
                .eq('id', validatedBody.patientId)
                .eq('organization_id', context.user.organizationId!)
                .maybeSingle(),
            supabase
                .from('profiles')
                .select('id')
                .eq('id', validatedBody.providerId)
                .eq('organization_id', context.user.organizationId!)
                .maybeSingle(),
        ]);

        if (!patient || !provider) {
            return NextResponse.json(
                { error: 'Forbidden - invalid organization association' },
                { status: 403 }
            );
        }

        const { data: claim, error } = await supabase
            .from('billing_claims')
            .insert({
                organization_id: context.user.organizationId,
                patient_id: validatedBody.patientId,
                provider_id: validatedBody.providerId,
                encounter_id: validatedBody.encounterId,
                claim_number: claimNumber,
                service_date: validatedBody.serviceDate,
                diagnosis_codes: validatedBody.diagnosisCodes,
                procedure_codes: validatedBody.procedureCodes,
                billed_amount: validatedBody.billedAmount,
                payer_name: validatedBody.payerName,
                status: 'draft',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
        }

        logAuditEventAsync({
            eventType: 'BILLING_RECORD_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'billing_claim',
            resourceId: claim.id,
            details: { action: 'CLAIM_CREATE', claimNumber: claim.claim_number, hasEncounterReference: Boolean(validatedBody.encounterId) },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ claim }, { status: 201 });
    } catch (error) {
        logError({ action: 'CREATE_CLAIM_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
