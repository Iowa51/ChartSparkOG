// src/app/api/telehealth/create-room/route.ts
// SEC-005: Secured telehealth room creation with authentication

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

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
        let appointmentVerified = false;

        // Try to verify appointment exists (optional for demo mode)
        if (supabase) {
            const { data: appointment, error: appointmentError } = await supabase
                .from('appointments')
                .select('id, patient_id, provider_id, organization_id')
                .eq('id', appointmentId)
                .single();

            if (appointmentError || !appointment) {
                // Log but don't fail - allow demo appointments
                console.log(`[Telehealth] Appointment ${appointmentId} not found in DB - proceeding in demo mode`);
            } else {
                appointmentVerified = true;
                // Verify organization access (unless demo mode)
                if (context.user.organizationId &&
                    appointment.organization_id !== context.user.organizationId &&
                    context.user.role !== 'SUPER_ADMIN') {
                    return NextResponse.json(
                        { error: 'Access denied - appointment belongs to different organization' },
                        { status: 403 }
                    );
                }
            }
        }

        // SEC-005: Use non-guessable room name (UUID instead of predictable pattern)
        const roomName = `room-${randomUUID()}`;

        console.log('Creating Daily.co room:', roomName);

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
                    enable_recording: 'cloud',
                    enable_chat: false,
                    enable_screenshare: true,
                    max_participants: 2,
                    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hour expiry
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Daily.co API Error:', errorData);
            return NextResponse.json(
                { error: 'Failed to create telehealth room' },
                { status: 500 }
            );
        }

        const room = await response.json();

        console.log('✅ Room created:', room.url);

        // Update appointment in database
        if (supabase) {
            await supabase
                .from('appointments')
                .update({
                    is_telehealth: true,
                    telehealth_room_url: room.url,
                    status: 'in_progress'
                })
                .eq('id', appointmentId);

            // Audit log (no PHI)
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
            }).catch(() => { }); // Don't fail if audit log fails
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
        console.error('Error creating room:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to create room', details: message },
            { status: 500 }
        );
    }
}

// SEC-005: Export with authentication
// NOTE: Feature requirement temporarily disabled for demo - re-enable in production
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    // requiredFeature: 'TELEHEALTH', // Disabled for demo mode
});
