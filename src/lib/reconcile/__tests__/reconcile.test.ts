import { describe, it, expect } from "vitest";
import {
  nextStatus,
  isLegalTransition,
  summarizeRows,
  isRowResolved,
  canAccept,
  readyToSign,
  rollupSummaries,
  type ReconcileRow,
} from "@/lib/reconcile/reconcile";

const row = (o: Partial<ReconcileRow> = {}): ReconcileRow => ({
  id: o.id ?? "r",
  reconciled: o.reconciled ?? false,
  rejected: o.rejected ?? false,
  needs_coding: o.needs_coding ?? false,
});

describe("state machine helpers", () => {
  it("nextStatus follows the forward-only chain", () => {
    expect(nextStatus("patient_entered")).toBe("provider_review");
    expect(nextStatus("provider_review")).toBe("reconciled");
    expect(nextStatus("reconciled")).toBe("signed");
    expect(nextStatus("signed")).toBeNull();
  });

  it("isLegalTransition rejects skips and backward moves", () => {
    expect(isLegalTransition("patient_entered", "provider_review")).toBe(true);
    expect(isLegalTransition("patient_entered", "reconciled")).toBe(false); // skip
    expect(isLegalTransition("reconciled", "provider_review")).toBe(false); // backward
    expect(isLegalTransition("reconciled", "signed")).toBe(true);
  });
});

describe("summarizeRows", () => {
  it("counts accepted / rejected / unreconciled / codeless", () => {
    const s = summarizeRows([
      row({ id: "1", reconciled: true }),
      row({ id: "2", rejected: true, needs_coding: true }),
      row({ id: "3", needs_coding: true }),
      row({ id: "4" }),
    ]);
    expect(s.total).toBe(4);
    expect(s.accepted).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.unreconciled).toBe(2);
    // codeless counts needs_coding rows that are NOT rejected (row 3 only).
    expect(s.codeless).toBe(1);
  });
});

describe("isRowResolved / canAccept / readyToSign", () => {
  it("a rejected row is resolved", () => {
    expect(isRowResolved(row({ rejected: true, needs_coding: true }))).toBe(true);
  });
  it("an accepted-and-coded row is resolved", () => {
    expect(isRowResolved(row({ reconciled: true }))).toBe(true);
  });
  it("an accepted row still needing a code is NOT resolved", () => {
    expect(isRowResolved(row({ reconciled: true, needs_coding: true }))).toBe(false);
  });
  it("an untouched row is not resolved", () => {
    expect(isRowResolved(row())).toBe(false);
  });

  it("canAccept blocks accepting a code-less row without a code", () => {
    expect(canAccept({ needs_coding: true }, false)).toBe(false);
    expect(canAccept({ needs_coding: true }, true)).toBe(true);
    expect(canAccept({ needs_coding: false }, false)).toBe(true);
  });

  it("readyToSign is true only when every row is resolved", () => {
    expect(readyToSign([row({ reconciled: true }), row({ rejected: true })])).toBe(true);
    expect(readyToSign([row({ reconciled: true }), row()])).toBe(false);
    expect(readyToSign([])).toBe(true); // nothing to reconcile
  });
});

describe("rollupSummaries", () => {
  it("sums per-domain summaries", () => {
    const a = summarizeRows([row({ reconciled: true }), row()]);
    const b = summarizeRows([row({ needs_coding: true }), row({ rejected: true })]);
    const total = rollupSummaries([a, b]);
    expect(total.total).toBe(4);
    expect(total.accepted).toBe(1);
    expect(total.rejected).toBe(1);
    expect(total.unreconciled).toBe(2);
    expect(total.codeless).toBe(1);
  });
});
