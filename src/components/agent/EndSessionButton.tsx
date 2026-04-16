"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface EndSessionButtonProps {
    encounterId: string;
    patientId?: string;
    onSuccess?: (result: unknown) => void;
}

const SIDECAR_READY = process.env.NEXT_PUBLIC_SIDECAR_READY === "true";

export function EndSessionButton({ encounterId, patientId, onSuccess }: EndSessionButtonProps) {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!SIDECAR_READY) {
        return (
            <div className="relative group">
                <button
                    disabled
                    className="flex items-center gap-2 px-5 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-black uppercase tracking-widest cursor-not-allowed opacity-60"
                >
                    <AlertCircle className="h-4 w-4" />
                    End Session
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 w-max">
                    <div className="bg-foreground text-background text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                        AI scribe unavailable in this environment.
                    </div>
                </div>
            </div>
        );
    }

    const handleClick = async () => {
        if (status === "loading") return;
        setStatus("loading");
        setErrorMsg(null);

        try {
            const res = await fetch("/api/agent/complete-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ encounterId, patientId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? "Failed to complete session");
            }

            setStatus("success");
            onSuccess?.(data.result);
        } catch (err) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "Failed to complete session");
        }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={status === "loading" || status === "success"}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === "success" && <CheckCircle2 className="h-4 w-4" />}
                {(status === "idle" || status === "error") && <CheckCircle2 className="h-4 w-4" />}
                End Session
            </button>
            {status === "error" && errorMsg && (
                <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
            )}
        </div>
    );
}
