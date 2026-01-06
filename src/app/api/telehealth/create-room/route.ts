import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { appointmentId, patientName, providerId } = await request.json();

        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId required' }, { status: 400 });
        }

        const roomName = `appointment-${appointmentId}-${Date.now()}`;

        console.log('Creating Daily.co room:', roomName);

        const response = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
            },
            body: JSON.stringify({
                name: roomName,
                privacy: 'private',
                properties: {
                    enable_recording: 'cloud',
                    enable_chat: false,
                    enable_screenshare: true,
                    max_participants: 2,
                    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Daily.co API Error:', errorData);
            throw new Error(`Daily.co failed: ${errorData.error || 'Unknown error'}`);
        }

        const room = await response.json();

        console.log('✅ Room created:', room.url);

        const supabase = await createClient();

        await supabase
            .from('appointments')
            .update({
                is_telehealth: true,
                telehealth_room_url: room.url,
                status: 'in_progress'
            })
            .eq('id', appointmentId);

        const providerTokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    user_name: `Provider ${providerId}`,
                    is_owner: true,
                    enable_recording: 'cloud'
                }
            })
        });

        const patientTokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
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

    } catch (error: any) {
        console.error('Error creating room:', error);
        return NextResponse.json(
            { error: 'Failed to create room', details: error.message },
            { status: 500 }
        );
    }
}
