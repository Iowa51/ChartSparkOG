// src/app/api/appointments/route.ts
// SEC-009: HIPAA-compliant appointments API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

export async function GET(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: '/api/appointments', method: 'GET' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const date = searchParams.get('date');

        let query = supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, first_name, last_name),
                provider:profiles(id, first_name, last_name)
            `)
            .eq('organization_id', profile.organization_id)
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
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
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
        console.error('Error fetching appointments:', error);
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: '/api/appointments', method: 'POST' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const appointmentData = await request.json();

        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert([{
                ...appointmentData,
                organization_id: profile.organization_id,
                provider_id: appointmentData.provider_id || user.id
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
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
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
        console.error('Error creating appointment:', error);
        return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }
}
