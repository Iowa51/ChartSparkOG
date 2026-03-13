// src/app/api/auth/check-lockout/route.ts
// SEC-REMEDIATION: Brute-force lockout check with fail-closed security

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

const LOCKOUT_CONFIG = {
    maxAttempts: 5,
    lockoutDuration: 5 * 60 * 1000, // 5 minutes (reduced for demo/recovery)
    resetAttemptsAfter: 15 * 60 * 1000, // 15 minutes
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // Skip lockout check only in explicit demo mode
        const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
        if (isDemoMode) {
            console.log('[LOCKOUT] Skipping lockout check - demo mode');
            return NextResponse.json({ locked: false, remainingAttempts: 99 });
        }

        // SEC-REMEDIATION: Use service role client for lockout checks
        // This bypasses RLS since we need to check before user is authenticated
        let supabase;
        try {
            supabase = createServiceRoleClient();
        } catch (err: unknown) {
            // Service role key not configured - allow login but log warning
            console.warn('Lockout check: Service role client not configured.', err);
            return NextResponse.json({ locked: false, remainingAttempts: 5 });
        }

        if (!supabase) {
            // Missing credentials - allow login attempts
            console.warn('Lockout check: Supabase not configured, allowing login');
            return NextResponse.json({ locked: false, remainingAttempts: 5 });
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
                    console.warn('login_attempts table not found - allowing login (run migrations to enable lockout)');
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
                console.warn('login_attempts table not found - allowing login');
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
