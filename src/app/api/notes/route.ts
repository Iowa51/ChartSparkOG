// src/app/api/notes/route.ts
// SEC-009: HIPAA-compliant clinical notes API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

export async function GET(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: '/api/notes', method: 'GET' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');

        let query = supabase
            .from('clinical_notes')
            .select(`
                *,
                patient:patients(id, first_name, last_name),
                provider:profiles(id, first_name, last_name)
            `)
            .eq('organization_id', profile.organization_id)
            .order('note_date', { ascending: false });

        if (patientId) query = query.eq('patient_id', patientId);

        const { data: notes, error } = await query;

        if (error) throw error;

        // Log PHI access - viewing clinical notes (highly sensitive)
        await logAuditEvent({
            eventType: patientId ? 'NOTE_VIEW' : 'PATIENT_SEARCH',
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
            ipAddress,
            userAgent,
            resourceType: 'clinical_note',
            resourceId: patientId || undefined,
            details: {
                patientId: patientId || 'all',
                resultCount: notes?.length || 0,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: '/api/notes', method: 'POST' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const noteData = await request.json();

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .insert([{
                ...noteData,
                organization_id: profile.organization_id,
                provider_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Update patient's last visit date
        await supabase
            .from('patients')
            .update({
                last_visit_date: noteData.note_date || new Date().toISOString().split('T')[0]
            })
            .eq('id', noteData.patient_id);

        // Log PHI creation - clinical note is highly sensitive
        await logPHIAccess(
            user.id,
            user.email || '',
            profile.role || 'USER',
            profile.organization_id,
            'NOTE',
            note.id,
            'CREATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ note }, { status: 201 });
    } catch (error) {
        console.error('Error creating note:', error);
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }
}
