// Provider reconciliation domain logic (Sprint 2 / P3). Pure — no I/O.
//
// A materialized intake produces child rows (source='patient', reconciled=false).
// The provider ACCEPTs (reconciled=true, attribution recorded), EDITs (resolve a
// code, then accept), or REJECTs (rejected=true, soft-flag — kept for audit). The
// signed snapshot records ALL first-class rows WITH their disposition flags
// (P3-CRIT-2), so a rejected row still appears in the legal record, marked rejected;
// it is excluded only from the drafted clinical note. A submission is ready to sign
// when every first-class row is resolved (accepted-and-coded or rejected).

export const INTAKE_STATUSES = [
  "patient_entered",
  "provider_review",
  "reconciled",
  "signed",
] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

// The server-side state machine's forward-only transitions (mirrors the DB
// trigger enforce_intake_submission_state). The provider drives these.
const FORWARD: Record<IntakeStatus, IntakeStatus | null> = {
  patient_entered: "provider_review",
  provider_review: "reconciled",
  reconciled: "signed",
  signed: null,
};

/** The single legal next status, or null if terminal. */
export function nextStatus(current: IntakeStatus): IntakeStatus | null {
  return FORWARD[current];
}

/** Whether `from -> to` is a legal forward transition. */
export function isLegalTransition(from: IntakeStatus, to: IntakeStatus): boolean {
  return FORWARD[from] === to;
}

export interface ReconcileRow {
  id: string;
  reconciled: boolean;
  rejected: boolean;
  needs_coding: boolean;
}

export interface ReconcileSummary {
  total: number;
  accepted: number; // reconciled = true
  rejected: number; // rejected = true
  unreconciled: number; // neither accepted nor rejected
  codeless: number; // needs_coding = true and not yet rejected
}

export function summarizeRows(rows: ReconcileRow[]): ReconcileSummary {
  const summary: ReconcileSummary = {
    total: rows.length,
    accepted: 0,
    rejected: 0,
    unreconciled: 0,
    codeless: 0,
  };
  for (const r of rows) {
    if (r.rejected) summary.rejected += 1;
    else if (r.reconciled) summary.accepted += 1;
    else summary.unreconciled += 1;
    if (r.needs_coding && !r.rejected) summary.codeless += 1;
  }
  return summary;
}

/** A row is resolved when it has been rejected, or accepted with a real code. */
export function isRowResolved(row: ReconcileRow): boolean {
  if (row.rejected) return true;
  return row.reconciled && !row.needs_coding;
}

/**
 * A code-less row may not be accepted until it carries a code — the provider
 * must resolve it via the coded pickers first. `hasCode` reflects the code the
 * provider is submitting with the accept action.
 */
export function canAccept(row: Pick<ReconcileRow, "needs_coding">, hasCode: boolean): boolean {
  return hasCode || !row.needs_coding;
}

/** Ready to sign when every first-class row is resolved. */
export function readyToSign(rows: ReconcileRow[]): boolean {
  return rows.every(isRowResolved);
}

/** Sum per-domain summaries into a single queue-row rollup. */
export function rollupSummaries(summaries: ReconcileSummary[]): ReconcileSummary {
  return summaries.reduce<ReconcileSummary>(
    (acc, s) => ({
      total: acc.total + s.total,
      accepted: acc.accepted + s.accepted,
      rejected: acc.rejected + s.rejected,
      unreconciled: acc.unreconciled + s.unreconciled,
      codeless: acc.codeless + s.codeless,
    }),
    { total: 0, accepted: 0, rejected: 0, unreconciled: 0, codeless: 0 },
  );
}
