import { NextResponse } from 'next/server';
import { withAuth, AuthContext, canAccessPatient } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { ScreeningCreateSchema, validateRequest } from '@/lib/validation/schemas';

// GET /api/screenings?patient_id=...&instrument=...&limit=6
async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { searchParams } = new URL(context.request.url);
        const patient_id = searchParams.get('patient_id');
        const encounter_id = searchParams.get('encounter_id');
        const instrument = searchParams.get('instrument');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!patient_id && !encounter_id) {
            return NextResponse.json(
                { error: 'patient_id or encounter_id is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ screenings: [], isDemo: true });
        }

        // C3: Enforce org isolation — reject if no orgId
        const orgId = context.user.organizationId;
        if (!orgId) {
            return NextResponse.json(
                { error: 'Organization context required' },
                { status: 403 }
            );
        }

        let query = supabase
            .from('screening_scores')
            .select('*')
            .eq('organization_id', orgId)
            .order('administered_at', { ascending: false })
            .limit(limit);

        if (patient_id) query = query.eq('patient_id', patient_id);
        if (encounter_id) query = query.eq('encounter_id', encounter_id);
        if (instrument) query = query.eq('instrument', instrument);

        const { data: screenings, error } = await query;

        if (error) {
            logError({ action: 'SCREENING_FETCH_ERROR', error: sanitizeError(error) });
            return NextResponse.json({ screenings: [], error: 'Failed to query screenings' });
        }

        await logAuditEvent({
            eventType: 'SCREENING_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'screening_scores',
            details: { action: 'SCREENING_VIEW', instrument, hasPatientFilter: Boolean(patient_id) },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ screenings: screenings || [] });
    } catch (error: unknown) {
        logError({ action: 'SCREENING_FETCH_ERROR', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to fetch screenings' },
            { status: 500 }
        );
    }
}

// POST /api/screenings
async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const body = await context.request.json();

        // F-011: Validate with Zod schema (UUID, bounded score, typed item_responses, size limits)
        const validation = validateRequest(ScreeningCreateSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }
        const {
            patient_id, encounter_id, instrument,
            total_score, severity, item_responses,
            clinical_notes, risk_flags
        } = validation.data;

        // C3: Enforce org isolation on POST
        const orgId = context.user.organizationId;
        if (!orgId) {
            return NextResponse.json(
                { error: 'Organization context required' },
                { status: 403 }
            );
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({
                success: true,
                isDemo: true,
                screening: {
                    id: 'demo-screening',
                    patient_id,
                    instrument,
                    total_score,
                    severity,
                },
            });
        }

        const canAccessTargetPatient = await canAccessPatient(context.user, patient_id);
        if (!canAccessTargetPatient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 403 }
            );
        }

        const { data: screening, error } = await supabase
            .from('screening_scores')
            .insert({
                organization_id: orgId,
                patient_id,
                encounter_id: encounter_id || null,
                administered_by: context.user.id,
                instrument,
                total_score,
                severity: severity || null,
                item_responses,
                clinical_notes: clinical_notes || null,
                risk_flags: risk_flags || [],
            })
            .select()
            .single();

        if (error) {
            logError({ action: 'SCREENING_SAVE_ERROR', error: sanitizeError(error) });
            return NextResponse.json(
                { error: 'Failed to save screening' },
                { status: 500 }
            );
        }

        await logAuditEvent({
            eventType: 'SCREENING_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'screening_scores',
            resourceId: screening.id,
            details: {
                action: 'SCREENING_SAVE',
                instrument,
                has_risk_flags: (risk_flags?.length || 0) > 0,
            },
            phiAccessed: true,
            riskLevel: (risk_flags?.length || 0) > 0 ? 'HIGH' : 'MEDIUM',
        });

        return NextResponse.json({ success: true, screening });
    } catch (error: unknown) {
        logError({ action: 'SCREENING_SAVE_ERROR', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to save screening' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handleGet, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});

export const POST = withAuth(handlePost, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
