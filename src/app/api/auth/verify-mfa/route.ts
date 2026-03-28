import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { checkRateLimitByKey } from '@/lib/security/rate-limit';
import { logError, logWarn, sanitizeError } from '@/lib/logging/safe-logger';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { VerifyMFASchema, validateRequest } from '@/lib/validation/schemas';

// SEC-SPRINT8: Stable application-level MFA error codes — never expose upstream messages
const MFA_ERROR_CODES = {
    MFA_INVALID_CODE: 'The verification code is incorrect. Please try again.',
    MFA_EXPIRED: 'The verification code has expired. Please request a new one.',
    MFA_PROVIDER_ERROR: 'MFA verification is temporarily unavailable. Please try again.',
    MFA_RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
} as const;

async function handlePost(context: AuthContext) {
    try {
        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        // SEC-PT2-F6: Always rate-limit MFA by user ID, not IP.
        // User is authenticated at this point so ID is always available.
        // IP-based keying allowed brute-force via IP rotation.
        const rateLimitResult = await checkRateLimitByKey(context.user.id, 'mfaVerify', 'verify-mfa');

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
            // SEC-SPRINT8: Log raw upstream error server-side only, return stable code to client
            logWarn({ action: 'MFA_CHALLENGE_UPSTREAM_ERROR', error: sanitizeError(challengeError) });
            return NextResponse.json({
                error: 'MFA_PROVIDER_ERROR',
                message: MFA_ERROR_CODES.MFA_PROVIDER_ERROR,
            }, { status: 400 });
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
            // SEC-SPRINT8: Log raw upstream error server-side only, return stable code to client
            logWarn({ action: 'MFA_VERIFY_UPSTREAM_ERROR', error: sanitizeError(verifyError) });
            return NextResponse.json({
                error: 'MFA_INVALID_CODE',
                message: MFA_ERROR_CODES.MFA_INVALID_CODE,
            }, { status: 400 });
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
