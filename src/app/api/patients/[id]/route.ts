import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: patient, error } = await supabase.from('patients').select('*').eq('id', id).single();
        if (error) throw error;
        return NextResponse.json({ patient });
    } catch (error) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const updates = await request.json();
        const { data: patient, error } = await supabase.from('patients').update(updates).eq('id', id).select().single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'update',
            resource_type: 'patient',
            resource_id: id,
            changes: updates
        });

        return NextResponse.json({ patient });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error } = await supabase.from('patients').update({ status: 'inactive' }).eq('id', id);
        if (error) throw error;

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'delete',
            resource_type: 'patient',
            resource_id: id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
    }
}
