// src/app/api/notes/route.ts
// SEC-009: HIPAA-compliant clinical notes API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { NoteCreateSchema, validateRequest } from '@/lib/validation/schemas';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

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

        // Try profiles table first, fallback to users table
        let profile = null;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
            const { data: userData } = await supabase
                .from('users')
                .select('organization_id, email, role')
                .eq('id', user.id)
                .single();

            if (userData) {
                profile = userData;
            } else {
                return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            }
        }

        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');

        // SEC-REMEDIATION: Add pagination to prevent unbounded queries
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const offset = (page - 1) * limit;

        // First get total count for pagination metadata
        let countQuery = supabase
            .from('clinical_notes')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id);

        if (patientId) countQuery = countQuery.eq('patient_id', patientId);

        const { count: totalCount } = await countQuery;

        let query = supabase
            .from('clinical_notes')
            .select(`
                *,
                patient:patients(id, first_name, last_name),
                provider:profiles(id, first_name, last_name)
            `)
            .eq('organization_id', profile.organization_id)
            .order('note_date', { ascending: false })
            .range(offset, offset + limit - 1);

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

        return NextResponse.json({
            notes,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                totalPages: Math.ceil((totalCount || 0) / limit),
            },
        });
    } catch (error) {
        logError({
            action: 'notes_fetch_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
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

        // Try profiles table first, fallback to users table
        let profile = null;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (profileData) {
            profile = profileData;
        } else {
            const { data: userData } = await supabase
                .from('users')
                .select('organization_id, email, role')
                .eq('id', user.id)
                .single();

            if (userData) {
                profile = userData;
            } else {
                return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            }
        }

        const rawData = await request.json();

        // SEC-REMEDIATION: Validate input with Zod schema instead of spreading arbitrary data
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
                type: validatedData.type,
                content: validatedData.content,
                template_id: validatedData.template_id,
                is_signed: validatedData.is_signed,
                is_locked: validatedData.is_locked,
                note_date: rawData.note_date || new Date().toISOString().split('T')[0],
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
                last_visit_date: rawData.note_date || new Date().toISOString().split('T')[0]
            })
            .eq('id', validatedData.patient_id);

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
    } catch (error: any) {
        // Extract error message from various error types
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object') {
            // Supabase errors have message, details, hint properties
            errorMessage = error.message || error.details || error.hint || JSON.stringify(error);
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        logError({
            action: 'note_create_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
        return NextResponse.json({ error: 'Failed to create note', details: errorMessage }, { status: 500 });
    }
}
