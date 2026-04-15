// src/app/api/encounters/tracking/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { EncounterTrackingSchema, validateRequest } from '@/lib/validation/schemas';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

/**
 * API Route to track clinical encounter states and maintain a secure audit trail.
 * Logs transitions like 'started', 'paused', 'resumed', 'captured', and 'completed'.
 */

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        const rawBody = await context.request.json();
        const validation = validateRequest(EncounterTrackingSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const { encounterId, action, metadata, patientId } = validation.data;

        // SEC-SPRINT8: Verify encounter belongs to caller's organization before any write
        const { data: encounter, error: encounterError } = await supabase
            .from('encounters')
            .select('id, organization_id')
            .eq('id', encounterId)
            .single();

        if (encounterError || !encounter) {
            return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
        }

        if (encounter.organization_id !== context.user.organizationId) {
            return NextResponse.json({ error: 'Access denied - encounter belongs to different organization' }, { status: 403 });
        }

        // 1. Log the encounter tracking event
        const { error: trackingError } = await supabase
            .from('encounter_tracking')
            .insert({
                encounter_id: encounterId,
                user_id: context.user.id,
                organization_id: context.user.organizationId,
                event_type: action,
                metadata: metadata || {},
            });

        if (trackingError) throw trackingError;

        // 2. Create a high-level security audit log entry
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        await logAuditEvent({
            eventType: 'ENCOUNTER_UPDATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'encounter',
            resourceId: encounterId,
            details: {
                action,
                tracking_record_type: 'encounter_tracking',
                metadata_present: Boolean(metadata && Object.keys(metadata).length > 0),
                patient_context_present: Boolean(patientId),
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        // 3. Update the encounter status if necessary
        if (action === 'completed') {
            await supabase
                .from('encounters')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', encounterId)
                .eq('organization_id', context.user.organizationId);
        }

        return NextResponse.json({ success: true, action, timestamp: new Date().toISOString() });

    } catch (error: unknown) {
        logError({ action: 'ERROR_IN_ENCOUNTER_TRACKING_API', error: sanitizeError(error) });
        return NextResponse.json({
            error: 'Failed to track encounter session',
        }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
