"use client";

// Sprint 2 / P3 (Part A) -- patient portal auth form. Two modes:
//   * claim: set a password to create the account for an invite token, then the
//     server establishes a session and we refresh into the intake.
//   * login: returning patient signs in.
// On success we router.refresh() so the now-authenticated [token] page re-renders
// the intake. No PHI is stored in the client.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Props {
  mode: "claim" | "login";
  token?: string;
  email?: string;
  notice?: string;
}

export function PortalAuthForm({ mode, token, email, notice }: Props) {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint = mode === "claim" ? "/api/portal/claim" : "/api/portal/login";
      const payload = mode === "claim" ? { token, password } : { email: emailInput, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "claim" ? "Create your account" : "Sign in";
  const cta = mode === "claim" ? "Create account & start intake" : "Sign in";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">{heading}</h1>
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        {mode === "claim" ? (
          <p className="text-sm text-muted-foreground">
            Complete your intake for your upcoming visit. Choose a password to continue.
          </p>
        ) : (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            autoComplete={mode === "claim" ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Please wait…" : cta}
        </button>
      </form>
    </main>
  );
}
