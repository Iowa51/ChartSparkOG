/**
 * Claims List API Route
 * GET /api/managed-billing/claims - List claims for organization
 * POST /api/managed-billing/claims - Create new claim
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Get user's organization
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

        let query = supabase
            .from('billing_claims')
            .select(`
                *,
                patients (id, first_name, last_name),
                users!billing_claims_provider_id_fkey (id, first_name, last_name)
            `, { count: 'exact' })
            .eq('organization_id', profile.organization_id)
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
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('[API] Claims list error:', error);
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

        // Generate claim number
        const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const { data: claim, error } = await supabase
            .from('billing_claims')
            .insert({
                organization_id: profile.organization_id,
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
        console.error('[API] Create claim error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
