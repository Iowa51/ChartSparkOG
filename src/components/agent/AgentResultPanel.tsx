"use client";

import { useState } from "react";
import { X, AlertTriangle, Lock, ExternalLink } from "lucide-react";
import { AgentResult } from "@/lib/agent/types";

interface Props {
  result: AgentResult;
}

function QualityIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.9
      ? "text-emerald-600 stroke-emerald-500"
      : score >= 0.75
        ? "text-amber-600 stroke-amber-500"
        : "text-red-600 stroke-red-500";

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r={radius} fill="none" strokeWidth="4" className="stroke-border" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div>
        <p className={`text-xl font-bold ${color.split(" ")[0]}`}>{pct}%</p>
        <p className="text-xs text-muted-foreground">Quality Score</p>
      </div>
    </div>
  );
}

export function AgentResultPanel({ result }: Props) {
  const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());

  const isRCM = result.mode === "full_pipeline";
  const activeFlags = (result.flags ?? []).filter((_, i) => !dismissedFlags.has(i));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* SECTION C — Review banner */}
      {result.requiresReview && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            <strong>Flagged for supervisor review.</strong> An auditor will review this session
            before the claim is submitted.
          </p>
        </div>
      )}

      {/* SECTION A — All tiers */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Agent Results
        </h3>

        {/* Generated note preview */}
        {result.note && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Generated Note
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {result.note.slice(0, 200)}
              {result.note.length > 200 && (
                <>
                  {"… "}
                  <button className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                    View full note
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        {/* CPT + ICD-10 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {result.cptCode && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Suggested CPT Code
              </p>
              <span className="inline-block px-3 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-lg">
                {result.cptCode}
              </span>
            </div>
          )}

          {result.icd10Codes && result.icd10Codes.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Suggested ICD-10 Codes
              </p>
              <div className="flex flex-wrap gap-2">
                {result.icd10Codes.map((code) => (
                  <span
                    key={code}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-foreground text-xs font-semibold rounded-lg border border-border"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quality score + confidence */}
        <div className="flex flex-wrap items-center gap-6 pt-1">
          {result.qualityScore !== undefined && <QualityIndicator score={result.qualityScore} />}
          {result.confidence !== undefined && (
            <div>
              <p className="text-xl font-bold text-foreground">
                {Math.round(result.confidence * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">Confidence</p>
            </div>
          )}
        </div>

        {/* Quality flags */}
        {activeFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quality Flags
            </p>
            {activeFlags.map((flag, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                  {flag}
                </div>
                <button
                  onClick={() => setDismissedFlags((prev) => new Set([...prev, idx]))}
                  className="shrink-0 text-amber-500 hover:text-amber-700"
                  aria-label="Dismiss flag"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION B — RCM features */}
      <div className="relative bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Billing & Reimbursement
        </h3>

        {isRCM ? (
          <>
            {result.reimbursementEstimate !== undefined && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Medicare Baseline Estimate
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    ${result.reimbursementEstimate.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This is an estimate only — actual reimbursement may vary
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  result.requiresReview
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}
              >
                {result.requiresReview ? "Needs attention" : "Queued for auditor review"}
              </span>

              {result.billingResult?.authRequired !== undefined && (
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    result.billingResult.authRequired
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  Prior Auth: {result.billingResult.authRequired ? "Required" : "Not Required"}
                </span>
              )}
            </div>

            {result.billingResult?.issuesFound && result.billingResult.issuesFound.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Issues Found &amp; Fixed
                </p>
                <ul className="space-y-1">
                  {result.billingResult.issuesFound.map((issue, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                      {issue}
                      {result.billingResult!.issuesFixed[i] && (
                        <span className="text-emerald-600 text-xs font-semibold">→ Fixed</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Blurred/locked content for starter/pro */}
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none space-y-3 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Medicare Baseline Estimate
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-0.5">$XXX.XX</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
                    Queued for auditor review
                  </span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                    Prior Auth: —
                  </span>
                </div>
              </div>

              {/* Lock overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center shadow">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Upgrade prompt */}
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-foreground">
              Your note and billing codes have been generated. Upgrade to the{" "}
              <strong>Complete plan</strong> to have our team handle all claim submission, denied
              claim recovery, and auditor review for you.{" "}
              <a href="/settings/billing" className="text-primary font-semibold hover:underline">
                Upgrade →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
