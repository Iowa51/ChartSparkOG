// HIPAA-compliant patient API with audit logging

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { PatientCreateSchema, validateRequest } from '@/lib/validation/schemas';
import {
    getPatients,
    searchPatients,
    createPatient,
} from '@/lib/data';

async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { user } = context;

        if (!user.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const searchParams = context.request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const searchTerm = searchParams.get('search');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        let result;

        if (searchTerm) {
            result = await searchPatients(user.organizationId, searchTerm, {
                page,
                pageSize,
                status: status || 'active',
            });
        } else {
            result = await getPatients(user.organizationId, {
                page,
                pageSize,
                status: status || 'active',
            });
        }

        logAuditEventAsync({
            eventType: 'PATIENT_SEARCH',
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            organizationId: user.organizationId,
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
    } catch (error: unknown) {
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

async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { user } = context;

        if (!user.organizationId) {
            return NextResponse.json({
                error: 'No organization assigned to your account. Please contact your administrator.'
            }, { status: 400 });
        }

        const rawData = await context.request.json();

        const validation = validateRequest(PatientCreateSchema, rawData);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const data = validation.data;

        const patient = await createPatient(
            user.organizationId,
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

        return NextResponse.json(patient, { status: 201 });
    } catch (error: unknown) {
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

export const GET = withAuth(handleGet, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});

export const POST = withAuth(handlePost, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
});
