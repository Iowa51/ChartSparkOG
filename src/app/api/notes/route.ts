import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');

        let query = supabase.from('clinical_notes').select(`
      *,
      patient:patients(id, first_name, last_name),
      provider:profiles(id, first_name, last_name)
    `).eq('organization_id', profile.organization_id).order('note_date', { ascending: false });

        if (patientId) query = query.eq('patient_id', patientId);

        const { data: notes, error } = await query;
        if (error) throw error;

        return NextResponse.json({ notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const noteData = await request.json();

        const { data: note, error } = await supabase.from('clinical_notes').insert([{
            ...noteData,
            organization_id: profile.organization_id,
            provider_id: user.id
        }]).select().single();

        if (error) throw error;

        await supabase.from('patients').update({
            last_visit_date: noteData.note_date || new Date().toISOString().split('T')[0]
        }).eq('id', noteData.patient_id);

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            action: 'create',
            resource_type: 'clinical_note',
            resource_id: note.id
        });

        return NextResponse.json({ note }, { status: 201 });
    } catch (error) {
        console.error('Error creating note:', error);
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }
}
