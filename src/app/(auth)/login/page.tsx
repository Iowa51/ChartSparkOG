"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

// Role-based redirect map
const roleRoutes: Record<string, string> = {
    'SUPER_ADMIN': '/super-admin',
    'ADMIN': '/admin',
    'AUDITOR': '/auditor',
    'USER': '/dashboard'
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultRedirect = "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const supabase = createBrowserClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Check for lockout before attempting login
        try {
            const lockoutCheck = await fetch('/api/auth/check-lockout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const lockoutData = await lockoutCheck.json();
            if (lockoutData.locked) {
                setError(lockoutData.message || 'Account temporarily locked. Please try again later.');
                setIsLoading(false);
                return;
            }
        } catch {
            // Continue if lockout check fails
        }

        try {
            // Demo mode without Supabase: allow login for known demo emails
            if (!supabase) {
                const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
                if (isDemoMode) {
                    const demoRoleMap: Record<string, string> = {
                        'super@chartspark.com': 'SUPER_ADMIN',
                        'admin@chartspark.com': 'ADMIN',
                        'auditor@chartspark.com': 'AUDITOR',
                        'clinician@chartspark.com': 'USER',
                    };
                    const detectedRole = demoRoleMap[email.toLowerCase()];
                    if (detectedRole) {
                        // Demo login successful
                        const redirectPath = roleRoutes[detectedRole] || defaultRedirect;
                        router.push(redirectPath);
                        return;
                    } else {
                        setError('Demo mode: Use a demo account (see buttons below)');
                        setIsLoading(false);
                        return;
                    }
                } else {
                    setError('Authentication service not configured');
                    setIsLoading(false);
                    return;
                }
            }

            // 1. Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                // Record failed login attempt
                await fetch('/api/auth/record-attempt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, success: false }),
                }).catch(() => { });

                setError(authError.message);
                setIsLoading(false);
                return;
            }

            if (!authData.session?.user) {
                setError("Authentication failed. Please try again.");
                setIsLoading(false);
                return;
            }

            const userId = authData.session.user.id;

            // 2. Fetch user profile with role from users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, organization_id, first_name, last_name, is_active')
                .eq('id', userId)
                .single();

            // 3. Handle profile fetch failure
            if (userError || !userData) {
                console.error("Error fetching user profile:", userError);

                // Demo mode: fallback to email-based role detection
                const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
                if (isDemoMode) {
                    const demoRoleMap: Record<string, string> = {
                        'super@chartspark.com': 'SUPER_ADMIN',
                        'admin@chartspark.com': 'ADMIN',
                        'auditor@chartspark.com': 'AUDITOR',
                        'clinician@chartspark.com': 'USER',
                    };
                    const detectedRole = demoRoleMap[email.toLowerCase()];
                    if (detectedRole) {
                        // Record successful demo login
                        await fetch('/api/auth/record-attempt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, success: true }),
                        }).catch(() => { });

                        const redirectPath = roleRoutes[detectedRole] || defaultRedirect;
                        router.push(redirectPath);
                        return;
                    }
                }

                // Production mode OR unknown email: HARD FAIL
                await supabase.auth.signOut();
                setError("Unable to load your profile. Please contact support.");
                setIsLoading(false);
                return;
            }

            // 4. Check if account is active
            if (userData.is_active === false) {
                await supabase.auth.signOut();
                setError("Your account has been deactivated. Please contact support.");
                setIsLoading(false);
                return;
            }

            // 5. Record successful login
            await fetch('/api/auth/record-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, success: true }),
            }).catch(() => { });

            // 6. Update last_login timestamp
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userId);

            // 7. Role-based redirect
            const userRole = userData?.role || 'USER';
            const redirectPath = roleRoutes[userRole] || defaultRedirect;

            // Check for explicit redirect param (for returning to a specific page)
            const explicitRedirect = searchParams.get("redirect");
            if (explicitRedirect && userRole === 'USER') {
                // Only honor redirect param for regular users going to dashboard routes
                router.push(explicitRedirect);
            } else {
                router.push(redirectPath);
            }

        } catch (err) {
            console.error("Login error:", err);
            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
        }
    };

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
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Welcome back
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Sign in to your practitioner portal
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    {error}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
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
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            New to ChartSpark?{" "}
                            <Link href="/register" className="text-primary font-bold hover:underline">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Demo Credentials Section - Only shown when DEMO_MODE is enabled */}
                {process.env.NEXT_PUBLIC_DEMO_MODE !== 'false' && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Demo Accounts Available
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => { setEmail("super@chartspark.com"); setPassword("Demo123!!"); }}
                                className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                                Super Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => { setEmail("admin@chartspark.com"); setPassword("Demo123!!"); }}
                                className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                                Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => { setEmail("auditor@chartspark.com"); setPassword("Demo123!!"); }}
                                className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                            >
                                Auditor
                            </button>
                            <button
                                type="button"
                                onClick={() => { setEmail("clinician@chartspark.com"); setPassword("Demo123!!"); }}
                                className="px-3 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg font-medium hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                            >
                                Clinician
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-600 mt-8 text-center max-w-xs leading-relaxed">
                Secure clinical environment. By signing in, you agree to our Terms of Service and HIPAA Compliance Policy.
            </p>
        </div>
    );
}
