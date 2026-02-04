// src/app/api/encounters/[id]/route.ts
// HIPAA-compliant encounter detail API with audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventAsync, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getEncounterById } from '@/lib/data';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: encounterId } = await params;
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

        // Fetch encounter with details
        const encounter = await getEncounterById(encounterId, { includeDetails: true });

        // Verify organization access
        if (encounter.organization_id !== profile.organization_id) {
            logAuditEventAsync({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: user.id,
                userEmail: user.email,
                userRole: profile.role,
                organizationId: profile.organization_id,
                ipAddress,
                userAgent,
                resourceType: 'encounter',
                resourceId: encounterId,
                details: { reason: 'Cross-organization access attempt' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Log PHI access
        await logPHIAccess(
            user.id,
            user.email || '',
            profile.role || 'USER',
            profile.organization_id,
            'ENCOUNTER',
            encounterId,
            'VIEW',
            ipAddress,
            userAgent
        );

        return NextResponse.json(encounter);
    } catch (error) {
        logError({
            action: 'FETCH_ENCOUNTER_ERROR',
            error: sanitizeError(error),
            resourceId: encounterId,
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch encounter' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: encounterId } = await params;
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

        // Get current encounter to verify ownership
        const currentEncounter = await getEncounterById(encounterId);

        if (currentEncounter.organization_id !== profile.organization_id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        const { data: updatedEncounter, error } = await supabase
            .from('encounters')
            .update(body)
            .eq('id', encounterId)
            .eq('organization_id', profile.organization_id)
            .select()
            .single();

        if (error) throw error;

        // Log the update
        await logPHIAccess(
            user.id,
            user.email || '',
            profile.role || 'USER',
            profile.organization_id,
            'ENCOUNTER',
            encounterId,
            'UPDATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json(updatedEncounter);
    } catch (error) {
        logError({
            action: 'UPDATE_ENCOUNTER_ERROR',
            error: sanitizeError(error),
            resourceId: encounterId,
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update encounter' },
            { status: 500 }
        );
    }
}
