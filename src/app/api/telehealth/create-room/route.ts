// Telehealth room creation via Daily.co API

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handler(context: AuthContext) {
    try {
        const body = await context.request.json();
        const { appointmentId, patientName, providerId } = body;

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'appointmentId required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // SEC-CODEX-4: Hard-fail if appointment lookup fails or returns null
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

        // Verify organization ownership
        if (
            appointment.organization_id !== context.user.organizationId &&
            context.user.role !== 'SUPER_ADMIN'
        ) {
            return NextResponse.json(
                { error: 'Access denied - appointment belongs to different organization' },
                { status: 403 }
            );
        }

        // Verify appointment status is eligible for telehealth
        const ALLOWED_STATUSES = ['scheduled', 'confirmed', 'in_progress'];
        if (!ALLOWED_STATUSES.includes(appointment.status)) {
            return NextResponse.json(
                { error: `Appointment status '${appointment.status}' is not eligible for telehealth. Must be scheduled, confirmed, or in_progress.` },
                { status: 400 }
            );
        }

        // If appointment is already in_progress and has an existing room, return it
        if (appointment.status === 'in_progress' && appointment.telehealth_room_url) {
            return NextResponse.json({
                roomUrl: appointment.telehealth_room_url,
                roomName: appointment.telehealth_room_url.split('/').pop() || '',
                existingRoom: true,
            });
        }

        // SEC-005: Use non-guessable room name (UUID instead of predictable pattern)
        const roomName = `room-${randomUUID()}`;

        // Room creation logged via audit log below — no console output of room names

        // Check if Daily API is configured
        const dailyApiKey = process.env.DAILY_API_KEY;
        if (!dailyApiKey) {
            // Demo mode - return mock room
            return NextResponse.json({
                roomUrl: `https://demo.daily.co/${roomName}`,
                roomName: roomName,
                providerToken: 'demo-provider-token',
                patientToken: 'demo-patient-token',
                isDemo: true
            });
        }

        const response = await fetch('https://api.daily.co/v1/rooms', {
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
                    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hour expiry
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            logError({ action: 'DAILY_API_ERROR', error: sanitizeError(errorData), status: String(response.status) });
            return NextResponse.json(
                { error: 'Failed to create telehealth room' },
                { status: 500 }
            );
        }

        const room = await response.json();

        // Room URL logged via audit log below

        // Update appointment in database (optional - may not exist for demo)
        if (supabase) {
            try {
                await supabase
                    .from('appointments')
                    .update({
                        is_telehealth: true,
                        telehealth_room_url: room.url,
                        status: 'in_progress'
                    })
                    .eq('id', appointmentId);
            } catch {
                // Ignore - demo appointments may not exist
            }

            // Audit log (no PHI) - wrapped in try-catch
            try {
                await supabase.from('audit_logs').insert({
                    event_type: 'TELEHEALTH_ROOM_CREATED',
                    user_id: context.user.id,
                    user_email: context.user.email,
                    user_role: context.user.role,
                    organization_id: context.user.organizationId,
                    resource_type: 'telehealth_room',
                    resource_id: appointmentId,
                    ip_address: context.request.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: context.request.headers.get('user-agent') || 'unknown',
                    risk_level: 'LOW',
                    details: { roomName }, // Only room name, no patient info
                });
            } catch {
                // Don't fail if audit log fails
            }
        }

        // Generate meeting tokens
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

        const providerToken = await providerTokenResponse.json();
        const patientToken = await patientTokenResponse.json();

        return NextResponse.json({
            roomUrl: room.url,
            roomName: room.name,
            providerToken: providerToken.token,
            patientToken: patientToken.token
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
});
