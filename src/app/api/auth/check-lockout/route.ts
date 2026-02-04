// src/app/api/auth/check-lockout/route.ts
// SEC-REMEDIATION: Brute-force lockout check with fail-closed security

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';

const LOCKOUT_CONFIG = {
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    resetAttemptsAfter: 15 * 60 * 1000, // 15 minutes
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // SEC-REMEDIATION: Use service role client for lockout checks
        // This bypasses RLS since we need to check before user is authenticated
        let supabase;
        try {
            supabase = createServiceRoleClient();
        } catch (err: any) {
            // Service role key not configured - allow login but log warning
            console.warn('Lockout check: Service role client not configured. Run migrations and set SUPABASE_SERVICE_ROLE_KEY for full security.');
            return NextResponse.json({ locked: false, remainingAttempts: 5 });
        }

        if (!supabase) {
            // Demo mode or missing credentials - allow login attempts
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
                console.error('Lockout check database error:', error);
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
        } catch (dbError: any) {
            // Handle missing table gracefully
            if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
                console.warn('login_attempts table not found - allowing login');
                return NextResponse.json({ locked: false, remainingAttempts: 5 });
            }
            // SEC-REMEDIATION: FAIL CLOSED - don't allow login on other errors
            console.error('login_attempts table error:', dbError);
            return NextResponse.json(
                { locked: true, error: 'Security check failed' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Check lockout error:', error);
        // SEC-REMEDIATION: FAIL CLOSED
        return NextResponse.json(
            { locked: true, error: 'Security check failed' },
            { status: 500 }
        );
    }
}
