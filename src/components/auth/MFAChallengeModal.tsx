"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MFAChallengeModalProps {
    open: boolean;
    onVerified?: () => void;
}

export function MFAChallengeModal({
    open,
    onVerified,
}: MFAChallengeModalProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setCode("");
        setError(null);
        setLoading(false);

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 50);

        return () => {
            window.clearTimeout(focusTimer);
        };
    }, [open]);

    useEffect(() => {
        if (!open || typeof document === "undefined") {
            return;
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [open]);

    if (!open) {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (code.length !== 6 || loading) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            if (!supabase) {
                throw new Error("Supabase client unavailable");
            }

            const { data: factorsData, error: factorsError } =
                await supabase.auth.mfa.listFactors();
            if (factorsError) {
                throw factorsError;
            }

            const totpFactor = factorsData.totp.find(
                (factor: { id: string; status: string }) =>
                    factor.status === "verified"
            );

            if (!totpFactor) {
                throw new Error("No verified MFA factor found");
            }

            const { data: challengeData, error: challengeError } =
                await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
            if (challengeError || !challengeData) {
                throw challengeError ?? new Error("Unable to create MFA challenge");
            }

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: totpFactor.id,
                challengeId: challengeData.id,
                code,
            });

            if (verifyError) {
                throw verifyError;
            }

            if (onVerified) {
                onVerified();
                return;
            }

            window.location.reload();
        } catch {
            setError("Invalid code, please try again");
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mfa-modal-title"
            aria-describedby="mfa-modal-description"
        >
            <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <h2
                    id="mfa-modal-title"
                    className="text-xl font-semibold text-slate-900 dark:text-white"
                >
                    Two-Factor Authentication Required
                </h2>
                <p
                    id="mfa-modal-description"
                    className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                >
                    Enter the 6-digit code from your authenticator app.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(event) =>
                            setCode(
                                event.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                        }
                        disabled={loading}
                        placeholder="000000"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />

                    {error ? (
                        <p className="text-center text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={code.length !== 6 || loading}
                        className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Verify"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default MFAChallengeModal;
