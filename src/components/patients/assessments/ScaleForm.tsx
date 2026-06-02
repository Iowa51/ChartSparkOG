"use client";

// ScaleForm — introspective renderer for any flat-likert scale projection.
// Drives PHQ-9, GAD-7, AUDIT-C, DAST-10 and anything else with
// responseShape === 'flat-likert'. C-SSRS uses CssrsForm instead.

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { FlatLikertResponses, RenderProjection } from "@/lib/assessments/types";

interface ScaleFormProps {
  projection: RenderProjection;
  onSubmit: (responses: FlatLikertResponses) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}

export default function ScaleForm({
  projection,
  onSubmit,
  submitting = false,
  submitLabel = "Submit",
}: ScaleFormProps) {
  const [responses, setResponses] = useState<FlatLikertResponses>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalItems = projection.items.length;
  const answeredCount = useMemo(
    () => projection.items.filter((it) => responses[it.id] !== undefined).length,
    [projection.items, responses],
  );

  const handleChange = useCallback((itemId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [itemId]: value }));
    setValidationError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const missing = projection.items.find((it) => responses[it.id] === undefined);
      if (missing) {
        setValidationError(`Please answer all ${totalItems} items before submitting.`);
        return;
      }
      await onSubmit(responses);
    },
    [projection.items, responses, onSubmit, totalItems],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="scale-form">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">{projection.name}</h2>
        <span className="text-sm text-muted-foreground" data-testid="scale-form-progress">
          {answeredCount} of {totalItems} answered
        </span>
      </div>

      {projection.description && (
        <p className="text-sm text-muted-foreground">{projection.description}</p>
      )}

      <div className="space-y-4">
        {projection.items.map((item, idx) => {
          const itemOptions = item.options ?? projection.options ?? [];
          return (
            <fieldset
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              data-testid={`scale-form-item-${item.id}`}
            >
              <legend className="text-sm font-semibold text-foreground px-2">
                {idx + 1}. {item.text}
              </legend>
              {item.helpText && (
                <p className="text-xs text-muted-foreground mt-1 mb-2">{item.helpText}</p>
              )}
              <div className="mt-3 grid gap-2">
                {itemOptions.map((opt) => {
                  const id = `${item.id}-${opt.value}`;
                  const checked = responses[item.id] === opt.value;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-slate-200 dark:border-slate-800 hover:bg-muted/40"
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name={item.id}
                        value={opt.value}
                        checked={checked}
                        onChange={() => handleChange(item.id, opt.value)}
                        disabled={submitting}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">
                        <span className="font-semibold mr-2">{opt.value}</span>
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
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
