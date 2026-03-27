// src/app/api/auth/check-lockout/route.ts
// SEC-REMEDIATION: Brute-force lockout check with fail-closed security

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, logInfo, logWarn, sanitizeError } from '@/lib/logging/safe-logger';
import { CheckLockoutSchema, validateRequest } from '@/lib/validation/schemas';
import { checkRateLimitByKey } from '@/lib/security/rate-limit';

// SEC-PT1-F3: 30-minute lockout in production, 5 minutes in development
const isProduction = process.env.NODE_ENV === 'production';
const LOCKOUT_CONFIG = {
    maxAttempts: 5,
    lockoutDuration: isProduction ? 30 * 60 * 1000 : 5 * 60 * 1000,
    resetAttemptsAfter: 15 * 60 * 1000, // 15 minutes
};

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.json();
        const validation = validateRequest(CheckLockoutSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const { email } = validation.data;

        // SEC-PT1-F3: Per-email rate limiting to prevent brute force via IP rotation.
        // This limit applies across all IPs for the same email address.
        const emailRateLimit = await checkRateLimitByKey(
            email.toLowerCase(),
            'loginEmail',
            'check-lockout'
        );
        if (!emailRateLimit.success && emailRateLimit.response) {
            return NextResponse.json(
                { locked: true, message: 'Too many login attempts for this account. Please try again later.' },
                { status: 429 }
            );
        }

        // Skip lockout check only in explicit demo mode AND non-production
        const isDemoMode = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
        if (isDemoMode) {
            logInfo({ action: 'LOCKOUT_SKIP_DEMO_MODE' });
            return NextResponse.json({ locked: false, remainingAttempts: 99 });
        }

        // SEC-REMEDIATION: Use service role client for lockout checks
        // This bypasses RLS since we need to check before user is authenticated
        let supabase;
        try {
            supabase = createServiceRoleClient();
        } catch (err: unknown) {
            // F-019: FAIL CLOSED - infrastructure unavailable
            logError({ action: 'LOCKOUT_SERVICE_ROLE_UNAVAILABLE', error: sanitizeError(err) });
            return NextResponse.json(
                { locked: true, error: 'Security infrastructure unavailable' },
                { status: 503 }
            );
        }

        if (!supabase) {
            // F-019: FAIL CLOSED - infrastructure unavailable
            logError({ action: 'LOCKOUT_SUPABASE_UNAVAILABLE', error: 'Service role client returned null' });
            return NextResponse.json(
                { locked: true, error: 'Security infrastructure unavailable' },
                { status: 503 }
            );
        }

        // Get recent failed attempts
        const cutoff = new Date(Date.now() - LOCKOUT_CONFIG.resetAttemptsAfter);

        try {
            const { data: attempts, error } = await supabase
                .from('login_attempts')
                .select('created_at')
                .eq('email', email.toLowerCase())
                .eq('success', false)
                .gt('created_at', cutoff.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                // Handle missing table gracefully (table may not exist yet)
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    logWarn({ action: 'LOCKOUT_TABLE_NOT_FOUND', status: 'allowing_login' });
                    return NextResponse.json({ locked: false, remainingAttempts: 5 });
                }
                // SEC-REMEDIATION: FAIL CLOSED on other database errors
                logError({ action: 'LOCKOUT_CHECK_DATABASE_ERROR', error: sanitizeError(error) });
                return NextResponse.json(
                    { locked: true, error: 'Security check failed' },
                    { status: 500 }
                );
            }

            const failedCount = attempts?.length || 0;

            if (failedCount >= LOCKOUT_CONFIG.maxAttempts) {
                const lastAttempt = attempts?.[0];
                if (lastAttempt) {
                    const lockoutEndsAt = new Date(
                        new Date(lastAttempt.created_at).getTime() + LOCKOUT_CONFIG.lockoutDuration
                    );

                    if (lockoutEndsAt > new Date()) {
                        return NextResponse.json({
                            locked: true,
                            remainingAttempts: 0,
                            lockoutEndsAt: lockoutEndsAt.toISOString(),
                            message: `Account locked due to too many failed attempts. Try again at ${lockoutEndsAt.toLocaleTimeString()}`,
                        });
                    }
                }
            }

            return NextResponse.json({
                locked: false,
                remainingAttempts: Math.max(0, LOCKOUT_CONFIG.maxAttempts - failedCount),
            });
        } catch (dbError: unknown) {
            // Handle missing table gracefully
            const errObj = dbError as { code?: string; message?: string };
            if (errObj?.code === '42P01' || errObj?.message?.includes('does not exist')) {
                logWarn({ action: 'LOCKOUT_TABLE_NOT_FOUND', status: 'allowing_login' });
                return NextResponse.json({ locked: false, remainingAttempts: 5 });
            }
            // SEC-REMEDIATION: FAIL CLOSED - don't allow login on other errors
            logError({ action: 'LOGIN_ATTEMPTS_TABLE_ERROR', error: sanitizeError(dbError) });
            return NextResponse.json(
                { locked: true, error: 'Security check failed' },
                { status: 500 }
            );
        }

    } catch (error) {
        logError({ action: 'CHECK_LOCKOUT_ERROR', error: sanitizeError(error) });
        // SEC-REMEDIATION: FAIL CLOSED
        return NextResponse.json(
            { locked: true, error: 'Security check failed' },
            { status: 500 }
        );
    }
}
