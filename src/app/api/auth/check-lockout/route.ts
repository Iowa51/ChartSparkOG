// src/app/api/auth/check-lockout/route.ts
// SEC-014: Check if account is locked due to failed login attempts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

        const supabase = await createClient();
        if (!supabase) {
            // In demo mode without Supabase, no lockout
            return NextResponse.json({ locked: false, remainingAttempts: 5 });
        }

        // Get recent failed attempts
        const cutoff = new Date(Date.now() - LOCKOUT_CONFIG.resetAttemptsAfter);

        try {
            const { data: attempts } = await supabase
                .from('login_attempts')
                .select('created_at')
                .eq('email', email.toLowerCase())
                .eq('success', false)
                .gt('created_at', cutoff.toISOString())
                .order('created_at', { ascending: false });

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
        } catch (dbError) {
            // Table might not exist - no lockout
            console.warn('login_attempts table not available for lockout check');
            return NextResponse.json({ locked: false, remainingAttempts: 5 });
        }

    } catch (error) {
        console.error('Check lockout error:', error);
        // Fail open - don't lock user out due to check error
        return NextResponse.json({ locked: false, remainingAttempts: 5 });
    }
}
