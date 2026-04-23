// End telehealth session - updates appointment status and cleans up Daily.co room

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, logInfo, logWarn, sanitizeError } from '@/lib/logging/safe-logger';
import { TelehealthEndSessionSchema, validateRequest } from '@/lib/validation/schemas';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

async function handler(context: AuthContext) {
    try {
        const body = await context.request.json();
        const validation = validateRequest(TelehealthEndSessionSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }

        const { appointmentId } = validation.data;
        const supabase = await createClient();

        if (supabase) {
            const { data: appointment, error: appointmentError } = await supabase
                .from('appointments')
                .select('id, organization_id, provider_id, telehealth_room_url')
                .eq('id', appointmentId)
                .single();

            if (appointmentError || !appointment) {
                return NextResponse.json(
                    { error: 'Appointment not found' },
                    { status: 404 }
                );
            }

            // SEC-PT4-F4: Authorization BEFORE audit — prevents false phi_read entries.
            // Strict equality check (no truthy guard on organizationId — withAuth ensures it).
            if (
                appointment.organization_id !== context.user.organizationId &&
                context.user.role !== 'SUPER_ADMIN'
            ) {
                return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 }
                );
            }

            // SEC-PT4-F5 (Medium): Only the assigned provider or admin can end a session
            if (
                appointment.provider_id !== context.user.id &&
                !['ADMIN', 'SUPER_ADMIN'].includes(context.user.role)
            ) {
                return NextResponse.json(
                    { error: 'Not authorized to end this session' },
                    { status: 403 }
                );
            }

            // SEC-PT4-F4: Audit PHI access AFTER authorization confirmed
            const { ipAddress, userAgent } = getRequestMetadata(context.request);
            await logAuditEvent({
                eventType: 'phi_read',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'appointment',
                resourceId: appointment.id,
                details: {
                    access_context: 'telehealth_end_session',
                },
                phiAccessed: true,
                riskLevel: 'MEDIUM',
            });

            const { error } = await supabase
                .from('appointments')
                .update({ status: 'completed' })
                .eq('id', appointmentId)
                .eq('organization_id', context.user.organizationId);

            if (error) {
                throw error;
            }

            await logAuditEvent({
                eventType: 'APPOINTMENT_UPDATE',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'telehealth_room',
                resourceId: appointmentId,
                riskLevel: 'LOW',
                details: {
                    telehealth_action: 'session_ended',
                },
            }).catch(() => { });

            const roomName = appointment.telehealth_room_url?.split('/').pop();
            const dailyApiKey = process.env.DAILY_API_KEY;
            if (dailyApiKey && roomName) {
                try {
                    await fetchWithTimeout(`https://api.daily.co/v1/rooms/${roomName}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${dailyApiKey}`,
                        },
                        timeoutMs: 15000,
                    });
                } catch (deleteError) {
                    logWarn({ action: 'TELEHEALTH_DAILY_ROOM_DELETE_FAILED', error: sanitizeError(deleteError) });
                }
            }
        }

        logInfo({ action: 'TELEHEALTH_SESSION_ENDED', resourceId: appointmentId });

        return NextResponse.json({
            success: true,
            message: 'Session ended. Recording will be available shortly.'
        });
    } catch (error: unknown) {
        logError({ action: 'ERROR_ENDING_SESSION', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to end session' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
