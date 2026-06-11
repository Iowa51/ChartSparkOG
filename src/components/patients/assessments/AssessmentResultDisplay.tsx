"use client";

// Renders one row in the patient's assessment list: scale name, date, score,
// severity code, and — critically — a prominent SAFETY indicator whenever the
// sidecar marks the result safety-relevant (has_safety_flags). The list
// payload deliberately carries only derived metadata: severity_code (no human
// severity label) and has_safety_flags (no raw flag strings). Full flags and
// the narrative live behind the detail endpoint.

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { getAssessment } from "@/lib/assessments/client";
import type { AssessmentSummary, AssessmentWithResult } from "@/lib/assessments/types";
import { scaleLabel } from "@/lib/assessments/scale-labels";

interface AssessmentResultDisplayProps {
  summary: AssessmentSummary;
  /** Optional callback when the user clicks to view the trend chart. */
  onViewTrend?: (scaleId: string) => void;
}

// Single source of truth for the safety chip styling, shared by the collapsed
// has_safety_flags indicator and every safety-relevant flag in the expanded
// body — so both get byte-identical red/warning treatment.
const SAFETY_CHIP_CLASS =
  "text-[11px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";

// Per-flag safety classification. This MUST stay in sync with the sidecar's
// isSafetyRelevantFlag() in scale-registry.ts — the same predicate that drives
// the list payload's has_safety_flags. A flag is safety-relevant if it contains
// any of these six substrings (case-insensitive); "suicide" alone does NOT
// match "suicidal", so both are listed.
// TODO(clinical-safety-review): consume a server-provided per-flag safety
// classification instead of re-deriving it here, so OG and the sidecar cannot
// drift on what counts as safety-critical.
const SAFETY_FLAG_PATTERN = /critical|suicide|suicidal|self_harm|immediate|high_risk/i;

// Exported so AssessmentTrendView marks the same flags as safety-relevant —
// one predicate, no drift between the list chips and the trend chart dots.
export function isSafetyFlag(flag: string): boolean {
  return SAFETY_FLAG_PATTERN.test(flag);
}

function humanizeFlag(flag: string): string {
  return flag.replace(/_/g, " ");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface AssessmentDetailBodyProps {
  administrationId: string;
  detail: AssessmentWithResult | null;
  loading: boolean;
  error: string | null;
}

// Expanded-card body for the live view: clinical narrative + flags, with
// safety-relevant flags rendered in the same red treatment as the collapsed
// safety chip. Pure presentation — the parent owns the fetch lifecycle.
function AssessmentDetailBody({
  administrationId,
  detail,
  loading,
  error,
}: AssessmentDetailBodyProps) {
  if (error) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-testid={`assessment-detail-error-${administrationId}`}
      >
        Couldn&apos;t load assessment details.
      </p>
    );
  }

  // No detail yet (still loading, or the very first render before the effect
  // fires) reads as loading rather than flashing an empty body.
  if (loading || !detail) {
    return (
      <p
        className="text-xs text-muted-foreground inline-flex items-center gap-2"
        data-testid={`assessment-detail-loading-${administrationId}`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading details…
      </p>
    );
  }

  const result = detail.result;
  if (!result) {
    return <p className="text-xs text-muted-foreground">Assessment not yet completed.</p>;
  }

  // Prefer the full clinical narrative; the one-line interpretation is only a
  // fallback when no narrative was generated.
  const narrative = result.narrative ?? result.interpretation;

  return (
    <div className="space-y-3" data-testid={`assessment-detail-${administrationId}`}>
      {narrative && (
        <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">{narrative}</p>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Flags
        </p>
        {result.flags.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No flags.</p>
        ) : (
          <ul
            className="flex flex-wrap gap-1.5"
            data-testid={`assessment-flags-${administrationId}`}
          >
            {result.flags.map((flag) => (
              <li key={flag}>
                {isSafetyFlag(flag) ? (
                  <span role="alert" className={SAFETY_CHIP_CLASS}>
                    <AlertTriangle className="h-3 w-3" />
                    {humanizeFlag(flag)}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {humanizeFlag(flag)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AssessmentResultDisplay({
  summary,
  onViewTrend,
}: AssessmentResultDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  // Full administration detail (flags + clinical narrative) for the expanded
  // body. Fetched lazily on first expand and cached for the card's lifetime.
  const [detail, setDetail] = useState<AssessmentWithResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  // One-shot fetch the first time the card is expanded. Collapsing then
  // re-expanding does not refetch — the guard ref makes this idempotent per
  // card. The detail body always owns the expanded content; onViewTrend only
  // adds a trend affordance, so it never suppresses this fetch.
  useEffect(() => {
    if (!expanded || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    const load = async () => {
      setDetailLoading(true);
      try {
        setDetail(await getAssessment(summary.id));
      } catch {
        setDetailError("Couldn't load assessment details.");
      } finally {
        setDetailLoading(false);
      }
    };
    load();
  }, [expanded, summary.id]);

  const result = summary.result_summary ?? null;
  const score = result?.total_score ?? null;
  const severityCode = result?.severity_code ?? null;
  const hasSafetyFlags = result?.has_safety_flags ?? false;
  const completedAt = summary.completed_at ?? null;

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      data-testid={`assessment-result-${summary.id}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 rounded-t-xl"
        aria-expanded={expanded}
      >
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-foreground">
            {scaleLabel(summary.scale_id)}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(completedAt)}</span>
        </div>
        <div className="flex items-center gap-3">
          {score !== null && (
            <span className="text-lg font-black tabular-nums text-foreground">{score}</span>
          )}
          {severityCode && (
            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {severityCode}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* SAFETY GUARDRAIL: never let a suicide-risk / safety flag be invisible
          in the list. Wired directly to the sidecar's has_safety_flags. */}
      {hasSafetyFlags && (
        <div className="px-4 pb-2">
          <span
            role="alert"
            data-testid={`safety-flag-${summary.id}`}
            className={SAFETY_CHIP_CLASS}
          >
            <AlertTriangle className="h-3 w-3" />
            Safety flag — review required
          </span>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
          {onViewTrend && (
            <button
              type="button"
              onClick={() => onViewTrend(summary.scale_id)}
              className="text-xs font-bold text-primary hover:underline"
            >
              View trend →
            </button>
          )}
          <AssessmentDetailBody
            administrationId={summary.id}
            detail={detail}
            loading={detailLoading}
            error={detailError}
          />
        </div>
      )}
    </div>
  );
}
