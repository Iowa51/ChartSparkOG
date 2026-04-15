"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthCodeErrorClientProps = {
    isRecovery: boolean;
    message: string;
};

function parseHashParams(hash: string): URLSearchParams {
    return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

export default function AuthCodeErrorClient({ isRecovery, message }: AuthCodeErrorClientProps) {
    const router = useRouter();
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryError, setRecoveryError] = useState<string | null>(null);

    useEffect(() => {
        if (!isRecovery || typeof window === "undefined") {
            return;
        }

        const hashParams = parseHashParams(window.location.hash);
        const hashType = hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (hashType !== "recovery" || !accessToken || !refreshToken) {
            return;
        }

        const supabase = createClient();
        if (!supabase) {
            setRecoveryError("Authentication service unavailable. Please request a new reset link.");
            return;
        }

        let isCancelled = false;

        async function establishRecoverySession() {
            setIsRecovering(true);
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (isCancelled) {
                return;
            }

            if (error) {
                setRecoveryError("Password reset link expired or already used. Please request a new reset link.");
                setIsRecovering(false);
                return;
            }

            router.replace("/reset-password");
            router.refresh();
        }

        void establishRecoverySession();

        return () => {
            isCancelled = true;
        };
    }, [isRecovery, router]);

    if (isRecovering) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
                    <div className="flex justify-center mb-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        Preparing password reset
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Establishing your recovery session and redirecting you to reset your password.
                    </p>
                </div>
            </div>
        );
    }

    const resolvedMessage = recoveryError || message;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    Authentication error
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{resolvedMessage}</p>
                <div className="flex justify-center gap-3">
                    <Link
                        href={isRecovery ? "/forgot-password" : "/register"}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                        {isRecovery ? "Request Reset Link" : "Back to Register"}
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
