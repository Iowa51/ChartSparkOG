// src/app/api/auditor/batch-action/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF + role enforcement

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();

        const body = await context.request.json();
        const { action, submissionIds, reason } = body;

        if (!action || !submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        if (action === 'approve') {
            // Batch approve submissions
            // F-027: Scope to user's organization to prevent cross-org manipulation
            const { error: updateError } = await supabase
                .from('submissions')
                .update({
                    status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .in('id', submissionIds)
                .eq('status', 'pending_audit')
                .eq('organization_id', context.user.organizationId);

            if (updateError) {
                logError({ action: 'ERROR_APPROVING_SUBMISSIONS', error: sanitizeError(updateError) });
                return NextResponse.json({ message: "Failed to approve submissions" }, { status: 500 });
            }

            return NextResponse.json({
                message: `${submissionIds.length} submission(s) approved successfully`
            });

        } else if (action === 'flag') {
            if (!reason) {
                return NextResponse.json({ message: "Flag reason is required" }, { status: 400 });
            }

            // Update submissions to flagged status
            // F-027: Scope to user's organization to prevent cross-org manipulation
            const { error: updateError } = await supabase
                .from('submissions')
                .update({
                    status: 'flagged',
                    updated_at: new Date().toISOString(),
                })
                .in('id', submissionIds)
                .eq('status', 'pending_audit')
                .eq('organization_id', context.user.organizationId);

            if (updateError) {
                logError({ action: 'ERROR_FLAGGING_SUBMISSIONS', error: sanitizeError(updateError) });
                return NextResponse.json({ message: "Failed to flag submissions" }, { status: 500 });
            }

            // Create audit flag records for each submission
            const flagRecords = submissionIds.map((submissionId: string) => ({
                submission_id: submissionId,
                auditor_id: context.user.id,
                reason: reason,
                status: 'open',
                created_at: new Date().toISOString(),
            }));

            const { error: flagError } = await supabase
                .from('audit_flags')
                .insert(flagRecords);

            if (flagError) {
                logError({ action: 'ERROR_CREATING_FLAG_RECORDS', error: sanitizeError(flagError) });
                // Don't fail the whole operation, flag records are secondary
            }

            return NextResponse.json({
                message: `${submissionIds.length} submission(s) flagged successfully`
            });

        } else {
            return NextResponse.json({ message: "Invalid action" }, { status: 400 });
        }

    } catch (error: unknown) {
        logError({ action: 'BATCH_ACTION_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, {
    requiredRole: ['AUDITOR', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
