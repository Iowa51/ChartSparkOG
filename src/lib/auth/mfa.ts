// src/lib/auth/mfa.ts
// Multi-Factor Authentication utilities using Supabase MFA

import { createClient } from '@/lib/supabase/client';

export interface MFAEnrollmentResult {
    qrCode: string;
    secret: string;
    factorId: string;
}

export interface MFAFactor {
    id: string;
    friendlyName: string;
    factorType: string;
    status: 'verified' | 'unverified';
    createdAt: string;
}

/**
 * Enroll user in MFA with TOTP (Authenticator app)
 */
export async function enrollMFA(): Promise<MFAEnrollmentResult> {
    const supabase = createClient();
    if (!supabase) {
        throw new Error('Supabase client not available');
    }

    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
    });

    if (error) {
        console.error('MFA enrollment error:', error);
        throw new Error(error.message);
    }

    return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
    };
}

/**
 * Verify MFA code during enrollment or login
 */
export async function verifyMFA(factorId: string, code: string): Promise<boolean> {
    const supabase = createClient();
    if (!supabase) {
        throw new Error('Supabase client not available');
    }

    // Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
    });

    if (challengeError) {
        console.error('MFA challenge error:', challengeError);
        throw new Error(challengeError.message);
    }

    // Verify the code
    const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
    });

    if (error) {
        console.error('MFA verification error:', error);
        throw new Error(error.message);
    }

    return true;
}

/**
 * Get user's enrolled MFA factors
 */
export async function getMFAFactors(): Promise<MFAFactor[]> {
    const supabase = createClient();
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
        console.error('Error listing MFA factors:', error);
        return [];
    }

    return data.totp.map((factor: any) => ({
        id: factor.id,
        friendlyName: factor.friendly_name || 'Authenticator App',
        factorType: factor.factor_type,
        status: factor.status,
        createdAt: factor.created_at,
    }));
}

/**
 * Unenroll (disable) MFA factor
 */
export async function unenrollMFA(factorId: string): Promise<boolean> {
    const supabase = createClient();
    if (!supabase) {
        throw new Error('Supabase client not available');
    }

    const { error } = await supabase.auth.mfa.unenroll({
        factorId,
    });

    if (error) {
        console.error('MFA unenroll error:', error);
        throw new Error(error.message);
    }

    return true;
}

/**
 * Check if MFA is required for a given role
 */
export function isMFARequired(role: string): boolean {
    // MFA required for Admin, Super Admin, and Auditor roles
    return ['ADMIN', 'SUPER_ADMIN', 'AUDITOR'].includes(role);
}

/**
 * Check if user has MFA enabled
 */
export async function hasMFAEnabled(): Promise<boolean> {
    const factors = await getMFAFactors();
    return factors.some(factor => factor.status === 'verified');
}

/**
 * Get MFA assurance level for current session
 */
export async function getMFAAssuranceLevel(): Promise<'aal1' | 'aal2' | null> {
    const supabase = createClient();
    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
        console.error('Error getting MFA assurance level:', error);
        return null;
    }

    return data.currentLevel as 'aal1' | 'aal2';
}
