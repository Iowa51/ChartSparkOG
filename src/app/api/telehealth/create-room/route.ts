// Telehealth room creation via Daily.co API

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { createTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { TelehealthCreateRoomSchema, validateRequest } from '@/lib/validation/schemas';

async function handler(context: AuthContext) {
    try {
        const body = await context.request.json();
        const validation = validateRequest(TelehealthCreateRoomSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }

        const { appointmentId, patientName, providerId } = validation.data;
        const supabase = await createClient();

        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, patient_id, provider_id, organization_id, status, telehealth_room_url')
            .eq('id', appointmentId)
            .single();

        if (appointmentError || !appointment) {
            return NextResponse.json(
                { error: 'Appointment not found or invalid' },
                { status: 400 }
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
                access_context: 'telehealth_room_creation',
                resource_type: 'appointment',
                resource_id: appointment.id,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        if (
            appointment.organization_id !== context.user.organizationId &&
            context.user.role !== 'SUPER_ADMIN'
        ) {
            return NextResponse.json(
                { error: 'Access denied - appointment belongs to different organization' },
                { status: 403 }
            );
        }

        const allowedStatuses = ['scheduled', 'confirmed', 'in_progress'];
        if (!allowedStatuses.includes(appointment.status)) {
            return NextResponse.json(
                { error: `Appointment status '${appointment.status}' is not eligible for telehealth. Must be scheduled, confirmed, or in_progress.` },
                { status: 400 }
            );
        }

        let roomUrl = appointment.telehealth_room_url || null;
        const roomName = roomUrl ? roomUrl.split('/').pop() || '' : `room-${randomUUID()}`;
        const dailyApiKey = process.env.DAILY_API_KEY;

        if (!dailyApiKey) {
            // SEC-SPRINT8: Demo/fallback telehealth is forbidden in production
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Demo telehealth is disabled in production');
            }
            roomUrl = roomUrl || `https://demo.daily.co/${roomName}`;

            await supabase
                .from('appointments')
                .update({
                    is_telehealth: true,
                    telehealth_room_url: roomUrl,
                    status: 'in_progress'
                })
                .eq('id', appointmentId)
                .eq('organization_id', context.user.organizationId);

            const providerSessionTokenRef = await createTelehealthJoinSession({
                appointmentId,
                organizationId: appointment.organization_id,
                participantRole: 'provider',
                roomUrl,
                meetingToken: 'demo-provider-token',
            });

            const patientSessionTokenRef = await createTelehealthJoinSession({
                appointmentId,
                organizationId: appointment.organization_id,
                participantRole: 'patient',
                roomUrl,
                meetingToken: 'demo-patient-token',
            });

            return NextResponse.json({
                appointmentId,
                providerSessionTokenRef,
                patientSessionTokenRef,
                patientJoinPath: `/telehealth/join?session=${encodeURIComponent(patientSessionTokenRef)}`,
                isDemo: true,
            });
        }

        if (!roomUrl) {
            const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${dailyApiKey}`
                },
                body: JSON.stringify({
                    name: roomName,
                    privacy: 'private',
                    properties: {
                        enable_chat: true,
                        enable_screenshare: true,
                        max_participants: 2,
                        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
                    }
                })
            });

            if (!roomResponse.ok) {
                const errorData = await roomResponse.json().catch(() => ({ error: 'Unknown error' }));
                logError({ action: 'DAILY_API_ERROR', error: sanitizeError(errorData), status: String(roomResponse.status) });
                return NextResponse.json(
                    { error: 'Failed to create telehealth room' },
                    { status: 500 }
                );
            }

            const room = await roomResponse.json();
            roomUrl = room.url;
        }

        const providerTokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dailyApiKey}`
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    user_name: `Provider ${providerId || context.user.id}`,
                    is_owner: true,
                    enable_recording: 'cloud'
                }
            })
        });

        const patientTokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dailyApiKey}`
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    user_name: patientName || 'Patient'
                }
            })
        });

        if (!providerTokenResponse.ok || !patientTokenResponse.ok) {
            logError({
                action: 'DAILY_TOKEN_GENERATION_ERROR',
                status: `${providerTokenResponse.status}:${patientTokenResponse.status}`,
            });
            return NextResponse.json({ error: 'Failed to create telehealth session access' }, { status: 500 });
        }

        const providerToken = await providerTokenResponse.json();
        const patientToken = await patientTokenResponse.json();

        await supabase
            .from('appointments')
            .update({
                is_telehealth: true,
                telehealth_room_url: roomUrl,
                status: 'in_progress'
            })
            .eq('id', appointmentId)
            .eq('organization_id', context.user.organizationId);

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
                telehealth_action: 'room_created',
            },
        });

        const providerSessionTokenRef = await createTelehealthJoinSession({
            appointmentId,
            organizationId: appointment.organization_id,
            participantRole: 'provider',
            roomUrl,
            meetingToken: providerToken.token,
        });

        const patientSessionTokenRef = await createTelehealthJoinSession({
            appointmentId,
            organizationId: appointment.organization_id,
            participantRole: 'patient',
            roomUrl,
            meetingToken: patientToken.token,
        });

        return NextResponse.json({
            appointmentId,
            providerSessionTokenRef,
            patientSessionTokenRef,
            patientJoinPath: `/telehealth/join?session=${encodeURIComponent(patientSessionTokenRef)}`,
        });
    } catch (error: unknown) {
        logError({ action: 'ERROR_CREATING_ROOM', error: sanitizeError(error) });
        return NextResponse.json(
            { error: 'Failed to create telehealth room' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
