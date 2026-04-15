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
import { sanitizeRedirectPath } from "@/lib/security/redirects";

export interface DemoCredential {
    label: string;
    email: string;
    password: string;
    role?: string;
    accentClassName?: string;
}

interface LoginPageClientProps {
    demoModeEnabled: boolean;
    demoCredentials?: DemoCredential[];
}

const roleRoutes: Record<string, string> = {
    SUPER_ADMIN: "/super-admin",
    ADMIN: "/admin",
    AUDITOR: "/auditor",
    USER: "/dashboard",
};

function getInitialError(searchParams: ReturnType<typeof useSearchParams>): string | null {
    const explicitMessage = searchParams.get("message");
    if (explicitMessage) return explicitMessage;

    const errorCode = searchParams.get("error");
    if (errorCode === "email_link_expired") {
        return "Email link expired or already used. Please register again.";
    }
    if (errorCode === "account_deactivated") {
        return "Your account has been deactivated. Contact support for help.";
    }
    if (errorCode === "profile_not_found") {
        return "Your account exists, but setup is incomplete. Please contact support.";
    }
    if (errorCode === "session_invalid") {
        return "Your session could not be completed. Please sign in again.";
    }

    return null;
}

export default function LoginPageClient({ demoModeEnabled, demoCredentials = [] }: LoginPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultRedirect = "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(getInitialError(searchParams));
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const lockoutCheck = await fetch("/api/auth/check-lockout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (lockoutCheck.ok) {
                const lockoutData = await lockoutCheck.json();
                if (lockoutData.locked) {
                    setError("Too many attempts. Please try again later.");
                    setIsLoading(false);
                    return;
                }
            }
        } catch {
            // Do not block login if the lockout service is unavailable.
        }

        try {
            if (process.env.NODE_ENV !== "production" && demoModeEnabled && demoCredentials.length > 0) {
                const normalizedEmail = email.toLowerCase();
                const match = demoCredentials.find((credential) => credential.email.toLowerCase() === normalizedEmail && credential.role);
                if (match?.role) {
                    router.push(roleRoutes[match.role] || defaultRedirect);
                    return;
                }
            }

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    redirect: searchParams.get("redirect"),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: "Invalid email or password. Please try again.",
                }));

                await fetch("/api/auth/record-attempt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, success: false }),
                }).catch(() => { });

                setError(typeof errorData.error === "string"
                    ? errorData.error
                    : "Invalid email or password. Please try again.");
                setIsLoading(false);
                return;
            }

            const data = await response.json();

            await fetch("/api/auth/record-attempt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, success: true }),
            }).catch(() => { });

            const redirectPath = sanitizeRedirectPath(
                typeof data.redirectPath === "string" ? data.redirectPath : searchParams.get("redirect"),
                defaultRedirect
            );

            router.push(redirectPath);
            router.refresh();
        } catch (err) {
            console.error("Login error:", err);
            setError("Authentication service unavailable. Please try again later.");
            setIsLoading(false);
            return;
        }

        setIsLoading(false);
    };

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
                                    id="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@organization.com"
                                    aria-label="Email address"
                                    autoComplete="email"
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
                                    id="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    aria-label="Password"
                                    autoComplete="current-password"
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
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

                {process.env.NODE_ENV !== "production" && demoModeEnabled && demoCredentials.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Demo Accounts Available
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {demoCredentials.map((credential) => (
                                <button
                                    key={credential.email}
                                    type="button"
                                    onClick={() => {
                                        setEmail(credential.email);
                                        setPassword(credential.password);
                                    }}
                                    className={
                                        credential.accentClassName ||
                                        "px-3 py-2 bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-900/50 transition-colors"
                                    }
                                    aria-label={`Use ${credential.label} demo credentials`}
                                >
                                    {credential.label}
                                </button>
                            ))}
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
