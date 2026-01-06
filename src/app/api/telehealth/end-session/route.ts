import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { appointmentId } = await request.json();

        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId required' }, { status: 400 });
        }

        const supabase = await createClient();

        const { error } = await supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', appointmentId);

        if (error) {
            throw error;
        }

        console.log(`✅ Session ended for appointment ${appointmentId}`);

        return NextResponse.json({
            success: true,
            message: 'Session ended. Recording will be available shortly.'
        });

    } catch (error: any) {
        console.error('Error ending session:', error);
        return NextResponse.json({ error: 'Failed to end session', details: error.message }, { status: 500 });
    }
}
