// src/app/api/notes/[id]/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// SEC-009: HIPAA-compliant clinical note detail API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { NoteUpdateSchema, validateRequest } from '@/lib/validation/schemas';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing note id' }, { status: 400 });

        const supabase = await createClient();

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
        if (note.organization_id !== context.user.organizationId) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                organizationId: context.user.organizationId ?? undefined,
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
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
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

async function handlePatch(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing note id' }, { status: 400 });

        const supabase = await createClient();

        // Get current note to check if it's signed
        const { data: currentNote } = await supabase
            .from('clinical_notes')
            .select('status, organization_id')
            .eq('id', id)
            .single();

        // Verify organization access
        if (currentNote?.organization_id !== context.user.organizationId) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                organizationId: context.user.organizationId ?? undefined,
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

        const rawData = await context.request.json();

        // Prevent editing locked/in-review notes (allow draft and needs_revision)
        const lockedStatuses = ['signed', 'pending_review', 'approved'];
        if (lockedStatuses.includes(currentNote?.status) && !rawData?.status) {
            return NextResponse.json(
                { error: `Cannot edit notes with status: ${currentNote?.status}` },
                { status: 403 }
            );
        }

        // SEC-REMEDIATION: Validate input with Zod schema
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
            .eq('organization_id', context.user.organizationId) // Ensure org isolation
            .select()
            .single();

        if (error) throw error;

        // Log PHI update
        await logPHIAccess(
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
            'NOTE',
            id,
            'UPDATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ note });
    } catch (error: unknown) {
        logError({
            action: 'note_update_error',
            error: sanitizeError(error),
            resourceType: 'clinical_note',
        });
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }
}

async function handleDelete(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing note id' }, { status: 400 });

        // Use service role client for delete (bypasses RLS after auth check above)
        const adminClient = createServiceRoleClient();
        if (!adminClient) {
            throw new Error('Service role client not available');
        }

        const { error, data: deletedData } = await adminClient
            .from('clinical_notes')
            .delete()
            .eq('id', id)
            .eq('organization_id', context.user.organizationId)
            .select();

        if (error) throw error;

        if (!deletedData || deletedData.length === 0) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Log PHI deletion - HIGH risk event
        await logPHIAccess(
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
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

export const GET = withAuth(handleGet, { requireMFA: true });
export const PATCH = withAuth(handlePatch, { requireMFA: true });
export const DELETE = withAuth(handleDelete, { requiredRole: ['ADMIN', 'SUPER_ADMIN'], requireOrganization: true, requireMFA: true });
