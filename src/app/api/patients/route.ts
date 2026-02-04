// src/app/api/patients/route.ts
// SEC-009: HIPAA-compliant patient API with full audit logging
// Updated to use production data layer

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import {
    getPatients,
    searchPatients,
    createPatient,
} from '@/lib/data';

export async function GET(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
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
        const searchTerm = searchParams.get('search');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        console.log('[PATIENT SEARCH] Query params:', {
            userId: user.id,
            organizationId: profile.organization_id,
            searchTerm,
            status,
            page,
            pageSize,
        });

        let result;

        // Use search if search term provided, otherwise paginated list
        if (searchTerm) {
            result = await searchPatients(profile.organization_id, searchTerm, {
                page,
                pageSize,
            });
        } else {
            result = await getPatients(profile.organization_id, {
                page,
                pageSize,
            });
        }

        console.log('[PATIENT SEARCH] Results:', {
            organizationId: profile.organization_id,
            resultCount: result.data.length,
            totalCount: result.count,
        });

        // Fire-and-forget audit logging
        logAuditEventAsync({
            eventType: 'PATIENT_SEARCH',
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
            ipAddress,
            userAgent,
            details: {
                search: searchTerm || null,
                statusFilter: status || 'all',
                resultCount: result.data.length,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({
            patients: result.data,
            pagination: {
                page: result.page,
                limit: result.pageSize,
                total: result.count,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        logError({
            action: 'FETCH_PATIENTS_ERROR',
            error: sanitizeError(error),
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch patients' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles table first, fallback to users table for RLS compatibility
        let profile = null;
        let profileSource = '';
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
            profileSource = 'profiles';
        } else {
            // Fallback: Try users table (RLS policies use this table)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('organization_id, email, role')
                .eq('id', user.id)
                .single();

            if (userData) {
                profile = userData;
                profileSource = 'users';
            } else {
                console.error('Profile lookup failed:', { profileError, userError });
                return NextResponse.json({
                    error: 'Profile not found. Please ensure your account is properly configured.'
                }, { status: 404 });
            }
        }

        console.log('[PATIENT CREATE] Profile lookup:', {
            userId: user.id,
            profileSource,
            organizationId: profile.organization_id,
            role: profile.role,
        });

        if (!profile.organization_id) {
            return NextResponse.json({
                error: 'No organization assigned to your account. Please contact your administrator.'
            }, { status: 400 });
        }

        const data = await request.json();

        console.log('[PATIENT CREATE] Creating patient:', {
            firstName: data.first_name,
            lastName: data.last_name,
            organizationId: profile.organization_id,
        });

        // Create patient using data layer
        const patient = await createPatient(
            profile.organization_id,
            user.id,
            {
                first_name: data.first_name,
                last_name: data.last_name,
                preferred_name: data.preferred_name,
                date_of_birth: data.date_of_birth,
                gender: data.gender,
                email: data.email,
                phone: data.phone,
                address: data.address,
                allergies: data.allergies,
                medications: data.medications,
                problems: data.problems,
                insurance: data.insurance,
            }
        );

        console.log('[PATIENT CREATE] Patient created successfully:', {
            patientId: patient.id,
            patientOrgId: patient.organization_id,
            firstName: patient.first_name,
            lastName: patient.last_name,
            status: patient.status,
        });

        return NextResponse.json(patient, { status: 201 });
    } catch (error) {
        logError({
            action: 'CREATE_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        // Return more specific error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to create patient';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
