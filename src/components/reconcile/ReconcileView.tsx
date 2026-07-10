"use client";

// Sprint 2 / P3 (Part C) -- provider reconciliation view. Per-row accept / edit /
// reject on the three first-class coded domains; the other domains are listed
// read-only. Code-less rows are resolved via the same terminology search path
// the intake pickers use (GET /api/terminology/[system]). The sign flow follows
// the server state machine (provider_review -> reconciled -> signed); signing
// generates a DRAFT note server-side. All writes go through the RECONCILE_V1
// API; on success we refresh the server data.

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SubmissionDetail, DomainRowView } from "@/lib/reconcile/data";
import { summarizeRows, readyToSign, type ReconcileRow } from "@/lib/reconcile/reconcile";

type FirstClassDomain = "problems" | "medications" | "allergies";

const DOMAIN_SYSTEM: Record<FirstClassDomain, string> = {
  problems: "icd10",
  medications: "rxnorm",
  allergies: "allergen",
};

interface CodedPick {
  code: string | null;
  display: string;
  system: string;
}

function toReconcileRows(rows: DomainRowView[]): ReconcileRow[] {
  return rows.map((r) => ({
    id: r.id,
    reconciled: Boolean(r.reconciled),
    rejected: Boolean(r.rejected),
    needs_coding: Boolean(r.needs_coding),
  }));
}

function rowLabel(domain: string, r: DomainRowView): string {
  if (domain === "problems") return String(r.display || r.code || "—");
  if (domain === "medications") return String(r.name || "—");
  if (domain === "allergies")
    return r.nkda ? "No known drug allergies" : String(r.allergen_display || "—");
  if (domain === "family_history") return String(r.condition_display || r.relative || "—");
  if (domain === "immunizations") return String(r.vaccine_display || "—");
  if (domain === "ros_responses") return `${r.system}: ${r.finding}`;
  return "—";
}

