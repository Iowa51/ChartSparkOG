import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        let query = supabase.from('patients').select('*').eq('organization_id', profile.organization_id).order('last_name', { ascending: true });

        if (status && status !== 'all') query = query.eq('status', status);
        if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

        const { data: patients, error } = await query;
        if (error) throw error;

        return NextResponse.json({ patients });
    } catch (error) {
        console.error('Error fetching patients:', error);
        return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        const patientData = await request.json();
        const { data: patient, error } = await supabase.from('patients').insert([{
            ...patientData,
            organization_id: profile.organization_id,
            created_by: user.id
        }]).select().single();

        if (error) throw error;

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            action: 'create',
            resource_type: 'patient',
            resource_id: patient.id
        });

        return NextResponse.json({ patient }, { status: 201 });
    } catch (error) {
        console.error('Error creating patient:', error);
        return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
    }
}
