"use client";

// Renders a single completed assessment summary: total score, severity,
// flags as chips, and the optional narrative text.

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { AssessmentSummary, AssessmentResult } from "@/lib/assessments/types";

interface AssessmentResultDisplayProps {
  summary: AssessmentSummary;
  result?: AssessmentResult | null;
  /** Optional callback when the user clicks to view trend. */
  onViewTrend?: (scaleId: string) => void;
}

const SAFETY_FLAG_PREFIXES = ["SAFETY", "SUICIDE", "CSSRS", "HIGH_RISK"];

function isSafetyFlag(flag: string): boolean {
  const upper = flag.toUpperCase();
  return SAFETY_FLAG_PREFIXES.some((p) => upper.includes(p));
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
  result,
  onViewTrend,
}: AssessmentResultDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const score = result?.total_score ?? summary.total_score ?? null;
  const severity = result?.severity ?? summary.severity ?? null;
  const flags = result?.flags ?? summary.flags ?? [];
  const completedAt = result?.completed_at ?? summary.completed_at ?? null;

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
            {summary.scale_name ?? summary.scale_id}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(completedAt)}</span>
        </div>
        <div className="flex items-center gap-3">
          {score !== null && (
            <span className="text-lg font-black tabular-nums text-foreground">{score}</span>
          )}
          {severity && (
            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {severity}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {flags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {flags.map((flag) => {
            const safety = isSafetyFlag(flag);
            return (
              <span
                key={flag}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                  safety
                    ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                    : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                {safety && <AlertTriangle className="h-2.5 w-2.5" />}
                {flag}
              </span>
            );
          })}
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
          {result?.narrative && (
            <p className="text-sm text-slate-700 dark:text-slate-300">{result.narrative}</p>
          )}
          {onViewTrend && (
            <button
              type="button"
              onClick={() => onViewTrend(summary.scale_id)}
              className="text-xs font-bold text-primary hover:underline"
            >
              View trend →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
