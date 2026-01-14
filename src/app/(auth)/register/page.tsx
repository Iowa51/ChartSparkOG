"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Mail,
    Lock,
    User,
    ArrowRight,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff,
    Building2,
    CheckCircle2,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { validatePassword, getStrengthColor, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-validation";

export default function RegisterPage() {
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [organization, setOrganization] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    // Real-time password validation
    const passwordValidation = validatePassword(password, {
        email,
        firstName,
        lastName,
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors([]);

        // Client-side validation
        const validationErrors: string[] = [];

        if (!firstName.trim() || !lastName.trim()) {
            validationErrors.push("First and last name are required");
        }

        if (!organization.trim()) {
            validationErrors.push("Organization name is required");
        }

        if (password !== confirmPassword) {
            validationErrors.push("Passwords do not match");
        }

        if (!passwordValidation.valid) {
            validationErrors.push(...passwordValidation.errors);
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            setIsLoading(false);
            return;
        }

        try {
            const supabase = createBrowserClient();

            if (!supabase) {
                // Demo mode - simulate success
                setSuccess(true);
                setIsLoading(false);
                return;
            }

            // Step 1: Create auth user with Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (authError) {
                setErrors([authError.message]);
                setIsLoading(false);
                return;
            }

            if (!authData.user) {
                setErrors(["Failed to create account"]);
                setIsLoading(false);
                return;
            }

            // Step 2: Complete signup by creating organization and user profile
            const response = await fetch('/api/auth/complete-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: authData.user.id,
                    email,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    organizationName: organization.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setErrors([errorData.error || "Failed to complete registration"]);
                // Note: Auth user was created but profile failed - user can try logging in
                setIsLoading(false);
                return;
            }

            // Success - show confirmation message
            setSuccess(true);
            setIsLoading(false);

        } catch (err) {
            console.error("Registration error:", err);
            setErrors(["An unexpected error occurred. Please try again."]);
            setIsLoading(false);
        }
    };

    // Success screen
    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="flex flex-col items-center mb-6 translate-x-2">
                    <img
                        src="/ChartSparkLogo.png"
                        alt="ChartSpark"
                        className="h-28 w-auto object-contain"
                    />
                </div>

                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Check Your Email
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        We've sent a verification link to <strong className="text-slate-700 dark:text-slate-300">{email}</strong>.
                        Please click the link to verify your email and complete registration.
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            <strong>Note:</strong> The email may take a few minutes to arrive. Check your spam folder if you don't see it.
                        </p>
                    </div>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-semibold"
                    >
                        Return to Login
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6 translate-x-2">
                <img
                    src="/ChartSparkLogo.png"
                    alt="ChartSpark"
                    className="h-28 w-auto object-contain"
                />
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Create your account
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Join ChartSpark and streamline your documentation
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        {errors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <ul className="text-sm text-red-600 dark:text-red-400 font-medium list-disc list-inside">
                                        {errors.map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    First Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Julia"
                                        maxLength={50}
                                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Smith"
                                        maxLength={50}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Organization Name
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={organization}
                                    onChange={(e) => setOrganization(e.target.value)}
                                    placeholder="Wellness Psychiatry Associates"
                                    maxLength={100}
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@organization.com"
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    minLength={PASSWORD_REQUIREMENTS.minLength}
                                    className="w-full pl-12 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {/* Password strength indicator */}
                            {password.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${passwordValidation.strength === 'weak' ? 'w-1/4 bg-red-500' :
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

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 ml-1">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 mt-4"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-primary font-bold hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-600 mt-8 text-center max-w-xs leading-relaxed">
                Secure clinical environment. By signing up, you agree to our Terms of Service and HIPAA Compliance Policy.
            </p>
        </div>
    );
}
