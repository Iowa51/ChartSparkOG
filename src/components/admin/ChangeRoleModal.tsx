"use client";

import { useEffect, useState } from "react";
import { Shield, X, CheckCircle2, AlertCircle } from "lucide-react";

type Role = "USER" | "ADMIN" | "AUDITOR" | "SUPER_ADMIN";

interface ChangeRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
    userName: string;
    currentRole: string;
    callerRole: string;
}

const ROLE_BADGE: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    AUDITOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    USER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
};

const roleLabel = (role: string) =>
    role === "USER" ? "Clinician" : role.replace("_", " ");

function allowedRolesFor(callerRole: string, currentRole: string): Role[] {
    const all: Role[] = ["USER", "ADMIN", "AUDITOR"];
    if (callerRole === "SUPER_ADMIN") {
        return all.filter((r) => r !== currentRole);
    }
    if (callerRole === "ADMIN") {
        return (["USER", "AUDITOR"] as Role[]).filter((r) => r !== currentRole);
    }
    return [];
}

export default function ChangeRoleModal({
    isOpen,
    onClose,
    onSuccess,
    userId,
    userName,
    currentRole,
    callerRole,
}: ChangeRoleModalProps) {
    const [newRole, setNewRole] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [stage, setStage] = useState<"form" | "confirm">("form");
    const [submitting, setSubmitting] = useState(false);
    const [succeeded, setSucceeded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const roleOptions = allowedRolesFor(callerRole, currentRole);

    useEffect(() => {
        if (!isOpen) return;
        setNewRole("");
        setReason("");
        setStage("form");
        setSubmitting(false);
        setSucceeded(false);
        setError(null);
    }, [isOpen, userId]);

    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !submitting) onClose();
        };
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose, submitting]);

    if (!isOpen) return null;

    const canProceed =
        !!newRole && reason.trim().length >= 5 && reason.trim().length <= 500;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (submitting) return;
        if (e.target === e.currentTarget) onClose();
    };

    const handleSubmit = async () => {
        if (!canProceed) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ new_role: newRole, reason: reason.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data?.error || "Failed to change role");
                setSubmitting(false);
                return;
            }
            setSucceeded(true);
            setSubmitting(false);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);
        } catch (err) {
            console.error("[ChangeRoleModal] submit error:", err);
            setError(err instanceof Error ? err.message : "Network error");
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                Change Role
                            </h3>
                            <p className="text-xs text-muted-foreground">{userName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                {succeeded ? (
                    <div className="p-8 flex flex-col items-center text-center gap-3">
                        <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="font-bold text-foreground">Role updated</p>
                        <p className="text-sm text-muted-foreground">
                            {userName} is now {roleLabel(newRole)}.
                        </p>
                    </div>
                ) : stage === "form" ? (
                    <div className="p-5 space-y-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                Current Role
                            </p>
                            <span
                                className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${ROLE_BADGE[currentRole] || ROLE_BADGE.USER}`}
                            >
                                {roleLabel(currentRole)}
                            </span>
                        </div>

                        <div>
                            <label
                                htmlFor="new-role"
                                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
                            >
                                New Role
                            </label>
                            <select
                                id="new-role"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                disabled={roleOptions.length === 0}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                            >
                                <option value="">Select a role…</option>
                                {roleOptions.map((role) => (
                                    <option key={role} value={role}>
                                        {roleLabel(role)}
                                    </option>
                                ))}
                            </select>
                            {roleOptions.length === 0 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    No role changes available for this user.
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="reason"
                                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
                            >
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason for role change..."
                                rows={3}
                                maxLength={500}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {reason.trim().length < 5
                                    ? `At least 5 characters (${reason.trim().length}/500)`
                                    : `${reason.trim().length}/500`}
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-800 dark:text-red-200">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-5 space-y-4">
                        <p className="text-sm text-foreground">
                            <span className="font-bold">{userName}</span> will be changed
                            from{" "}
                            <span
                                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_BADGE[currentRole] || ROLE_BADGE.USER}`}
                            >
                                {roleLabel(currentRole)}
                            </span>{" "}
                            to{" "}
                            <span
                                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_BADGE[newRole] || ROLE_BADGE.USER}`}
                            >
                                {roleLabel(newRole)}
                            </span>
                            .
                        </p>
                        <div className="rounded-xl bg-muted/50 border border-border p-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Reason
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                {reason.trim()}
                            </p>
                        </div>
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-800 dark:text-red-200">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                {!succeeded && (
                    <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/30 rounded-b-2xl">
                        {stage === "form" ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl font-medium text-foreground bg-card border border-border hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setStage("confirm");
                                    }}
                                    disabled={!canProceed}
                                    className="px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                                >
                                    Review
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setStage("form")}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl font-medium text-foreground bg-card border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting && (
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    )}
                                    {submitting ? "Saving…" : "Confirm"}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
