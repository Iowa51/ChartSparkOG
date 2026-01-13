'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { validatePassword, getStrengthColor } from '@/lib/auth/password-validation';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const validation = validatePassword(newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate new password
        if (!validation.valid) {
            setError(validation.errors[0]);
            return;
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        // Check not same as current
        if (newPassword === currentPassword) {
            setError('New password must be different from current password');
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();

            if (!supabase) {
                // Demo mode
                await new Promise(resolve => setTimeout(resolve, 1000));
                setSuccess(true);
                setTimeout(() => router.push('/settings/security'), 2000);
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                throw updateError;
            }

            setSuccess(true);
            setTimeout(() => router.push('/settings/security'), 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Password Changed Successfully
                    </h2>
                    <p className="text-slate-500">
                        Redirecting to security settings...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto max-w-xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/settings/security"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Change Password
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Update your account password
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800 dark:text-red-300">{error}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Password */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Current Password
                    </label>
                    <div className="relative">
                        <input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                            {showCurrent ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                            {showNew ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                        </button>
                    </div>

                    {/* Password Strength */}
                    {newPassword && (
                        <div className="mt-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${validation.strength === 'weak' ? 'w-1/4 bg-red-500' :
                                                validation.strength === 'fair' ? 'w-2/4 bg-amber-500' :
                                                    validation.strength === 'good' ? 'w-3/4 bg-blue-500' :
                                                        'w-full bg-emerald-500'
                                            }`}
                                    />
                                </div>
                                <span className={`text-xs font-medium capitalize ${getStrengthColor(validation.strength)}`}>
                                    {validation.strength}
                                </span>
                            </div>
                            {!validation.valid && validation.errors.length > 0 && (
                                <p className="text-xs text-red-500 mt-1">{validation.errors[0]}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirm New Password */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className={`w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary ${confirmPassword && confirmPassword !== newPassword
                                    ? 'border-red-300 dark:border-red-800'
                                    : 'border-slate-200 dark:border-slate-700'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                            {showConfirm ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                        </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || !validation.valid || newPassword !== confirmPassword}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Updating...
                        </>
                    ) : (
                        <>
                            <KeyRound className="h-5 w-5" />
                            Update Password
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
