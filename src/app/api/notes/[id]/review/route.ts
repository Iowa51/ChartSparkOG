// src/app/api/notes/[id]/review/route.ts
// Auditor review actions: approve or request revision

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, feedback } = body;

        if (!action || !['approve', 'needs_revision'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be "approve" or "needs_revision"' },
                { status: 400 }
            );
        }

        if (action === 'needs_revision' && !feedback?.trim()) {
            return NextResponse.json(
                { error: 'Feedback is required when requesting revision' },
                { status: 400 }
            );
        }

        // Use service role client to bypass RLS
        const adminClient = createServiceRoleClient();
        if (!adminClient) {
            throw new Error('Service role client not available');
        }

        // Verify note exists and is pending review
        const { data: note, error: fetchError } = await adminClient
            .from('clinical_notes')
            .select('id, status, patient_id, organization_id')
            .eq('id', id)
            .single();

        if (fetchError || !note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        if (note.status !== 'pending_review') {
            return NextResponse.json(
                { error: `Note is not pending review (current status: ${note.status})` },
                { status: 400 }
            );
        }

        // Build update
        const newStatus = action === 'approve' ? 'approved' : 'needs_revision';
        const updateData: Record<string, unknown> = {
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            reviewer_feedback: action === 'needs_revision' ? feedback.trim() : null,
        };

        const { data: updatedNote, error: updateError } = await adminClient
            .from('clinical_notes')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                patient:patients(id, first_name, last_name)
            `)
            .single();

        if (updateError) throw updateError;

        // Audit log
        await logAuditEvent({
            eventType: action === 'approve' ? 'NOTE_APPROVED' : 'NOTE_REVISION_REQUESTED',
            userId: user.id,
            userEmail: user.email,
            ipAddress,
            userAgent,
            resourceType: 'clinical_note',
            resourceId: id,
            details: {
                action,
                newStatus,
                ...(feedback ? { feedback: feedback.substring(0, 200) } : {}),
            },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({
            note: updatedNote,
            message: action === 'approve'
                ? 'Note approved for billing'
                : 'Revision requested - clinician notified',
        });

    } catch (error) {
        logError({ action: 'note-review', error: error instanceof Error ? error.message : 'Unknown error', resourceId: (await params).id, resourceType: 'clinical_note' });
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
}
