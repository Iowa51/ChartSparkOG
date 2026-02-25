// src/app/api/appointments/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// SEC-009: HIPAA-compliant appointments API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const supabase = await createClient();

        const searchParams = context.request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const date = searchParams.get('date');

        let query = supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, first_name, last_name),
                provider:profiles(id, first_name, last_name)
            `)
            .eq('organization_id', context.user.organizationId)
            .order('appointment_datetime', { ascending: true });

        if (status) query = query.eq('status', status);
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('appointment_datetime', startOfDay).lte('appointment_datetime', endOfDay);
        }

        const { data: appointments, error } = await query;

        if (error) throw error;

        // Log appointment viewing - contains patient schedule info
        await logAuditEvent({
            eventType: 'PATIENT_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'appointment',
            details: {
                statusFilter: status || 'all',
                dateFilter: date || 'all',
                resultCount: appointments?.length || 0,
            },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ appointments });
    } catch (error) {
        logError({ action: 'ERROR_FETCHING_APPOINTMENTS', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const supabase = await createClient();

        const appointmentData = await context.request.json();

        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert([{
                ...appointmentData,
                organization_id: context.user.organizationId,
                provider_id: appointmentData.provider_id || context.user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Update patient's next appointment date
        await supabase
            .from('patients')
            .update({
                next_appointment_date: appointmentData.appointment_datetime.split('T')[0]
            })
            .eq('id', appointmentData.patient_id);

        // Log appointment creation
        await logAuditEvent({
            eventType: 'PATIENT_CREATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'appointment',
            resourceId: appointment.id,
            details: {
                patientId: appointmentData.patient_id,
                appointmentType: appointmentData.appointment_type,
            },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ appointment }, { status: 201 });
    } catch (error) {
        logError({ action: 'ERROR_CREATING_APPOINTMENT', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const POST = withAuth(handlePost, { requireOrganization: true });
