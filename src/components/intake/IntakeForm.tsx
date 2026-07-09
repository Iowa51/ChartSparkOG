"use client";

// The patient-facing intake flow: one section per screen (mobile-first), a
// progress header, autosave on advance + explicit save, per-section required
// enforcement, a review-before-submit screen, and final submit. Fully generic
// over the template -- the _smoke_test template runs the identical path.

import { useMemo, useState } from "react";
import { CSButton } from "@/components/cs";
import type { IntakeTemplate, IntakeResponses, IntakeField, CodedValue } from "@/lib/intake/types";
import {
  visibleSections,
  visibleFields,
  missingRequired,
  isNkdaActive,
  NKDA_KEY,
} from "@/lib/intake/logic";
import { FieldRenderer } from "./registry";
import { ReviewSummary } from "./ReviewSummary";
import { IntakeSearchContext, IntakeMetaContext } from "./context";

export interface IntakeFormProps {
  template: IntakeTemplate;
  templateVersion?: number | null;
  initialResponses?: IntakeResponses;
  onSave?: (responses: IntakeResponses) => Promise<void> | void;
  onSubmit?: (responses: IntakeResponses) => Promise<void> | void;
  searchCodes?: (system: string, query: string) => Promise<CodedValue[]>;
  readOnly?: boolean;
}

export function IntakeForm({
  template,
  templateVersion = null,
  initialResponses,
  onSave,
  onSubmit,
  searchCodes,
  readOnly = false,
}: IntakeFormProps) {
  const [responses, setResponses] = useState<IntakeResponses>(initialResponses ?? {});
  const [stepIndex, setStepIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);

  const sections = visibleSections(template, responses);
  const reviewIndex = sections.length;
  const step = Math.min(stepIndex, reviewIndex);
  const onReview = step === reviewIndex;
  const section = onReview ? null : sections[step];

  const searchValue = useMemo(() => (searchCodes ? { searchCodes } : null), [searchCodes]);
  const metaValue = useMemo(() => ({ templateVersion }), [templateVersion]);

  const updateField = (sectionKey: string, field: IntakeField, value: unknown) => {
    setResponses((prev) => {
      let next = { ...(prev[sectionKey] ?? {}), [field.key]: value };
      if (field.type === "boolean" && field.key === NKDA_KEY && value === true) {
        const def = template.sections.find((s) => s.key === sectionKey);
        for (const f of def?.fields ?? []) {
          if (f.type === "group") next = { ...next, [f.key]: [] };
        }
      }
      return { ...prev, [sectionKey]: next };
    });
  };

  const sectionMissing = (sectionKey: string) =>
    missingRequired(template, responses).filter((m) => m.section === sectionKey);

  const allMissing = missingRequired(template, responses);

  // Explicit Save button: show busy while the write is in flight.
  const runSave = async () => {
    if (!onSave) return;
    setBusy(true);
    try {
      await onSave(responses);
    } finally {
      setBusy(false);
    }
  };

  // Autosave on advance: fire-and-forget so navigation is never blocked by the
  // network (responses persist locally and retry on the next save/submit).
  const autosave = () => {
    if (!onSave) return;
    Promise.resolve(onSave(responses)).catch(() => {});
  };

  const next = () => {
    if (section && sectionMissing(section.key).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    autosave();
    setStepIndex(step + 1);
  };

  const back = () => {
    setShowErrors(false);
    setStepIndex(Math.max(0, step - 1));
  };

  const submit = async () => {
    if (allMissing.length > 0) {
      setShowErrors(true);
      return;
    }
    if (!onSubmit) return;
    setBusy(true);
    try {
      await onSubmit(responses);
    } finally {
      setBusy(false);
    }
  };

  const missingHere = section ? sectionMissing(section.key) : [];

  return (
    <IntakeMetaContext.Provider value={metaValue}>
      <IntakeSearchContext.Provider value={searchValue}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
          <StepHeader
            current={step}
            total={sections.length}
            label={onReview ? "Review & submit" : (section?.label ?? "")}
          />

          {onReview ? (
            <ReviewSummary template={template} responses={responses} />
          ) : section ? (
            <div className="space-y-5" data-testid={`intake-section-${section.key}`}>
              {visibleFields(section, responses).map((field) => {
                const disabled =
                  readOnly || (isNkdaActive(section, responses) && field.type === "group");
                return (
                  <FieldRenderer
                    key={field.key}
                    field={field}
                    value={responses[section.key]?.[field.key]}
                    onChange={(v) => updateField(section.key, field, v)}
                    disabled={disabled}
                    idBase={`${section.key}.${field.key}`}
                  />
                );
              })}
            </div>
          ) : null}

          {showErrors && !onReview && missingHere.length > 0 ? (
            <p className="text-sm text-[var(--cs-danger)]" data-testid="intake-section-errors">
              Please complete: {missingHere.map((m) => m.label).join(", ")}
            </p>
          ) : null}

          {showErrors && onReview && allMissing.length > 0 ? (
            <p className="text-sm text-[var(--cs-danger)]" data-testid="intake-review-errors">
              {allMissing.length} required field{allMissing.length === 1 ? "" : "s"} still need your
              attention: {allMissing.map((m) => m.label).join(", ")}
            </p>
          ) : null}

          {!readOnly ? (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <CSButton type="button" variant="ghost" onClick={back} disabled={step === 0 || busy}>
                Back
              </CSButton>
              <div className="flex gap-2">
                {onSave ? (
                  <CSButton type="button" variant="secondary" onClick={runSave} disabled={busy}>
                    Save
                  </CSButton>
                ) : null}
                {onReview ? (
                  <CSButton type="button" variant="primary" onClick={submit} disabled={busy}>
                    Submit
                  </CSButton>
                ) : (
                  <CSButton type="button" variant="primary" onClick={next} disabled={busy}>
                    Next
                  </CSButton>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </IntakeSearchContext.Provider>
    </IntakeMetaContext.Provider>
  );
}

function StepHeader({ current, total, label }: { current: number; total: number; label: string }) {
  const totalSteps = total + 1; // + review
  const pct = Math.round(((current + 1) / totalSteps) * 100);
  return (
    <div className="space-y-2" data-testid="intake-progress">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {current + 1} of {totalSteps}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-[var(--cs-radius-pill)] bg-muted">
        <div
          className="h-full rounded-[var(--cs-radius-pill)] bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{label}</h2>
    </div>
  );
}
