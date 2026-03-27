/**
 * Claim Validation API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper with params support
 * POST /api/managed-billing/claims/[id]/validate
 */

import { NextResponse } from 'next/server';
import { validateClaimForSubmission, getValidationSummary } from '@/lib/managed-billing/claim-validator';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

async function handlePost(context: AuthContext) {
    try {
        const claimId = context.params?.id;
        if (!claimId) return NextResponse.json({ error: 'Missing claim id' }, { status: 400 });

        const result = await validateClaimForSubmission(claimId, context.user.organizationId || undefined);
        const summary = getValidationSummary(result);

        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'billing_claim',
            resourceId: claimId,
            details: { action: 'CLAIM_VALIDATE', isValid: result.isValid },
            phiAccessed: true,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ ...result, summary });
    } catch (error) {
        logError({ action: 'VALIDATE_CLAIM_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
