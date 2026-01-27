// src/app/api/patients/route.ts
// SEC-009: HIPAA-compliant patient API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
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
                details: { path: '/api/patients', method: 'GET' },
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
        const search = searchParams.get('search');

        let query = supabase
            .from('patients')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .order('last_name', { ascending: true });

        // Apply status filter
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // SEC-REMEDIATION: Sanitize search to prevent filter injection
        if (search) {
            // Remove dangerous characters that could be used for injection
            const sanitized = search
                .replace(/[<>'"`;\\]/g, '')  // Remove dangerous chars
                .replace(/%/g, '\\%')        // Escape wildcards
                .replace(/,/g, '')           // Remove commas (filter separator)
                .trim()
                .substring(0, 100);          // Limit length

            if (sanitized) {
                query = query.or(`first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%`);
            }
        }

        const { data: patients, error } = await query;

        if (error) throw error;

        // Log PHI access - viewing patient list
        await logAuditEvent({
            eventType: 'PATIENT_SEARCH',
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
            ipAddress,
            userAgent,
            details: {
                search: search || null,
                statusFilter: status || 'all',
                resultCount: patients?.length || 0,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ patients });
    } catch (error) {
        console.error('Error fetching patients:', error);
        return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
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
                details: { path: '/api/patients', method: 'POST' },
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

        const patientData = await request.json();

        const { data: patient, error } = await supabase
            .from('patients')
            .insert([{
                ...patientData,
                organization_id: profile.organization_id,
                created_by: user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Log PHI creation with full HIPAA fields
        await logPHIAccess(
            user.id,
            user.email || '',
            profile.role || 'USER',
            profile.organization_id,
            'PATIENT',
            patient.id,
            'CREATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ patient }, { status: 201 });
    } catch (error) {
        console.error('Error creating patient:', error);
        return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
    }
}
