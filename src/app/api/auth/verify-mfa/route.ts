import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { checkRateLimitByKey } from '@/lib/security/rate-limit';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { VerifyMFASchema, validateRequest } from '@/lib/validation/schemas';

async function handlePost(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        const rateLimitIdentifier = ipAddress !== 'unknown'
            ? ipAddress
            : context.user.id;
        const rateLimitResult = await checkRateLimitByKey(rateLimitIdentifier, 'mfaVerify', 'verify-mfa');

        if (!rateLimitResult.success) {
            return rateLimitResult.response ?? NextResponse.json(
                { error: 'Service temporarily unavailable. Please try again.' },
                { status: 503 }
            );
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'MFA verification unavailable' }, { status: 503 });
        }

        const rawBody = await context.request.json();
        const validation = validateRequest(VerifyMFASchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }

        const { factorId, code } = validation.data;

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId,
        });

        if (challengeError) {
            await logAuditEvent({
                eventType: 'MFA_CHALLENGE_FAILURE',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'mfa_factor',
                resourceId: factorId,
                details: { stage: 'challenge' },
                phiAccessed: false,
                riskLevel: 'MEDIUM',
            });
            return NextResponse.json({ error: challengeError.message }, { status: 400 });
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code,
        });

        if (verifyError) {
            await logAuditEvent({
                eventType: 'MFA_CHALLENGE_FAILURE',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: 'mfa_factor',
                resourceId: factorId,
                details: { stage: 'verify' },
                phiAccessed: false,
                riskLevel: 'MEDIUM',
            });
            return NextResponse.json({ error: verifyError.message }, { status: 400 });
        }

        await logAuditEvent({
            eventType: 'MFA_CHALLENGE_SUCCESS',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: 'mfa_factor',
            resourceId: factorId,
            details: { stage: 'verify' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({ action: 'MFA_VERIFY_ROUTE_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to verify MFA code' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost);
