"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { AgentResult } from "@/lib/agent/types";

interface Props {
  encounterId: string;
  patientId: string;
  clinicianId: string;
  sessionType: string;
  duration: number;
  clinicianInput?: string;
  noteFormat?: string;
  payerType?: string;
  onComplete: (result: AgentResult) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

// FIX 10: 4-state progression: idle → loading → success OR error → idle
type ButtonState = "idle" | "loading" | "success" | "error";

export function EndSessionButton({
  encounterId,
  patientId,
  clinicianId,
  sessionType,
  duration,
  clinicianInput,
  noteFormat,
  payerType,
  onComplete,
  onError,
  disabled,
}: Props) {
  const [state, setState] = useState<ButtonState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleClick = async () => {
    if (state === "loading" || state === "success") return;

    setState("loading");
    setErrorMessage("");

    try {
      const resp = await fetch("/api/agent/complete-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: encounterId,
          patientId,
          clinicianId,
          clinicianInput,
          noteFormat,
          sessionType,
          duration,
          payerType,
        }),
      });

      const data: AgentResult = await resp.json();

      if (!resp.ok || !data.success) {
        const message = data.error ?? "Session could not be completed. Please try again.";
        onError(message);
        setErrorMessage(message);
        setState("error");
        // FIX 10: Show error for 5 seconds then reset to idle (always retryable)
        setTimeout(() => {
          setState("idle");
          setErrorMessage("");
        }, 5000);
        return;
      }

      onComplete(data);
      setState("success");

      // Return to idle after 3 seconds so clinician can retry if needed
      setTimeout(() => setState("idle"), 3000);
    } catch {
      const message = "Network error. Please check your connection and try again.";
      onError(message);
      setErrorMessage(message);
      setState("error");
      // FIX 10: Reset to idle after 5 seconds
      setTimeout(() => {
        setState("idle");
        setErrorMessage("");
      }, 5000);
    }
  };

  if (state === "loading") {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 opacity-70 cursor-not-allowed"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Ending session...
      </button>
    );
  }

  if (state === "success") {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 cursor-not-allowed"
      >
        <CheckCircle2 className="h-4 w-4" />
        Session Complete
      </button>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          disabled
          className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-red-600/20 cursor-not-allowed"
        >
          <AlertCircle className="h-4 w-4" />
          Error
        </button>
        {errorMessage && <p className="text-xs text-red-600 max-w-xs text-right">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      <CheckCircle2 className="h-4 w-4" />
      End Session
    </button>
  );
}
