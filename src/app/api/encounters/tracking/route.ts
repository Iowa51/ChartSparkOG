// src/app/api/encounters/tracking/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

/**
 * API Route to track clinical encounter states and maintain a secure audit trail.
 * Logs transitions like 'started', 'paused', 'resumed', 'captured', and 'completed'.
 */

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        const { encounterId, action, metadata, patientId } = await context.request.json();

        if (!encounterId || !action) {
            return NextResponse.json({ error: 'Missing encounterId or action' }, { status: 400 });
        }

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
        const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
                organization_id: context.user.organizationId,
                user_id: context.user.id,
                action: `encounter_${action}`,
                resource_type: 'encounter',
                resource_id: encounterId,
                details: {
                    msg: `Encounter status changed to ${action}`,
                    patient_id: patientId,
                    ...metadata
                },
                ip_address: context.request.headers.get('x-forwarded-for') || 'unknown'
            });

        if (auditError) throw auditError;

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

export const POST = withAuth(handlePost, { requireOrganization: true });
