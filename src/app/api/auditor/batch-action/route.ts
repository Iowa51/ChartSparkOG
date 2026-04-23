// src/app/api/auditor/batch-action/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF + role enforcement
// P1-5: Flag flow made atomic — audit_flags insert precedes status update; orphan cleanup on failure.
//      Approve and flag actions now emit SUBMISSION_REVIEW audit events. Partial-batch failures
//      are reported per-submission instead of aborting the whole batch.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { AuditorBatchActionSchema, validateRequest } from '@/lib/validation/schemas';

type ItemResult = { id: string; status: 'success' | 'failed'; error?: string };

async function handlePost(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        const body = await context.request.json();
        const validation = validateRequest(AuditorBatchActionSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        const { action, submissionIds, reason } = validation.data;

        // F-027: Scope fetch to caller's organization so we never leak cross-org ids.
        const { data: existing, error: fetchError } = await supabase
            .from('submissions')
            .select('id, status')
            .in('id', submissionIds)
            .eq('organization_id', context.user.organizationId);

        if (fetchError) {
            logError({ action: 'BATCH_ACTION_FETCH_ERROR', error: sanitizeError(fetchError) });
            return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 });
        }

        const byId = new Map<string, { id: string; status: string }>(
            (existing || []).map((r: { id: string; status: string }) => [r.id, r])
        );

        const results: ItemResult[] = [];

        for (const id of submissionIds) {
            const row = byId.get(id);
            if (!row) {
                results.push({ id, status: 'failed', error: 'Not found' });
                continue;
            }
            if (row.status !== 'pending_audit') {
                results.push({
                    id,
                    status: 'failed',
                    error: `Cannot ${action} submission with status ${row.status}`,
                });
                continue;
            }

            const now = new Date().toISOString();

            if (action === 'approve') {
                const { error: updateError } = await supabase
                    .from('submissions')
                    .update({ status: 'approved', updated_at: now })
                    .eq('id', id)
                    .eq('organization_id', context.user.organizationId)
                    .eq('status', 'pending_audit');

                if (updateError) {
                    logError({
                        action: 'ERROR_APPROVING_SUBMISSION',
                        error: sanitizeError(updateError),
                        resourceId: id,
                    });
                    results.push({ id, status: 'failed', error: 'Update failed' });
                    continue;
                }

                await logAuditEvent({
                    eventType: 'SUBMISSION_REVIEW',
                    userId: context.user.id,
                    userEmail: context.user.email,
                    userRole: context.user.role,
                    organizationId: context.user.organizationId ?? undefined,
                    ipAddress,
                    userAgent,
                    resourceType: 'submission',
                    resourceId: id,
                    details: {
                        previous_status: row.status,
                        new_status: 'approved',
                        submission_ids: [id],
                    },
                    phiAccessed: false,
                    riskLevel: 'MEDIUM',
                });

                results.push({ id, status: 'success' });
                continue;
            }

            // action === 'flag'
            // P1-5: Insert the audit_flags row FIRST so we never leave a flagged
            // submission without a reason trail.
            const { data: flagRow, error: flagError } = await supabase
                .from('audit_flags')
                .insert({
                    submission_id: id,
                    auditor_id: context.user.id,
                    reason,
                    status: 'open',
                    created_at: now,
                })
                .select('id')
                .single();

            if (flagError || !flagRow) {
                logError({
                    action: 'ERROR_CREATING_FLAG_RECORD',
                    error: sanitizeError(flagError),
                    resourceId: id,
                });
                results.push({ id, status: 'failed', error: 'Failed to create audit flag' });
                continue;
            }

            const { error: updateError } = await supabase
                .from('submissions')
                .update({ status: 'flagged', updated_at: now })
                .eq('id', id)
                .eq('organization_id', context.user.organizationId)
                .eq('status', 'pending_audit');

            if (updateError) {
                // Best-effort orphan cleanup: the flag row references a submission
                // whose status we failed to move, so delete it to keep audit_flags honest.
                const { error: cleanupError } = await supabase
                    .from('audit_flags')
                    .delete()
                    .eq('id', flagRow.id);
                if (cleanupError) {
                    logError({
                        action: 'FLAG_CLEANUP_FAILED',
                        error: sanitizeError(cleanupError),
                        resourceId: id,
                    });
                }
                logError({
                    action: 'ERROR_FLAGGING_SUBMISSION',
                    error: sanitizeError(updateError),
                    resourceId: id,
                });
                results.push({ id, status: 'failed', error: 'Update failed' });
                continue;
            }

            await logAuditEvent({
                eventType: 'SUBMISSION_REVIEW',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'submission',
                resourceId: id,
                details: {
                    previous_status: row.status,
                    new_status: 'flagged',
                    reason: reason ?? null,
                },
                phiAccessed: false,
                riskLevel: 'MEDIUM',
            });

            results.push({ id, status: 'success' });
        }

        return NextResponse.json({ results });
    } catch (error: unknown) {
        logError({ action: 'BATCH_ACTION_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, {
    requiredRole: ['AUDITOR', 'ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
