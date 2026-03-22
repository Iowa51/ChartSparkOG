import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext, canAccessPatient } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { calculateBMI, detectAbnormalVitals } from '@/lib/types/smart-triage';
import { z } from 'zod';
import { UUIDSchema, validateRequest } from '@/lib/validation/schemas';

const nullToUndefined = <T>(val: T | null | undefined): T | undefined => val ?? undefined;

const VitalsCreateSchema = z.object({
    patient_id: UUIDSchema,
    encounter_id: UUIDSchema.optional().nullable().transform(nullToUndefined),
    bp_systolic: z.number().int().min(40).max(300).optional().nullable().transform(nullToUndefined),
    bp_diastolic: z.number().int().min(20).max(200).optional().nullable().transform(nullToUndefined),
    heart_rate: z.number().int().min(20).max(300).optional().nullable().transform(nullToUndefined),
    temperature: z.number().min(85).max(115).optional().nullable().transform(nullToUndefined),
    temperature_unit: z.enum(['F', 'C']).optional().default('F'),
    respiratory_rate: z.number().int().min(4).max(60).optional().nullable().transform(nullToUndefined),
    spo2: z.number().min(50).max(100).optional().nullable().transform(nullToUndefined),
    weight: z.number().min(0.1).max(1500).optional().nullable().transform(nullToUndefined),
    weight_unit: z.enum(['lbs', 'kg']).optional().default('lbs'),
    height: z.number().min(1).max(120).optional().nullable().transform(nullToUndefined),
    height_unit: z.enum(['in', 'cm']).optional().default('in'),
    pain_scale: z.number().int().min(0).max(10).optional().nullable().transform(nullToUndefined),
    waist_circumference: z.number().min(1).max(200).optional().nullable().transform(nullToUndefined),
    waist_unit: z.enum(['in', 'cm']).optional().default('in'),
});

// GET /api/vitals?patient_id=...&encounter_id=...&limit=6
async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { searchParams } = new URL(context.request.url);
        const patient_id = searchParams.get('patient_id');
        const encounter_id = searchParams.get('encounter_id');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!patient_id && !encounter_id) {
            return NextResponse.json(
                { error: 'patient_id or encounter_id is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ vitals: [], isDemo: true });
        }

        let query = supabase
            .from('vitals')
            .select('*')
            // F-033: Scope to user's organization to prevent cross-org PHI access
            .eq('organization_id', context.user.organizationId)
            .order('recorded_at', { ascending: false })
            .limit(limit);

        if (patient_id) query = query.eq('patient_id', patient_id);
        if (encounter_id) query = query.eq('encounter_id', encounter_id);

        const { data: vitals, error } = await query;

        if (error) {
            logError({ action: 'VITALS_FETCH_ERROR', error: sanitizeError(error) });
            return NextResponse.json({ vitals: [], error: 'Failed to query vitals' });
        }

        await logAuditEvent({
            eventType: 'VITALS_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'vitals',
            details: { action: 'VITALS_VIEW', hasPatientFilter: Boolean(patient_id), hasEncounterFilter: Boolean(encounter_id) },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ vitals: vitals || [] });
    } catch (error: unknown) {
        logError({ action: 'VITALS_FETCH_ERROR', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to fetch vitals' },
            { status: 500 }
        );
    }
}

// POST /api/vitals
async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const rawBody = await context.request.json();
        const validation = validateRequest(VitalsCreateSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const {
            patient_id, encounter_id,
            bp_systolic, bp_diastolic, heart_rate, temperature, temperature_unit,
            respiratory_rate, spo2, weight, weight_unit, height, height_unit,
            pain_scale, waist_circumference, waist_unit
        } = validation.data;
        const canAccessTargetPatient = await canAccessPatient(context.user, patient_id);
        if (!canAccessTargetPatient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 403 });
        }

        // Calculate BMI
        let bmi: number | null = null;
        if (weight && height) {
            // Convert to lbs/inches for BMI calculation
            const weightLbs = weight_unit === 'kg' ? weight * 2.20462 : weight;
            const heightIn = height_unit === 'cm' ? height / 2.54 : height;
            bmi = calculateBMI(weightLbs, heightIn);
        }

        // Detect abnormal values
        const abnormalFlags = detectAbnormalVitals({
            bp_systolic, bp_diastolic, heart_rate, temperature, temperature_unit,
            spo2
        });

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({
                success: true,
                isDemo: true,
                vital: {
                    id: 'demo-vital',
                    patient_id,
                    bmi,
                    has_abnormal_values: abnormalFlags.length > 0,
                    abnormal_flags: abnormalFlags,
                },
            });
        }

        const { data: vital, error } = await supabase
            .from('vitals')
            .insert({
                organization_id: context.user.organizationId,
                patient_id,
                encounter_id: encounter_id ?? null,
                recorded_by: context.user.id,
                bp_systolic: bp_systolic ?? null,
                bp_diastolic: bp_diastolic ?? null,
                heart_rate: heart_rate ?? null,
                temperature: temperature ?? null,
                temperature_unit: temperature_unit || 'F',
                respiratory_rate: respiratory_rate ?? null,
                spo2: spo2 ?? null,
                weight: weight ?? null,
                weight_unit: weight_unit || 'lbs',
                height: height ?? null,
                height_unit: height_unit || 'in',
                bmi,
                pain_scale: pain_scale ?? null,
                waist_circumference: waist_circumference ?? null,
                waist_unit: waist_unit || 'in',
                has_abnormal_values: abnormalFlags.length > 0,
                abnormal_flags: abnormalFlags,
            })
            .select()
            .single();

        if (error) {
            logError({ action: 'VITALS_SAVE_ERROR', error: sanitizeError(error) });
            return NextResponse.json(
                { error: 'Failed to save vitals' },
                { status: 500 }
            );
        }

        await logAuditEvent({
            eventType: 'VITALS_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'vitals',
            resourceId: vital.id,
            details: {
                action: 'VITALS_SAVE',
                hasEncounterReference: Boolean(encounter_id),
                hasAbnormalFlags: abnormalFlags.length > 0,
            },
            phiAccessed: true,
            riskLevel: abnormalFlags.length > 0 ? 'MEDIUM' : 'LOW',
        });

        return NextResponse.json({ success: true, vital });
    } catch (error: unknown) {
        logError({ action: 'VITALS_SAVE_ERROR', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to save vitals' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handleGet, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});

export const POST = withAuth(handlePost, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
