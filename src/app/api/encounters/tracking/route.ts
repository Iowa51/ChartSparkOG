// src/app/api/encounters/tracking/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { EncounterTrackingSchema, validateRequest } from '@/lib/validation/schemas';

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

        // 1. Log the encounter tracking event
        const { error: trackingError } = await supabase
            .from('encounter_tracking')
            .insert({
                encounter_id: encounterId,
                user_id: context.user.id,
                organization_id: context.user.organizationId,
                action: action,
                metadata: metadata || {},
                client_timestamp: new Date().toISOString()
            });

        if (trackingError) throw trackingError;

        // 2. Create a high-level security audit log entry
        await logAuditEvent({
            eventType: 'ENCOUNTER_UPDATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress: context.request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: context.request.headers.get('user-agent') || 'unknown',
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
                .eq('id', encounterId);
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
