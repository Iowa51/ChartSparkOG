// src/app/api/patients/route.ts
// SEC-009: HIPAA-compliant patient API with full audit logging
// SEC-REMEDIATION: Using safe logger to prevent PHI in error logs

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logAuditEventAsync, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { PatientCreateSchema, validateRequest } from '@/lib/validation/schemas';

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

        // SEC-REMEDIATION: Add pagination to prevent unbounded queries
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const offset = (page - 1) * limit;

        // First get total count for pagination metadata
        let countQuery = supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id);

        if (status && status !== 'all') {
            countQuery = countQuery.eq('status', status);
        }

        const { count: totalCount } = await countQuery;

        // OPTIMIZATION: Select only columns needed for patient list view
        let query = supabase
            .from('patients')
            .select(`
                id,
                first_name,
                last_name,
                date_of_birth,
                gender,
                status,
                phone,
                email,
                insurance_provider,
                created_at,
                updated_at
            `)
            .eq('organization_id', profile.organization_id)
            .order('last_name', { ascending: true })
            .range(offset, offset + limit - 1);

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

        // OPTIMIZATION: Fire-and-forget audit logging - don't block response
        logAuditEventAsync({
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

        return NextResponse.json({
            patients,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
            },
        });
    } catch (error) {
        logError({
            action: 'FETCH_PATIENTS_ERROR',
            error: sanitizeError(error),
        });
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

        const rawData = await request.json();

        // SEC-REMEDIATION: Validate input with Zod schema instead of spreading arbitrary data
        const validation = validateRequest(PatientCreateSchema, rawData);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const { data: patient, error } = await supabase
            .from('patients')
            .insert([{
                first_name: validatedData.first_name,
                last_name: validatedData.last_name,
                date_of_birth: validatedData.date_of_birth,
                email: validatedData.email,
                phone: validatedData.phone,
                address: validatedData.address,
                insurance_id: validatedData.insurance_id,
                emergency_contact_name: validatedData.emergency_contact_name,
                emergency_contact_phone: validatedData.emergency_contact_phone,
                notes: validatedData.notes,
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
        logError({
            action: 'CREATE_PATIENT_ERROR',
            error: sanitizeError(error),
        });
        return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
    }
}