export function ReconcileView({ detail }: { detail: SubmissionDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (path: string, body: unknown): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/reconcile/${detail.id}/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          setError(b.error?.message ?? "Action failed.");
          return false;
        }
        router.refresh();
        return true;
      } catch {
        setError("Action failed.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [detail.id, router],
  );

  const rowAction = (
    domain: FirstClassDomain,
    rowId: string,
    action: "accept" | "reject",
    coded?: CodedPick,
  ) => call("row", { domain, row_id: rowId, action, coded });

  const firstClass = summarizeRows([
    ...toReconcileRows(detail.problems),
    ...toReconcileRows(detail.medications),
    ...toReconcileRows(detail.allergies),
  ]);
  const canSign = readyToSign([
    ...toReconcileRows(detail.problems),
    ...toReconcileRows(detail.medications),
    ...toReconcileRows(detail.allergies),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{detail.patientName}</h1>
          <p className="text-sm text-muted-foreground">
            Status: {detail.status} · {firstClass.unreconciled} unreconciled · {firstClass.codeless}{" "}
            need codes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {detail.status === "patient_entered" && (
            <button
              disabled={busy}
              onClick={() => call("status", { to: "provider_review" })}
              className={btn}
            >
              Start review
            </button>
          )}
          {detail.status === "provider_review" && (
            <button
              disabled={busy || !canSign}
              onClick={() => call("status", { to: "reconciled" })}
              className={btn}
              title={canSign ? "" : "Resolve every item first"}
            >
              Mark reconciled
            </button>
          )}
          {detail.status === "reconciled" && (
            <button
              disabled={busy}
              onClick={() => call("status", { to: "signed" })}
              className={btn}
            >
              Sign &amp; generate note
            </button>
          )}
          {detail.status === "signed" && (
            <span className="text-sm font-medium text-green-700">Signed</span>
          )}
        </div>
      </header>

      {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <FirstClassSection
        title="Problems"
        domain="problems"
        rows={detail.problems}
        busy={busy}
        onAction={rowAction}
      />
      <FirstClassSection
        title="Medications"
        domain="medications"
        rows={detail.medications}
        busy={busy}
        onAction={rowAction}
      />
      <FirstClassSection
        title="Allergies"
        domain="allergies"
        rows={detail.allergies}
        busy={busy}
        onAction={rowAction}
      />

      <ListableSection title="Family history" domain="family_history" rows={detail.familyHistory} />
      <ListableSection title="Immunizations" domain="immunizations" rows={detail.immunizations} />
      <ListableSection title="Review of systems" domain="ros_responses" rows={detail.ros} />
    </div>
  );
}

const btn =
  "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50";

function FirstClassSection({
  title,
  domain,
  rows,
  busy,
  onAction,
}: {
  title: string;
  domain: FirstClassDomain;
  rows: DomainRowView[];
  busy: boolean;
  onAction: (
    domain: FirstClassDomain,
    rowId: string,
    action: "accept" | "reject",
    coded?: CodedPick,
  ) => Promise<boolean>;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None reported.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((r) => (
            <RowItem key={r.id} domain={domain} row={r} busy={busy} onAction={onAction} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RowItem({
  domain,
  row,
  busy,
  onAction,
}: {
  domain: FirstClassDomain;
  row: DomainRowView;
  busy: boolean;
  onAction: (
    domain: FirstClassDomain,
    rowId: string,
    action: "accept" | "reject",
    coded?: CodedPick,
  ) => Promise<boolean>;
}) {
  const status = row.rejected ? "rejected" : row.reconciled ? "accepted" : "pending";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
      <div className="min-w-0">
        <span className="font-medium">{rowLabel(domain, row)}</span>
        {row.needs_coding && !row.rejected && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            needs code
          </span>
        )}
        {status !== "pending" && (
          <span className="ml-2 text-xs text-muted-foreground">({status})</span>
        )}
      </div>
      {status === "pending" && (
        <div className="flex items-center gap-2">
          {row.needs_coding ? (
            <CodeResolver
              system={DOMAIN_SYSTEM[domain]}
              disabled={busy}
              onPick={(coded) => onAction(domain, row.id, "accept", coded)}
            />
          ) : (
            <button
              disabled={busy}
              onClick={() => onAction(domain, row.id, "accept")}
              className={smBtn}
            >
              Accept
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => onAction(domain, row.id, "reject")}
            className="rounded-md border px-2 py-1 text-xs"
          >
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

const smBtn =
  "rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50";

// Reuses the intake terminology proxy (same path as the patient pickers).
function CodeResolver({
  system,
  disabled,
  onPick,
}: {
  system: string;
  disabled: boolean;
  onPick: (coded: CodedPick) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CodedPick[]>([]);

  async function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/terminology/${system}?q=${encodeURIComponent(value)}`);
      const body = (await res.json()) as { results?: CodedPick[] };
      setResults((body.results ?? []).slice(0, 6));
    } catch {
      setResults([]);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        disabled={disabled}
        value={q}
        onChange={(e) => search(e.target.value)}
        placeholder="Search code…"
        className="w-40 rounded-md border px-2 py-1 text-xs"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-64 overflow-auto rounded-md border bg-background text-xs shadow">
          {results.map((r) => (
            <li key={`${r.system}-${r.code}-${r.display}`}>
              <button
                type="button"
                className="block w-full px-2 py-1 text-left hover:bg-muted"
                onClick={() => {
                  setResults([]);
                  setQ(r.display);
                  onPick(r);
                }}
              >
                {r.display}{" "}
                {r.code ? <span className="text-muted-foreground">({r.code})</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListableSection({
  title,
  domain,
  rows,
}: {
  title: string;
  domain: string;
  rows: DomainRowView[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      <ul className="divide-y rounded-md border text-sm">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-2">
            {rowLabel(domain, r)}
          </li>
        ))}
      </ul>
    </section>
  );
}
