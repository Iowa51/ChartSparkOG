import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { calculateBMI, detectAbnormalVitals } from '@/lib/types/smart-triage';

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
            details: { action: 'VITALS_VIEW', patient_id, encounter_id },
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
        const body = await context.request.json();
        const {
            patient_id, encounter_id,
            bp_systolic, bp_diastolic, heart_rate, temperature, temperature_unit,
            respiratory_rate, spo2, weight, weight_unit, height, height_unit,
            pain_scale, waist_circumference, waist_unit
        } = body;

        if (!patient_id) {
            return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
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
                encounter_id: encounter_id || null,
                recorded_by: context.user.id,
                bp_systolic: bp_systolic || null,
                bp_diastolic: bp_diastolic || null,
                heart_rate: heart_rate || null,
                temperature: temperature || null,
                temperature_unit: temperature_unit || 'F',
                respiratory_rate: respiratory_rate || null,
                spo2: spo2 || null,
                weight: weight || null,
                weight_unit: weight_unit || 'lbs',
                height: height || null,
                height_unit: height_unit || 'in',
                bmi,
                pain_scale: pain_scale ?? null,
                waist_circumference: waist_circumference || null,
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
                patient_id,
                encounter_id,
                has_abnormal: abnormalFlags.length > 0,
                abnormal_flags: abnormalFlags,
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
});

export const POST = withAuth(handlePost, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
