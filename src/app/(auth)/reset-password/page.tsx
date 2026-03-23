"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Lock,
    ArrowLeft,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { validatePassword, getStrengthColor, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-validation";

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createBrowserClient();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    const passwordValidation = validatePassword(password);

    // Supabase Auth will have set a session via the callback redirect.
    // We just need to verify we have one before allowing the password change.
    useEffect(() => {
        if (!supabase) return;
        supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => {
            if (data?.user) {
                setSessionReady(true);
            } else {
                setError("This reset link is invalid or has expired. Please request a new one.");
            }
        });
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!passwordValidation.valid) {
            setError(passwordValidation.errors[0]);
            return;
        }

        setIsLoading(true);

        try {
            if (!supabase) {
                throw new Error("Authentication service not available");
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });

            if (updateError) {
                throw updateError;
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="flex flex-col items-center mb-6">
                    <img
                        src="/assets/logo.svg"
                        alt="ChartSpark"
                        className="h-24 w-auto object-contain"
                    />
                </div>

                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Password updated
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Your password has been successfully reset. You can now sign in with your new password.
                    </p>
                    <button
                        onClick={() => router.push("/login")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all"
                    >
                        Sign In
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex flex-col items-center mb-6">
                <img
                    src="/assets/logo.svg"
                    alt="ChartSpark"
                    className="h-24 w-auto object-contain"
                />
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Choose a new password
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Enter and confirm your new password below.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    {error}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    aria-label="New password"
                                    autoComplete="new-password"
                                    minLength={PASSWORD_REQUIREMENTS.minLength}
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {password.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${
                                                passwordValidation.strength === 'weak' ? 'w-1/4 bg-red-500' :
                                                passwordValidation.strength === 'fair' ? 'w-2/4 bg-amber-500' :
                                                passwordValidation.strength === 'good' ? 'w-3/4 bg-blue-500' :
                                                'w-full bg-emerald-500'
                                            }`}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStrengthColor(passwordValidation.strength)}`}>
                                        {passwordValidation.strength}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-slate-500 mt-1 ml-1">
                                Min {PASSWORD_REQUIREMENTS.minLength} chars with uppercase, lowercase, number, and special char
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    aria-label="Confirm new password"
                                    autoComplete="new-password"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 ml-1">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !sessionReady}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    Update Password
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
