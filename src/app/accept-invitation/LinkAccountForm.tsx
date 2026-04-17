'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

type Props = {
    token: string;
    email: string;
    inviterName: string;
    orgName: string;
    role: string;
    expiresAt: string;
};

function InviteDetails({
    inviterName,
    orgName,
    role,
    expiresAt,
}: Pick<Props, 'inviterName' | 'orgName' | 'role' | 'expiresAt'>) {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="space-y-1 text-sm">
                <p className="text-gray-600">
                    Invited by <span className="font-medium text-gray-900">{inviterName}</span>
                </p>
                <p className="text-gray-600">
                    Organization: <span className="font-medium text-gray-900">{orgName}</span>
                </p>
                <p className="text-gray-600">
                    Role: <span className="font-medium text-gray-900">{role}</span>
                </p>
                <p className="text-gray-500 text-xs">Invitation expires {expiryDate}</p>
            </div>
        </div>
    );
}

export default function LinkAccountForm({ token, email, inviterName, orgName, role, expiresAt }: Props) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [error, setError] = useState('');

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSigningIn(true);

        try {
            const supabase = createBrowserClient();
            if (!supabase) {
                setError('Authentication service is unavailable');
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase(),
                password,
            });

            if (signInError) {
                setError('Invalid credentials. Please check your password and try again.');
                return;
            }

            setIsSignedIn(true);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleAccept = async () => {
        setError('');
        setIsAccepting(true);

        try {
            const res = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Something went wrong. Please try again.');
                return;
            }

            router.push('/dashboard');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsAccepting(false);
        }
    };

    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Accept Your Invitation</h1>
                    </div>

                    <InviteDetails
                        inviterName={inviterName}
                        orgName={orgName}
                        role={role}
                        expiresAt={expiresAt}
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-blue-800">
                            You already have a ChartSpark account with this email. Sign in below to accept
                            this invitation.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSignIn}
                        className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
                    >
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full pl-9 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your account password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSigningIn || !password}
                            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSigningIn ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In to Continue'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Accept Your Invitation</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        You&apos;re signed in. Confirm to join the organization below.
                    </p>
                </div>

                <InviteDetails
                    inviterName={inviterName}
                    orgName={orgName}
                    role={role}
                    expiresAt={expiresAt}
                />

                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleAccept}
                        disabled={isAccepting}
                        className="w-full py-3 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAccepting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Accepting...
                            </>
                        ) : (
                            'Accept Invitation'
                        )}
                    </button>
                    <a href="/dashboard" className="block text-center text-sm text-gray-600 hover:text-gray-900">
                        Cancel
                    </a>
                </div>
            </div>
        </div>
    );
}
