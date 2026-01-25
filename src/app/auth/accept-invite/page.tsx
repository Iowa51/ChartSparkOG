/**
 * Accept Invitation Page
 * Task 1.3: User Invitation Flow
 * Path: /auth/accept-invite
 * 
 * This page handles invitation acceptance for new users.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Building2,
    Shield,
    ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function AcceptInviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [invitation, setInvitation] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (token) {
            checkInvitation();
        } else {
            setError('Invalid invitation link');
            setLoading(false);
        }
    }, [token]);

    const checkInvitation = async () => {
        setLoading(true);
        try {
            // Check if user is logged in
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            // Validate the token (we'd need a public endpoint for this)
            // For now, we'll just check if user is logged in
            if (!currentUser) {
                // Redirect to login with return URL
                router.push(`/login?redirect=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`);
                return;
            }

            // In a full implementation, we'd validate the token against the database
            // For now, we'll show a confirmation screen
            setInvitation({
                email: currentUser.email,
                token,
            });

        } catch (err: any) {
            console.error('Error checking invitation:', err);
            setError(err.message || 'Failed to validate invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!token || !user) return;

        setAccepting(true);
        setError(null);

        try {
            // Call the database function to accept
            const { data, error: acceptError } = await supabase
                .rpc('accept_invitation', {
                    p_token: token,
                    p_user_id: user.id,
                });

            if (acceptError) throw acceptError;
            if (!data.success) throw new Error(data.error);

            setSuccess(true);

            // Redirect to dashboard after a moment
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (err: any) {
            console.error('Error accepting invitation:', err);
            setError(err.message || 'Failed to accept invitation');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-500">Validating invitation...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 w-full max-w-md text-center">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Welcome to ChartSpark!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Your invitation has been accepted. Redirecting to your dashboard...
                    </p>
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600 mx-auto" />
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
                        <Building2 className="h-8 w-8 text-teal-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        You&apos;ve Been Invited
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Join your organization on ChartSpark
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-800 dark:text-red-200 font-medium">Unable to accept invitation</p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Invitation Details */}
                {invitation && !error && (
                    <>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Signing in as</p>
                            <p className="font-medium text-slate-900 dark:text-white">{invitation.email}</p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        By accepting this invitation, you will join the organization and gain
                                        access to their patient records and clinical tools.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            {accepting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Accepting...
                                </>
                            ) : (
                                <>
                                    Accept Invitation
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* Back to login */}
                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-teal-600"
                    >
                        Sign in with a different account
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        }>
            <AcceptInviteContent />
        </Suspense>
    );
}
