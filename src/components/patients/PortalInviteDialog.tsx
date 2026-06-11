"use client";

// PortalInviteDialog — PRD-02 P0 clinician invite surface.
// Shows the patient's portal status, confirms the patient email, creates
// the invite via POST /api/portal-invites, and displays the one-time
// link with copy-to-clipboard. v1 is copy-link; email delivery is a
// later phase.

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";

type PortalStatus = "not_invited" | "pending" | "expired" | "active";

interface InviteInfo {
  invited_at: string;
  expires_at: string;
  claimed_at: string | null;
}

interface PortalInviteDialogProps {
  patientId: string;
  patientEmail?: string | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<PortalStatus, string> = {
  not_invited: "Not invited",
  pending: "Invited (pending)",
  expired: "Invite expired",
  active: "Active account",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PortalInviteDialog({
  patientId,
  patientEmail,
  open,
  onClose,
}: PortalInviteDialogProps) {
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal-invites?patient_id=${patientId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to load portal status",
        );
      }
      setStatus(data.portal_status);
      setInvite(data.invite ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portal status");
    } finally {
      setLoadingStatus(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (open) {
      fetchStatus();
    } else {
      setStatus(null);
      setInvite(null);
      setInviteUrl(null);
      setCopied(false);
      setError(null);
    }
  }, [open, fetchStatus]);

  const handleSend = useCallback(async () => {
    setSending(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/portal-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create invite");
      }
      setInviteUrl(data.invite_url);
      setStatus("pending");
      setInvite(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setSending(false);
    }
  }, [patientId]);

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError("Could not copy to clipboard — select and copy the link manually.");
    }
  }, [inviteUrl]);

  if (!open) return null;

  const canSend = Boolean(patientEmail) && status !== null && status !== "active" && !sending;
  const sendLabel =
    status === "pending" || status === "expired"
      ? "Re-send invite (replaces previous link)"
      : "Send Portal Invite";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-invite-dialog-title"
      data-testid="portal-invite-dialog"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 id="portal-invite-dialog-title" className="text-base font-bold text-foreground">
            Patient Portal Invite
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              data-testid="portal-invite-error"
              className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div className="text-sm">
            <span className="text-muted-foreground">Portal status: </span>
            {loadingStatus ? (
              <Loader2 className="inline h-4 w-4 animate-spin" aria-label="Loading status" />
            ) : (
              <span data-testid="portal-invite-status" className="font-semibold text-foreground">
                {status ? STATUS_LABELS[status] : "Unknown"}
              </span>
            )}
            {status === "pending" && invite && (
              <span className="block text-xs text-muted-foreground mt-1">
                Current link expires {formatDateTime(invite.expires_at)}
              </span>
            )}
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Patient email: </span>
            <span data-testid="portal-invite-email" className="font-semibold text-foreground">
              {patientEmail || "No email on file"}
            </span>
            {!patientEmail && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">
                Add an email address to the patient record before sending a portal invite.
              </span>
            )}
          </div>

          {inviteUrl && (
            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                This link is shown once — copy it now and send it to the patient. It expires in 7
                days.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  aria-label="One-time portal invite link"
                  data-testid="portal-invite-url"
                  className="flex-1 rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-2 py-1 text-xs font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  data-testid="portal-invite-copy-btn"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted/50"
            >
              Close
            </button>
            {status !== "active" && !inviteUrl && (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                data-testid="portal-invite-send-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sendLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
