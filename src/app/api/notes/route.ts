// HIPAA-compliant clinical notes API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent, logAuditEventAsync, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { NoteCreateSchema, validateRequest } from '@/lib/validation/schemas';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { user } = context;

        if (!user.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const supabase = await createClient();

        const searchParams = context.request.nextUrl.searchParams;
        const patientId = searchParams.get('patient_id') || searchParams.get('patientId');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const offset = (page - 1) * limit;

        // Get total count for pagination
        let countQuery = supabase
            .from('clinical_notes')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', user.organizationId);

        if (patientId) countQuery = countQuery.eq('patient_id', patientId);

        const { count: totalCount } = await countQuery;

        let query = supabase
            .from('clinical_notes')
            .select(`
                *,
                patient:patients(id, first_name, last_name)
            `)
            .eq('organization_id', user.organizationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (patientId) query = query.eq('patient_id', patientId);

        const { data: notes, error } = await query;

        if (error) throw error;

        logAuditEventAsync({
            eventType: patientId ? 'NOTE_VIEW' : 'PATIENT_SEARCH',
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            organizationId: user.organizationId,
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

        return NextResponse.json({
            notes,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
            },
        });
    } catch (error: unknown) {
        logError({
            action: 'notes_fetch_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }
}

async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const { user } = context;

        if (!user.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const supabase = await createClient();
        const rawData = await context.request.json();

        const validation = validateRequest(NoteCreateSchema, rawData);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .insert([{
                patient_id: validatedData.patient_id,
                encounter_id: validatedData.encounter_id,
                content: validatedData.content,
                template_id: validatedData.template_id,
                status: validatedData.is_signed ? 'signed' : 'draft',
                signed_at: validatedData.is_signed ? new Date().toISOString() : null,
                organization_id: user.organizationId,
                provider_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Update patient's last visit date
        await supabase
            .from('patients')
            .update({
                last_visit_date: rawData.note_date || new Date().toISOString().split('T')[0]
            })
            .eq('id', validatedData.patient_id);

        await logPHIAccess(
            user.id,
            user.email,
            user.role,
            user.organizationId,
            'NOTE',
            note.id,
            'CREATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ note }, { status: 201 });
    } catch (error: unknown) {
        logError({
            action: 'note_create_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});

export const POST = withAuth(handlePost, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
