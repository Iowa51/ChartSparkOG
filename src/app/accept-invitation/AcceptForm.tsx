'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePassword, getStrengthColor } from '@/lib/auth/password-validation';

type Props = {
    token: string;
    email: string;
    inviterName: string;
    orgName: string;
    role: string;
    expiresAt: string;
};

export default function AcceptForm({ token, email, inviterName, orgName, role, expiresAt }: Props) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordValidation = validatePassword(password, { email });

    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const canSubmit =
        !isLoading &&
        passwordValidation.valid &&
        password === confirmPassword &&
        confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!passwordValidation.valid) {
            setError(passwordValidation.errors[0]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Something went wrong. Please try again.');
                return;
            }

            router.push('/login?accepted=1');
        } catch {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Accept Your Invitation</h1>
                    <p className="mt-2 text-sm text-gray-600">Set your password to create your ChartSpark account</p>
                </div>

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

                <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Create a password"
                                required
                                autoComplete="new-password"
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
                        {password && (
                            <div className="mt-1 flex items-center gap-2">
                                <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${getStrengthColor(passwordValidation.strength)}`}
                                >
                                    {passwordValidation.strength}
                                </span>
                                {!passwordValidation.valid && (
                                    <span className="text-xs text-red-600">{passwordValidation.errors[0]}</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Confirm your password"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                        )}
                        {confirmPassword && password === confirmPassword && (
                            <div className="mt-1 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span className="text-xs text-emerald-600">Passwords match</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            'Accept Invitation & Create Account'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
