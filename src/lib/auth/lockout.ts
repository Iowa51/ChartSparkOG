// src/lib/auth/lockout.ts
// Account lockout to prevent brute force attacks

// F-036: Use service role client for server-side lockout operations (bypasses RLS, pre-auth)
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export const LOCKOUT_CONFIG = {
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    resetAttemptsAfter: 15 * 60 * 1000, // 15 minutes
};

export interface LockoutStatus {
    locked: boolean;
    remainingAttempts: number;
    lockoutEndsAt?: Date;
    minutesRemaining?: number;
}

/**
 * Check if an account is locked out
 * Note: This requires the login_attempts table to be created in Supabase
 */
export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
    let supabase;
    try {
        supabase = createServiceRoleClient();
    } catch {
        // F-036: Fail closed when service unavailable
        return { locked: true, remainingAttempts: 0 };
    }

    if (!supabase) {
        return { locked: true, remainingAttempts: 0 };
    }

    try {
        const cutoff = new Date(Date.now() - LOCKOUT_CONFIG.resetAttemptsAfter);

        const { data: attempts, error } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('success', false)
            .gt('created_at', cutoff.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            logError({ action: 'LOCKOUT_CHECK_ERROR', error: sanitizeError(error) });
            // F-036: Fail closed on DB errors
            return { locked: true, remainingAttempts: 0 };
        }

        const failedCount = attempts?.length || 0;

        if (failedCount >= LOCKOUT_CONFIG.maxAttempts) {
            const lastAttempt = attempts?.[0];
            if (lastAttempt) {
                const lockoutEndsAt = new Date(
                    new Date(lastAttempt.created_at).getTime() + LOCKOUT_CONFIG.lockoutDuration
                );

                if (lockoutEndsAt > new Date()) {
                    const minutesRemaining = Math.ceil((lockoutEndsAt.getTime() - Date.now()) / 60000);
                    return {
                        locked: true,
                        remainingAttempts: 0,
                        lockoutEndsAt,
                        minutesRemaining,
                    };
                }
            }
        }

        return {
            locked: false,
            remainingAttempts: Math.max(0, LOCKOUT_CONFIG.maxAttempts - failedCount),
        };
    } catch (err) {
        logError({ action: 'LOCKOUT_CHECK_EXCEPTION', error: sanitizeError(err) });
        // F-036: Fail closed on exceptions
        return { locked: true, remainingAttempts: 0 };
    }
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    let supabase;
    try {
        supabase = createServiceRoleClient();
    } catch {
        return;
    }

    if (!supabase) {
        return;
    }

    try {
        await supabase.from('login_attempts').insert({
            email: email.toLowerCase(),
            ip_address: ipAddress || 'unknown',
            user_agent: userAgent || 'unknown',
            success,
            created_at: new Date().toISOString(),
        });

        // If successful login, clear failed attempts
        if (success) {
            await supabase
                .from('login_attempts')
                .delete()
                .eq('email', email.toLowerCase())
                .eq('success', false);
        }
    } catch (err) {
        logError({ action: 'LOCKOUT_RECORD_ATTEMPT_ERROR', error: sanitizeError(err) });
    }
}

/**
 * Get recent login history for a user (for security dashboard)
 */
export async function getLoginHistory(email: string, limit = 10): Promise<any[]> {
    let supabase;
    try {
        supabase = createServiceRoleClient();
    } catch {
        return [];
    }

    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('email', email.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logError({ action: 'LOCKOUT_FETCH_HISTORY_ERROR', error: sanitizeError(error) });
            return [];
        }

        return data || [];
    } catch (err) {
        logError({ action: 'LOCKOUT_HISTORY_EXCEPTION', error: sanitizeError(err) });
        return [];
    }
}

/**
 * Clear all login attempts for an account (admin action)
 */
export async function clearLockout(email: string): Promise<boolean> {
    let supabase;
    try {
        supabase = createServiceRoleClient();
    } catch {
        return false;
    }

    if (!supabase) {
        return false;
    }

    try {
        const { error } = await supabase
            .from('login_attempts')
            .delete()
            .eq('email', email.toLowerCase())
            .eq('success', false);

        return !error;
    } catch (err) {
        logError({ action: 'LOCKOUT_CLEAR_EXCEPTION', error: sanitizeError(err) });
        return false;
    }
}
