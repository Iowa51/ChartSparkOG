// src/app/api/notes/[id]/sign/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// HIPAA-compliant note signing API - High-risk operation

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEventAsync, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handlePost(context: AuthContext) {
    const noteId = context.params?.id;
    if (!noteId) return NextResponse.json({ error: 'Missing note id' }, { status: 400 });

    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const supabase = await createClient();

        // Get current note to check status, ownership, and provider
        const { data: currentNote, error: fetchError } = await supabase
            .from('clinical_notes')
            .select('id, organization_id, provider_id, is_signed, signed_at, signed_by')
            .eq('id', noteId)
            .single();

        if (fetchError) throw fetchError;

        // SEC-CODEX-3: Verify the signer is the note's provider (or SUPER_ADMIN)
        if (
            currentNote.provider_id !== context.user.id &&
            context.user.role !== 'SUPER_ADMIN'
        ) {
            await logAuditEventAsync({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'clinical_note',
                resourceId: noteId,
                details: { reason: 'Non-owner sign attempt', note_provider_id: currentNote.provider_id },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Only the note provider or a super admin can sign this note' }, { status: 403 });
        }

        // Verify organization access
        if (currentNote.organization_id !== context.user.organizationId) {
            await logAuditEventAsync({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'clinical_note',
                resourceId: noteId,
                details: { reason: 'Cross-organization sign attempt' },
                phiAccessed: false,
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Check if already signed
        if (currentNote.is_signed) {
            return NextResponse.json(
                {
                    error: 'Note already signed',
                    details: {
                        signed_at: currentNote.signed_at,
                        signed_by: currentNote.signed_by
                    }
                },
                { status: 400 }
            );
        }

        const signedAt = new Date().toISOString();

        // Sign the note - atomic operation
        const { data: signedNote, error: updateError } = await supabase
            .from('clinical_notes')
            .update({
                is_signed: true,
                signed_at: signedAt,
                signed_by: context.user.id,
                is_locked: true,
                updated_at: signedAt,
            })
            .eq('id', noteId)
            .eq('organization_id', context.user.organizationId)
            .eq('is_signed', false) // Prevent race condition
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        // High-risk audit log for signing
        await logPHIAccess(
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
            'NOTE',
            noteId,
            'UPDATE',
            ipAddress,
            userAgent
        );

        // Additional audit event for note signing
        await logAuditEventAsync({
            eventType: 'NOTE_SIGN',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'clinical_note',
            resourceId: noteId,
            details: {
                signer_name: context.user.email,
                signed_at: signedAt,
            },
            phiAccessed: true,
            riskLevel: 'HIGH',
        });

        return NextResponse.json({
            success: true,
            note: signedNote,
            message: 'Note signed successfully',
        });
    } catch (error) {
        logError({
            action: 'SIGN_NOTE_ERROR',
            error: sanitizeError(error),
            resourceId: noteId,
        });
        return NextResponse.json(
            { error: 'Failed to sign note' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handlePost);
