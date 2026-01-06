import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: note, error } = await supabase.from('clinical_notes').select(`
      *,
      patient:patients(*),
      provider:profiles(*)
    `).eq('id', id).single();
        if (error) throw error;
        return NextResponse.json({ note });
    } catch (error) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const updates = await request.json();
        const { data: note, error } = await supabase.from('clinical_notes').update(updates).eq('id', id).select().single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'update',
            resource_type: 'clinical_note',
            resource_id: id,
            changes: updates
        });

        return NextResponse.json({ note });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }
}
