import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const date = searchParams.get('date');

        let query = supabase.from('appointments').select(`
      *,
      patient:patients(id, first_name, last_name),
      provider:profiles(id, first_name, last_name)
    `).eq('organization_id', profile.organization_id).order('appointment_datetime', { ascending: true });

        if (status) query = query.eq('status', status);
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('appointment_datetime', startOfDay).lte('appointment_datetime', endOfDay);
        }

        const { data: appointments, error } = await query;
        if (error) throw error;

        return NextResponse.json({ appointments });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const appointmentData = await request.json();

        const { data: appointment, error } = await supabase.from('appointments').insert([{
            ...appointmentData,
            organization_id: profile.organization_id,
            provider_id: appointmentData.provider_id || user.id
        }]).select().single();

        if (error) throw error;

        await supabase.from('patients').update({
            next_appointment_date: appointmentData.appointment_datetime.split('T')[0]
        }).eq('id', appointmentData.patient_id);

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            action: 'create',
            resource_type: 'appointment',
            resource_id: appointment.id
        });

        return NextResponse.json({ appointment }, { status: 201 });
    } catch (error) {
        console.error('Error creating appointment:', error);
        return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }
}
