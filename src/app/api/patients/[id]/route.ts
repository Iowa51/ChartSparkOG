// src/app/api/patients/[id]/route.ts
// HIPAA-compliant patient detail API with full audit logging
// Updated to use production data layer

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getPatientById, updatePatient } from '@/lib/data';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/patients/${id}`, method: 'GET' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles table first, fallback to users table
        let profile = null;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
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

        // Get patient with all related details
        const patient = await getPatientById(id, { includeDetails: true });

        // Verify user has access to this patient's organization
        if (patient.organization_id !== profile.organization_id) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: user.id,
                userEmail: user.email,
                organizationId: profile.organization_id,
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

        // PHI access is already logged in getPatientById
        return NextResponse.json(patient);
    } catch (error) {
        logError({
            action: 'FETCH_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        const errorMessage = error instanceof Error ? error.message : 'Patient not found';
        return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/patients/${id}`, method: 'PATCH' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles table first, fallback to users table
        let profile = null;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
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

        const updates = await request.json();

        // Use data layer to update patient
        const patient = await updatePatient(id, profile.organization_id, updates);

        return NextResponse.json(patient);
    } catch (error) {
        logError({
            action: 'UPDATE_PATIENT_ERROR',
            error: sanitizeError(error),
        });

        const errorMessage = error instanceof Error ? error.message : 'Failed to update patient';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/patients/${id}`, method: 'DELETE' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles table first, fallback to users table
        let profile = null;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
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

        // Soft delete - set status to archived
        await updatePatient(id, profile.organization_id, { status: 'archived' });

        // Log PHI deletion (high risk event)
        await logPHIAccess(
            user.id,
            user.email || '',
            profile.role || 'USER',
            profile.organization_id || '',
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

        const errorMessage = error instanceof Error ? error.message : 'Failed to delete patient';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
