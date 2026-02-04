// src/app/api/notes/[id]/sign/route.ts
// HIPAA-compliant note signing API
// High-risk operation with comprehensive audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventAsync, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: noteId } = await params;
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role, full_name')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Get current note to check status and ownership
        const { data: currentNote, error: fetchError } = await supabase
            .from('clinical_notes')
            .select('id, organization_id, is_signed, signed_at, signed_by')
            .eq('id', noteId)
            .single();

        if (fetchError) throw fetchError;

        // Verify organization access
        if (currentNote.organization_id !== profile.organization_id) {
            await logAuditEventAsync({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: user.id,
                userEmail: user.email,
                userRole: profile.role,
                organizationId: profile.organization_id,
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
                signed_by: user.id,
                is_locked: true, // Lock the note when signed
                updated_at: signedAt,
            })
            .eq('id', noteId)
            .eq('organization_id', profile.organization_id)
            .eq('is_signed', false) // Prevent race condition
            .select()
            .single();

        if (updateError) {
            // Could be due to race condition or other error
            throw updateError;
        }

        // High-risk audit log for signing
        await logPHIAccess(
            user.id,
            user.email || '',
            profile.role || 'USER',
            profile.organization_id,
            'NOTE',
            noteId,
            'UPDATE',
            ipAddress,
            userAgent
        );

        // Additional audit event for note signing
        await logAuditEventAsync({
            eventType: 'NOTE_SIGN',
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
            ipAddress,
            userAgent,
            resourceType: 'clinical_note',
            resourceId: noteId,
            details: {
                signer_name: profile.full_name || user.email,
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
            { error: error instanceof Error ? error.message : 'Failed to sign note' },
            { status: 500 }
        );
    }
}
