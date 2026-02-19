// HIPAA-compliant patient API with audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { PatientCreateSchema, validateRequest } from '@/lib/validation/schemas';
import { checkCSRF } from '@/lib/security/csrf';
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

        // Try profiles table first, fallback to users table for RLS compatibility
        let profile = null;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
            // Fallback: Try users table (RLS policies use this table)
            const { data: userData } = await supabase
                .from('users')
                .select('organization_id, email, role')
                .eq('id', user.id)
                .single();

            if (userData) {
                profile = userData;
            } else {
                return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            }
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const searchTerm = searchParams.get('search');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        // PHI removed from logs — see audit_logs table for access records

        let result;

        // Use search if search term provided, otherwise paginated list
        if (searchTerm) {
            result = await searchPatients(profile.organization_id, searchTerm, {
                page,
                pageSize,
                status: status || 'active',
            });
        } else {
            result = await getPatients(profile.organization_id, {
                page,
                pageSize,
                status: status || 'active',
            });
        }

        // PHI removed from logs — audit_logs captures access

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
            { error: 'Failed to fetch patients' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    // CSRF protection
    const csrfError = checkCSRF(request);
    if (csrfError) return csrfError;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let profile = null;
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
            // Fallback: Try users table (RLS policies use this table)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('organization_id, email, role')
                .eq('id', user.id)
                .single();

            if (userData) {
                profile = userData;
            } else {
                console.error('Profile lookup failed:', { profileError, userError });
                return NextResponse.json({
                    error: 'Profile not found. Please ensure your account is properly configured.'
                }, { status: 404 });
            }
        }

        // PHI removed from logs

        if (!profile.organization_id) {
            return NextResponse.json({
                error: 'No organization assigned to your account. Please contact your administrator.'
            }, { status: 400 });
        }

        const rawData = await request.json();

        // Validate input with Zod schema
        const validation = validateRequest(PatientCreateSchema, rawData);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Create patient using data layer
        const patient = await createPatient(
            profile.organization_id,
            user.id,
            {
                first_name: data.first_name,
                last_name: data.last_name,
                preferred_name: data.preferred_name ?? undefined,
                date_of_birth: data.date_of_birth,
                gender: data.gender ?? undefined,
                email: data.email ?? undefined,
                phone: data.phone ?? undefined,
                address: data.address ?? undefined,
                allergies: data.allergies ?? undefined,
                // TODO: Zod schema validates as string[] but PatientCreateInput expects structured objects — align schemas
                medications: data.medications as any ?? undefined,
                problems: data.problems as any ?? undefined,
                insurance: data.insurance as any ?? undefined,
            }
        );

        // Patient details removed from logs — audit_logs captures creation

        return NextResponse.json(patient, { status: 201 });
    } catch (error) {
        logError({
            action: 'CREATE_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        return NextResponse.json(
            { error: 'Failed to create patient' },
            { status: 500 }
        );
    }
}
