"use client";

// AdministerModal — 2-step admin flow:
//   1. Pick a scale from a curated list of known scaleIds.
//   2. Render ScaleForm or CssrsForm based on projection.responseShape.
// On submit we call administerAssessment + completeAssessment.

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import type {
  AssessmentResponses,
  CssrsResponses,
  FlatLikertResponses,
  RenderProjection,
} from "@/lib/assessments/types";
import { administerAssessment, completeAssessment, getScale } from "@/lib/assessments/client";
import { KNOWN_SCALE_IDS, scaleLabel } from "@/lib/assessments/scale-labels";
import ScaleForm from "./ScaleForm";
import CssrsForm from "./CssrsForm";

// Administer dropdown — exactly the scale ids the sidecar registry implements,
// with human labels. Curated rather than fetched (the sidecar has no list
// endpoint); order is rough clinical priority. See scale-labels.ts.
const KNOWN_SCALES: Array<{ id: string; label: string }> = KNOWN_SCALE_IDS.map((id) => ({
  id,
  label: scaleLabel(id),
}));

interface AdministerModalProps {
  patientId: string;
  encounterId?: string;
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

type Step = "pick" | "fill" | "submitting" | "done";

export default function AdministerModal({
  patientId,
  encounterId,
  open,
  onClose,
  onCompleted,
}: AdministerModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");
  const [projection, setProjection] = useState<RenderProjection | null>(null);
  const [loadingProjection, setLoadingProjection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("pick");
      setSelectedScaleId("");
      setProjection(null);
      setError(null);
    }
  }, [open]);

  const handleSelectScale = useCallback(async () => {
    if (!selectedScaleId) return;
    setLoadingProjection(true);
    setError(null);
    try {
      const proj = await getScale(selectedScaleId);
      setProjection(proj);
      setStep("fill");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scale");
    } finally {
      setLoadingProjection(false);
    }
  }, [selectedScaleId]);

  const handleSubmit = useCallback(
    async (responses: AssessmentResponses) => {
      if (!projection) return;
      setStep("submitting");
      setError(null);
      try {
        const created = await administerAssessment({
          patient_id: patientId,
          scale_id: projection.id,
          delivery_method: "clinician",
          ...(encounterId ? { encounter_id: encounterId } : {}),
        });
        await completeAssessment(created.id, responses);
        setStep("done");
        onCompleted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit assessment");
        setStep("fill");
      }
    },
    [projection, patientId, encounterId, onCompleted],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="administer-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 id="administer-modal-title" className="text-base font-bold text-foreground">
            Administer Assessment
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

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {step === "pick" && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-foreground">Choose a scale</span>
                <select
                  value={selectedScaleId}
                  onChange={(e) => setSelectedScaleId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
                  data-testid="administer-scale-select"
                >
                  <option value="">Select an assessment…</option>
                  {KNOWN_SCALES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!selectedScaleId || loadingProjection}
                  onClick={handleSelectScale}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
                >
                  {loadingProjection && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue
                </button>
              </div>
            </div>
          )}

          {(step === "fill" || step === "submitting") &&
            projection &&
            (projection.responseShape === "cssrs" ? (
              <CssrsForm
                projection={projection}
                onSubmit={(r: CssrsResponses) => handleSubmit(r)}
                submitting={step === "submitting"}
                submitLabel="Submit assessment"
              />
            ) : (
              <ScaleForm
                projection={projection}
                onSubmit={(r: FlatLikertResponses) => handleSubmit(r)}
                submitting={step === "submitting"}
                submitLabel="Submit assessment"
              />
            ))}

          {step === "done" && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm font-semibold text-foreground">Assessment recorded.</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
