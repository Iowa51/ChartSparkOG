/**
 * Claim Validation API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper with params support
 * POST /api/managed-billing/claims/[id]/validate
 */

import { NextResponse } from 'next/server';
import { validateClaimForSubmission, getValidationSummary } from '@/lib/managed-billing/claim-validator';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';

async function handlePost(context: AuthContext) {
    try {
        const claimId = context.params?.id;
        if (!claimId) return NextResponse.json({ error: 'Missing claim id' }, { status: 400 });

        const result = await validateClaimForSubmission(claimId);
        const summary = getValidationSummary(result);

        return NextResponse.json({ ...result, summary });
    } catch (error) {
        console.error('[API] Validate claim error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost);
