"use client";

// AssignModal — assign a scale to a patient for portal completion. Scale
// picker over the known sidecar registry, optional due date (day precision)
// and recurring cadence, mirroring the sidecar's assignment Zod schema.

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { createAssignment } from "@/lib/assessments/client";
import type { AssignmentRecurring } from "@/lib/assessments/types";
import { KNOWN_SCALE_IDS, scaleLabel } from "@/lib/assessments/scale-labels";

interface AssignModalProps {
  patientId: string;
  open: boolean;
  onClose: () => void;
  /** Fired after a successful create so the parent can refresh its list. */
  onCreated: () => void;
}

const RECURRING_OPTIONS: Array<{ value: "" | AssignmentRecurring; label: string }> = [
  { value: "", label: "None (one-time)" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

function parseRecurring(value: string): "" | AssignmentRecurring {
  return value === "weekly" || value === "biweekly" || value === "monthly" ? value : "";
}

export default function AssignModal({ patientId, open, onClose, onCreated }: AssignModalProps) {
  const [scaleId, setScaleId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState<"" | AssignmentRecurring>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setScaleId("");
      setDueDate("");
      setRecurring("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!scaleId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createAssignment({
        patient_id: patientId,
        scale_id: scaleId,
        ...(dueDate ? { due_date: dueDate } : {}),
        ...(recurring ? { recurring } : {}),
      });
      onCreated();
    } catch (err) {
      // AssessmentsApiError carries the API's message (incl. 4xx validation).
      setError(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  }, [scaleId, dueDate, recurring, patientId, onCreated]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="assign-modal-title" className="text-base font-bold text-foreground">
            Assign Assessment
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

        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {error && (
            <div
              role="alert"
              data-testid="assign-error"
              className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Scale</span>
            <select
              value={scaleId}
              onChange={(e) => setScaleId(e.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
              data-testid="assign-scale-select"
            >
              <option value="">Select an assessment…</option>
              {KNOWN_SCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {scaleLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Due date (optional)</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
              data-testid="assign-due-date"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Recurring (optional)</span>
            <select
              value={recurring}
              onChange={(e) => setRecurring(parseRecurring(e.target.value))}
              className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
              data-testid="assign-recurring-select"
            >
              {RECURRING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!scaleId || submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
              data-testid="assign-submit-btn"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
