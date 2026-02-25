/**
 * Submit Claim to Clearinghouse API
 * SEC-HIGH-01: Migrated to withAuth wrapper with params support
 * POST /api/managed-billing/claims/[id]/submit
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitClaimToClearinghouse } from '@/lib/managed-billing/clearinghouse-service';
import { withAuth, AuthContext, isSuperAdmin } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handlePost(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing claim id' }, { status: 400 });

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Verify claim belongs to organization
        const { data: claim } = await supabase
            .from('billing_claims')
            .select('id, organization_id, status')
            .eq('id', id)
            .single();

        if (!claim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        if (claim.organization_id !== context.user.organizationId && !isSuperAdmin(context.user)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check claim is ready to submit
        if (!['draft', 'ready', 'rejected'].includes(claim.status)) {
            return NextResponse.json(
                { error: 'Claim cannot be submitted in current status' },
                { status: 400 }
            );
        }

        const result = await submitClaimToClearinghouse(id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            submissionId: result.submissionId,
            clearinghouseClaimId: result.clearinghouseClaimId,
        });
    } catch (error) {
        logError({ action: 'SUBMIT_CLAIM_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost);
