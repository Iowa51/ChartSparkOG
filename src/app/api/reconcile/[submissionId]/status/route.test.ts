// @vitest-environment node
//
// Sprint 2 / P3-FIXES (CRIT-2) -- reconcile status transition route. Asserts the
// readiness MIRROR: provider_review requires submitted_at; reconciled/signed
// require every first-class row resolved. The DB trigger is the true gate; these
// pre-checks give precise 409s. Supabase is stubbed; validateRequest +
// buildIntakeNoteDraft + assertReconcileReady run for real.

import { describe, it, expect, vi, beforeEach } from "vitest";

const VALID_ID = "22222222-2222-4222-8222-222222222222";

interface Row {
  id: string;
  reconciled: boolean;
  rejected: boolean;
  needs_coding: boolean;
}

const H = vi.hoisted(() => ({
  reconcileEnabled: true,
  user: { id: "clin-1", email: "c@test", role: "USER", organizationId: "org-1" },
  submission: { submitted_at: "2026-07-08T00:00:00Z" } as { submitted_at: string | null } | null,
  rows: { problems: [] as Row[], medications: [] as Row[], allergies: [] as Row[] },
  updateResult: null as Record<string, unknown> | null,
  updateError: null as unknown,
  noteId: "note-1" as string | null,
}));

vi.mock("@/lib/config/environment", () => ({ isReconcileV1Enabled: () => H.reconcileEnabled }));
vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));
vi.mock("@/lib/auth/api-auth", () => ({
  withAuth: (handler: (ctx: unknown) => Promise<unknown>) => {
    return async (request: unknown, routeCtx?: { params: Promise<Record<string, string>> }) => {
      const params = routeCtx?.params ? await routeCtx.params : undefined;
      return handler({ user: H.user, request, params });
    };
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeSupabase() }));

// Minimal Supabase query stub. Distinguishes the intake_submissions readiness
// read (select->maybeSingle) from the transition (update->select->maybeSingle),
// resolves domain reads (thenable) to H.rows, and the note insert to H.noteId.
type Resolved = { data: unknown; error: unknown };
function makeSupabase() {
  return {
    from(table: string) {
      const state = { table, op: "select" };
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        not: () => builder,
        order: () => builder,
        update: () => {
          state.op = "update";
          return builder;
        },
        insert: () => {
          state.op = "insert";
          return builder;
        },
        maybeSingle: () => Promise.resolve(resolveSingle(state)),
        single: () => Promise.resolve(resolveSingle(state)),
        then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) =>
          Promise.resolve(resolveList(state)).then(onF, onR),
      };
      return builder;
    },
  };
}
function resolveSingle(b: { table: string; op: string }): Resolved {
  if (b.table === "intake_submissions" && b.op === "select")
    return { data: H.submission, error: null };
  if (b.table === "intake_submissions" && b.op === "update")
    return { data: H.updateResult, error: H.updateError };
  if (b.table === "clinical_notes" && b.op === "insert")
    return { data: H.noteId ? { id: H.noteId } : null, error: null };
  return { data: null, error: null };
}
function resolveList(b: { table: string }): Resolved {
  if (b.table === "problems" || b.table === "medications" || b.table === "allergies") {
    return { data: H.rows[b.table as keyof typeof H.rows], error: null };
  }
  return { data: [], error: null };
}

import { NextRequest } from "next/server";
import { POST } from "./route";

function post(to: string, id = VALID_ID): Promise<Response> {
  const req = new NextRequest("http://localhost:3000/api/reconcile/" + id + "/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to }),
  });
  return POST(req, {
    params: Promise.resolve({ submissionId: id }),
  }) as unknown as Promise<Response>;
}

const resolved: Row = { id: "r1", reconciled: true, rejected: false, needs_coding: false };
const unresolved: Row = { id: "r2", reconciled: false, rejected: false, needs_coding: false };

beforeEach(() => {
  H.reconcileEnabled = true;
  H.submission = { submitted_at: "2026-07-08T00:00:00Z" };
  H.rows = { problems: [resolved], medications: [], allergies: [] };
  H.updateResult = {
    id: VALID_ID,
    status: "provider_review",
    patient_id: "pat-1",
    organization_id: "org-1",
    signed_snapshot: null,
  };
  H.updateError = null;
  H.noteId = "note-1";
});

describe("POST /api/reconcile/[submissionId]/status", () => {
  it("feature-off -> 404", async () => {
    H.reconcileEnabled = false;
    expect((await post("provider_review")).status).toBe(404);
  });

  it("bad submission id -> 404", async () => {
    expect((await post("provider_review", "not-a-uuid")).status).toBe(404);
  });

  it("provider_review with submitted_at set -> 200", async () => {
    const res = await post("provider_review");
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("provider_review");
  });

  it("provider_review when NOT submitted -> 409 (readiness mirror)", async () => {
    H.submission = { submitted_at: null };
    const res = await post("provider_review");
    expect(res.status).toBe(409);
  });

  it("provider_review on a missing submission -> 404", async () => {
    H.submission = null;
    expect((await post("provider_review")).status).toBe(404);
  });

  it("reconciled with an unresolved first-class row -> 409", async () => {
    H.rows = { problems: [resolved, unresolved], medications: [], allergies: [] };
    const res = await post("reconciled");
    expect(res.status).toBe(409);
  });

  it("signed with an unresolved first-class row -> 409 (CRIT-2)", async () => {
    H.rows = {
      problems: [],
      medications: [{ id: "m", reconciled: true, rejected: false, needs_coding: true }],
      allergies: [],
    };
    const res = await post("signed");
    expect(res.status).toBe(409);
  });

  it("signed with every row resolved -> 200 + note draft", async () => {
    H.rows = {
      problems: [resolved],
      medications: [],
      allergies: [{ id: "a", reconciled: false, rejected: true, needs_coding: true }],
    };
    H.updateResult = {
      id: VALID_ID,
      status: "signed",
      patient_id: "pat-1",
      organization_id: "org-1",
      signed_snapshot: { problems: [], medications: [], allergies: [], ros: [] },
    };
    const res = await post("signed");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("signed");
    expect(body.noteId).toBe("note-1");
  });
});
