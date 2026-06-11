"use client";

// AssessmentTrendView — line chart of total_score over time for one scale on
// one patient, fed by the sidecar trend endpoint. Points whose flags are
// safety-relevant (shared isSafetyFlag predicate) render as red markers so a
// suicide-risk administration is never an anonymous dot on a chart.

import { useEffect, useState } from "react";
import type { Key } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAssessmentTrend } from "@/lib/assessments/client";
import type { TrendPoint } from "@/lib/assessments/types";
import { isSafetyFlag } from "./AssessmentResultDisplay";

interface AssessmentTrendViewProps {
  patientId: string;
  scaleId: string;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function hasSafetyFlags(point: TrendPoint): boolean {
  return point.flags.some(isSafetyFlag);
}

interface TrendDotProps {
  key?: Key | null;
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendPoint;
}

// Custom recharts dot: red + larger for safety-relevant points. recharts
// passes `key` inside props; it must be applied directly, not spread.
function renderTrendDot(props: TrendDotProps) {
  const safety = props.payload ? hasSafetyFlags(props.payload) : false;
  return (
    <circle
      key={props.key ?? `trend-dot-${props.index}`}
      cx={props.cx}
      cy={props.cy}
      r={safety ? 5 : 3.5}
      fill={safety ? "#dc2626" : "#3b82f6"}
      stroke="#ffffff"
      strokeWidth={1}
      data-testid={safety ? "trend-point-safety" : "trend-point"}
    />
  );
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-md space-y-0.5">
      <p className="font-semibold text-foreground">{formatDate(point.scored_at)}</p>
      <p className="text-muted-foreground">Score: {point.total_score}</p>
      <p className="text-muted-foreground">Severity: {point.severity_code}</p>
      {point.flags.length > 0 && (
        <p className="text-muted-foreground">
          Flags: {point.flags.map((f) => f.replace(/_/g, " ")).join(", ")}
        </p>
      )}
    </div>
  );
}

// One row of the "<2 points" fallback list — same date/score/severity layout
// as the assessment cards so the single administration is still visible.
function SinglePointRow({ point }: { point: TrendPoint }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-3"
      data-testid="trend-single-point"
    >
      <span className="text-xs text-muted-foreground">{formatDate(point.scored_at)}</span>
      <div className="flex items-center gap-3">
        <span className="text-lg font-black tabular-nums text-foreground">{point.total_score}</span>
        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {point.severity_code}
        </span>
      </div>
    </div>
  );
}

export default function AssessmentTrendView({ patientId, scaleId }: AssessmentTrendViewProps) {
  const [points, setPoints] = useState<TrendPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPoints(null);
      setError(null);
      try {
        const data = await getAssessmentTrend(patientId, scaleId);
        if (cancelled) return;
        // Chart needs ascending time order; the sidecar's ordering is not
        // contractual. ISO timestamps sort lexicographically.
        setPoints([...data].sort((a, b) => a.scored_at.localeCompare(b.scored_at)));
      } catch {
        if (!cancelled) setError("Couldn't load trend data.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, scaleId]);

  if (error) {
    return (
      <div
        role="alert"
        data-testid="trend-error"
        className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300"
      >
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (points === null) {
    return (
      <p
        className="text-sm text-muted-foreground inline-flex items-center gap-2"
        data-testid="trend-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading trend…
      </p>
    );
  }

  if (points.length < 2) {
    return (
      <div className="space-y-3" data-testid="trend-empty">
        <p className="text-sm text-muted-foreground">
          Not enough administrations to plot a trend yet.
        </p>
        {points.map((p) => (
          <SinglePointRow key={p.scored_at} point={p} />
        ))}
      </div>
    );
  }

  return (
    <div className="h-72 w-full" data-testid="trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="scored_at"
            tickFormatter={formatDate}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            label={{ value: "Score", angle: -90, position: "insideLeft" }}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip />} />
          <Line
            type="monotone"
            dataKey="total_score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={renderTrendDot}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
