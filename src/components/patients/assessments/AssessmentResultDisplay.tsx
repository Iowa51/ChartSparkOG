"use client";

// Renders one row in the patient's assessment list: scale name, date, score,
// severity code, and — critically — a prominent SAFETY indicator whenever the
// sidecar marks the result safety-relevant (has_safety_flags). The list
// payload deliberately carries only derived metadata: severity_code (no human
// severity label) and has_safety_flags (no raw flag strings). Full flags and
// the narrative live behind the detail endpoint.

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { AssessmentSummary } from "@/lib/assessments/types";
import { scaleLabel } from "@/lib/assessments/scale-labels";

interface AssessmentResultDisplayProps {
  summary: AssessmentSummary;
  /** Optional callback when the user clicks to view the trend chart. */
  onViewTrend?: (scaleId: string) => void;
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

export default function AssessmentResultDisplay({
  summary,
  onViewTrend,
}: AssessmentResultDisplayProps) {
  const [expanded, setExpanded] = useState(false);

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
            className="text-[11px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
          >
            <AlertTriangle className="h-3 w-3" />
            Safety flag — review required
          </span>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
          {onViewTrend ? (
            <button
              type="button"
              onClick={() => onViewTrend(summary.scale_id)}
              className="text-xs font-bold text-primary hover:underline"
            >
              View trend →
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Open the assessment for full flags and the clinical narrative.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
