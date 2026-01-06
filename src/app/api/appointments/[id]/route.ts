import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: appointment, error } = await supabase.from('appointments').select(`
      *,
      patient:patients(*),
      provider:profiles(*)
    `).eq('id', id).single();
        if (error) throw error;
        return NextResponse.json({ appointment });
    } catch (error) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const updates = await request.json();
        const { data: appointment, error } = await supabase.from('appointments').update(updates).eq('id', id).select().single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'update',
            resource_type: 'appointment',
            resource_id: id,
            changes: updates
        });

        return NextResponse.json({ appointment });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error } = await supabase.from('appointments').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
    }
}
