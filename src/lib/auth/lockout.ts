// src/lib/auth/lockout.ts
// Account lockout to prevent brute force attacks

import { createClient } from '@/lib/supabase/client';

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
    const supabase = createClient();

    if (!supabase) {
        // In demo mode, don't lock out
        return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
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
            console.error('Error checking lockout:', error);
            // On error, allow login attempt
            return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
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
        console.error('Lockout check exception:', err);
        return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
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
    const supabase = createClient();

    if (!supabase) {
        return; // Demo mode
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
        console.error('Error recording login attempt:', err);
    }
}

/**
 * Get recent login history for a user (for security dashboard)
 */
export async function getLoginHistory(email: string, limit = 10): Promise<any[]> {
    const supabase = createClient();

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
            console.error('Error fetching login history:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Login history exception:', err);
        return [];
    }
}

/**
 * Clear all login attempts for an account (admin action)
 */
export async function clearLockout(email: string): Promise<boolean> {
    const supabase = createClient();

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
        console.error('Clear lockout exception:', err);
        return false;
    }
}
