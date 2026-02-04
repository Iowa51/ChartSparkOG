// src/app/api/notes/[id]/route.ts
// SEC-009: HIPAA-compliant clinical note detail API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { NoteUpdateSchema, validateRequest } from '@/lib/validation/schemas';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/notes/${id}`, method: 'GET' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles first, fallback to users
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
            }
        }

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .select(`
                *,
                patient:patients(id, first_name, last_name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Verify organization access
        if (note.organization_id !== profile?.organization_id) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: user.id,
                userEmail: user.email,
                organizationId: profile?.organization_id,
                ipAddress,
                userAgent,
                resourceType: 'clinical_note',
                resourceId: id,
                details: { reason: 'Cross-organization access attempt' },
                phiAccessed: false,
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Log PHI access - viewing clinical note
        await logPHIAccess(
            user.id,
            user.email || '',
            profile?.role || 'USER',
            profile?.organization_id || '',
            'NOTE',
            id,
            'VIEW',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ note });
    } catch (error) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/notes/${id}`, method: 'PATCH' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles first, fallback to users
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
            }
        }

        // Get current note to check if it's signed
        const { data: currentNote } = await supabase
            .from('clinical_notes')
            .select('status, organization_id')
            .eq('id', id)
            .single();

        // Verify organization access
        if (currentNote?.organization_id !== profile?.organization_id) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: user.id,
                userEmail: user.email,
                organizationId: profile?.organization_id,
                ipAddress,
                userAgent,
                resourceType: 'clinical_note',
                resourceId: id,
                details: { reason: 'Cross-organization edit attempt' },
                phiAccessed: false,
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Prevent editing signed notes
        if (currentNote?.status === 'signed') {
            return NextResponse.json(
                { error: 'Cannot edit signed notes' },
                { status: 403 }
            );
        }

        const rawData = await request.json();

        // SEC-REMEDIATION: Validate input with Zod schema instead of spreading arbitrary data
        const validation = validateRequest(NoteUpdateSchema, rawData);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const validatedUpdates = validation.data;

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .update(validatedUpdates)
            .eq('id', id)
            .eq('organization_id', profile?.organization_id) // Ensure org isolation
            .select()
            .single();

        if (error) throw error;

        // Log PHI update - clinical note modification
        await logPHIAccess(
            user.id,
            user.email || '',
            profile?.role || 'USER',
            profile?.organization_id || '',
            'NOTE',
            id,
            'UPDATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ note });
    } catch (error) {
        logError({
            action: 'note_update_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/notes/${id}`, method: 'DELETE' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try profiles first, fallback to users
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
            }
        }

        // Use service role client for delete (bypasses RLS after auth check above)
        const adminClient = createServiceRoleClient();
        if (!adminClient) {
            throw new Error('Service role client not available');
        }

        const { error, data: deletedData } = await adminClient
            .from('clinical_notes')
            .delete()
            .eq('id', id)
            .select();

        if (error) throw error;

        if (!deletedData || deletedData.length === 0) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Log PHI deletion - HIGH risk event
        await logPHIAccess(
            user.id,
            user.email || '',
            profile?.role || 'USER',
            profile?.organization_id || '',
            'NOTE',
            id,
            'DELETE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({
            action: 'note_delete_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }
}
