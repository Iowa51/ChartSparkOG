// End telehealth session - updates appointment status and cleans up Daily.co room

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, logInfo, logWarn, sanitizeError } from '@/lib/logging/safe-logger';
import { TelehealthEndSessionSchema, validateRequest } from '@/lib/validation/schemas';

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
                .select('id, organization_id, telehealth_room_url')
                .eq('id', appointmentId)
                .single();

            if (appointmentError || !appointment) {
                return NextResponse.json(
                    { error: 'Appointment not found' },
                    { status: 404 }
                );
            }

            await logAuditEvent({
                eventType: 'phi_read',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress: context.request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: context.request.headers.get('user-agent') || 'unknown',
                resourceType: 'appointment',
                resourceId: appointment.id,
                details: {
                    access_context: 'telehealth_end_session',
                    resource_type: 'appointment',
                    resource_id: appointment.id,
                },
                phiAccessed: true,
                riskLevel: 'MEDIUM',
            });

            if (context.user.organizationId &&
                appointment.organization_id !== context.user.organizationId &&
                context.user.role !== 'SUPER_ADMIN') {
                return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 }
                );
            }

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
                ipAddress: context.request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: context.request.headers.get('user-agent') || 'unknown',
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
                    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${dailyApiKey}`,
                        },
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
