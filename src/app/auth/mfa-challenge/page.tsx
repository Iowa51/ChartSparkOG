/**
 * MFA Challenge Page
 * Task 0.2: Multi-Factor Authentication Verification
 * Path: /auth/mfa-challenge
 * 
 * This page is shown when a user with MFA enabled needs to verify their code
 * to complete authentication (achieve AAL2).
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Shield,
    Loader2,
    AlertTriangle,
    Lock,
    ArrowLeft,
} from 'lucide-react';
import { getMFAFactors, verifyMFA, MFAFactor } from '@/lib/auth/mfa';
import { sanitizeRedirectPath } from '@/lib/security/redirects';

function MFAChallengeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'));

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [factors, setFactors] = useState<MFAFactor[]>([]);
    const [selectedFactor, setSelectedFactor] = useState<MFAFactor | null>(null);

    useEffect(() => {
        loadFactors();
    }, []);

    const loadFactors = async () => {
        setLoading(true);
        try {
            const factorList = await getMFAFactors();
            const verifiedFactors = factorList.filter(f => f.status === 'verified');
            setFactors(verifiedFactors);

            if (verifiedFactors.length > 0) {
                setSelectedFactor(verifiedFactors[0]);
            }
        } catch (err: any) {
            console.error('Error loading MFA factors:', err);
            setError('Failed to load authenticator information');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6 || !selectedFactor) return;

        setVerifying(true);
        setError(null);

        try {
            await verifyMFA(selectedFactor.id, code);
            // Verification successful, redirect to intended page
            router.push(redirectTo);
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
            setCode('');
        } finally {
            setVerifying(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && code.length === 6) {
            handleVerify();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-6">
                        <Shield className="h-8 w-8 text-teal-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Two-Factor Authentication
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Enter the code from your authenticator app
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* No factors */}
                {factors.length === 0 ? (
                    <div className="text-center">
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            No authenticator found. Please set up two-factor authentication.
                        </p>
                        <Link
                            href="/settings/security/mfa"
                            className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors"
                        >
                            Set Up MFA
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Code Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                onKeyPress={handleKeyPress}
                                placeholder="000000"
                                autoFocus
                                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                            />
                        </div>

                        {/* Verify Button */}
                        <button
                            onClick={handleVerify}
                            disabled={code.length !== 6 || verifying}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            {verifying ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Lock className="h-5 w-5" />
                                    Verify
                                </>
                            )}
                        </button>

                        {/* Help text */}
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                            Open your authenticator app to find the code
                        </p>

                        {/* Back to login */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 text-sm"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Sign in with a different account
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function MFAChallengePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        }>
            <MFAChallengeContent />
        </Suspense>
    );
}
