// src/app/api/appointments/[id]/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';

async function handleGet(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

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

async function handlePatch(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const supabase = await createClient();
        const updates = await context.request.json();
        const { data: appointment, error } = await supabase.from('appointments').update(updates).eq('id', id).select().single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
            user_id: context.user.id,
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

async function handleDelete(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const supabase = await createClient();
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

export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
