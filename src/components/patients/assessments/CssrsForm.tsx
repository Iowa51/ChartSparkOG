"use client";

// CssrsForm — override renderer for responseShape === 'cssrs'.
// Each item has Yes/No answered, optional Lifetime + Past month checkboxes;
// item6 additionally requires a behaviorTimeframe when answered, driven by
// projection.structuredItems.item6BehaviorTimeframe.

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { CssrsItemResponse, CssrsResponses, RenderProjection } from "@/lib/assessments/types";

interface CssrsFormProps {
  projection: RenderProjection;
  onSubmit: (responses: CssrsResponses) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}

const EMPTY: CssrsItemResponse = { answered: false };

// Item ids are "item1".."item6"; surface the human number in messages
// (e.g. "item1" -> "1") rather than the raw id.
function itemNumber(id: string): string {
  const match = id.match(/\d+/);
  return match ? match[0] : id;
}

export default function CssrsForm({
  projection,
  onSubmit,
  submitting = false,
  submitLabel = "Submit",
}: CssrsFormProps) {
  const [responses, setResponses] = useState<CssrsResponses>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const timeframeConfig = projection.structuredItems?.item6BehaviorTimeframe;
  const timeframeOptions = timeframeConfig?.options ?? [];
  const timeframeRequired = timeframeConfig?.requiredWhenAnswered ?? true;

  const totalItems = projection.items.length;
  const answeredCount = useMemo(
    () =>
      projection.items.filter((it) => {
        const r = responses[it.id];
        return r !== undefined && r.answered !== undefined;
      }).length,
    [projection.items, responses],
  );

  const updateItem = useCallback((itemId: string, patch: Partial<CssrsItemResponse>) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...EMPTY, ...prev[itemId], ...patch },
    }));
    setValidationError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      for (const it of projection.items) {
        const r = responses[it.id];
        if (!r) {
          setValidationError(`Please answer item ${itemNumber(it.id)} before submitting.`);
          return;
        }
        // Answered "Yes" requires at least one timeframe column. The sidecar
        // rejects answered-without-a-timeframe with a 400, so block it here.
        if (r.answered && !r.lifetime && !r.pastMonth) {
          setValidationError(`Select Lifetime and/or Past month for item ${itemNumber(it.id)}.`);
          return;
        }
      }

      // item6 requires a behaviorTimeframe when answered === true
      // and the projection says timeframeRequired.
      if (timeframeRequired) {
        const item6 = responses["item6"];
        if (item6?.answered && !item6.behaviorTimeframe) {
          setValidationError("Please choose a timeframe for item 6 before submitting.");
          return;
        }
      }

      await onSubmit(responses);
    },
    [projection.items, responses, onSubmit, timeframeRequired],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="cssrs-form">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">{projection.name}</h2>
        <span className="text-sm text-muted-foreground" data-testid="cssrs-form-progress">
          {answeredCount} of {totalItems} answered
        </span>
      </div>

      {projection.description && (
        <p className="text-sm text-muted-foreground">{projection.description}</p>
      )}

      <div className="space-y-3">
        {projection.items.map((item, idx) => {
          const r = responses[item.id] ?? EMPTY;
          const isItem6 = item.id === "item6";
          const showTimeframe =
            isItem6 && r.answered && (r.lifetime || r.pastMonth || timeframeRequired);

          return (
            <fieldset
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              data-testid={`cssrs-form-item-${item.id}`}
            >
              <legend className="text-sm font-semibold text-foreground px-2">
                {idx + 1}. {item.text}
              </legend>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Answered?
                  </span>
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { answered: true })}
                    aria-pressed={r.answered === true}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                      r.answered === true
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-slate-200 dark:border-slate-800 hover:bg-muted/40"
                    }`}
                    data-testid={`cssrs-${item.id}-yes`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, {
                        answered: false,
                        lifetime: false,
                        pastMonth: false,
                        behaviorTimeframe: undefined,
                      })
                    }
                    aria-pressed={r.answered === false}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                      r.answered === false
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-slate-200 dark:border-slate-800 hover:bg-muted/40"
                    }`}
                    data-testid={`cssrs-${item.id}-no`}
                  >
                    No
                  </button>
                </div>

                {r.answered && (
                  <div className="flex items-center gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(r.lifetime)}
                        onChange={(e) =>
                          updateItem(item.id, {
                            lifetime: e.target.checked,
                          })
                        }
                        disabled={submitting}
                        className="h-4 w-4 text-primary focus:ring-primary"
                        data-testid={`cssrs-${item.id}-lifetime`}
                      />
                      Lifetime
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(r.pastMonth)}
                        onChange={(e) =>
                          updateItem(item.id, {
                            pastMonth: e.target.checked,
                          })
                        }
                        disabled={submitting}
                        className="h-4 w-4 text-primary focus:ring-primary"
                        data-testid={`cssrs-${item.id}-past-month`}
                      />
                      Past month
                    </label>
                  </div>
                )}
              </div>

              {showTimeframe && timeframeOptions.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                    Most recent behavior timeframe
                  </label>
                  <select
                    value={r.behaviorTimeframe ?? ""}
                    onChange={(e) =>
                      updateItem(item.id, {
                        behaviorTimeframe: e.target.value || undefined,
                      })
                    }
                    disabled={submitting}
                    className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
                    data-testid={`cssrs-${item.id}-timeframe`}
                  >
                    <option value="">Choose…</option>
                    {timeframeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </fieldset>
          );
        })}
      </div>

      {validationError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
