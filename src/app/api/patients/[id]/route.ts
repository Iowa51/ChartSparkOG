// src/app/api/patients/[id]/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// HIPAA-compliant patient detail API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getPatientById, updatePatient } from '@/lib/data';

async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });

        // Get patient with all related details
        const patient = await getPatientById(id, { includeDetails: true });

        // Verify user has access to this patient's organization
        if (patient.organization_id !== context.user.organizationId) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'patient',
                resourceId: id,
                details: { reason: 'Cross-organization access attempt' },
                phiAccessed: false,
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        return NextResponse.json(patient);
    } catch (error) {
        logError({
            action: 'FETCH_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
}

async function handlePatch(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });

        const updates = await context.request.json();

        // Use data layer to update patient
        const patient = await updatePatient(id, context.user.organizationId || '', updates);

        return NextResponse.json(patient);
    } catch (error) {
        logError({
            action: 'UPDATE_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
    }
}

async function handleDelete(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });

        // Soft delete - set status to archived
        await updatePatient(id, context.user.organizationId || '', { status: 'archived' });

        // Log PHI deletion (high risk event)
        await logPHIAccess(
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
            'PATIENT',
            id,
            'DELETE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({
            action: 'DELETE_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const PATCH = withAuth(handlePatch, { requireOrganization: true });
export const DELETE = withAuth(handleDelete, { requireOrganization: true });
