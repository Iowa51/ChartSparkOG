// @vitest-environment node
//
// Sprint 2 / P3-FIXES (MED-5) -- per-row reconcile route phase guard. A row may be
// accepted/rejected ONLY while the parent submission is in provider_review AND
// submitted. patient_entered / reconciled / signed are all rejected (409).

import { describe, it, expect, vi, beforeEach } from "vitest";

const SUB_ID = "22222222-2222-4222-8222-222222222222";
const ROW_ID = "33333333-3333-4333-8333-333333333333";

const H = vi.hoisted(() => {
  const rowId = "33333333-3333-4333-8333-333333333333";
  return {
    reconcileEnabled: true,
    user: { id: "clin-1", email: "c@test", role: "USER", organizationId: "org-1" },
    parent: { status: "provider_review", submitted_at: "2026-07-08T00:00:00Z" } as {
      status: string;
      submitted_at: string | null;
    } | null,
    existing: { id: rowId, needs_coding: false } as { id: string; needs_coding: boolean } | null,
    updateResult: { id: rowId } as Record<string, unknown> | null,
    updateError: null as unknown,
  };
});

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

function makeSupabase() {
  return {
    from(table: string) {
      const b: { table: string; op: string } = { table, op: "select" };
      const self = b as unknown as Record<string, (...a: unknown[]) => unknown>;
      self.select = () => b;
      self.eq = () => b;
      self.update = () => {
        b.op = "update";
        return b;
      };
      self.maybeSingle = async () => resolveSingle(b);
      return b;
    },
  };
}
function resolveSingle(b: { table: string; op: string }) {
  if (b.table === "intake_submissions") return { data: H.parent, error: null };
  if (b.op === "update") return { data: H.updateResult, error: H.updateError };
  return { data: H.existing, error: null }; // domain row lookup
}

import { NextRequest } from "next/server";
import { POST } from "./route";

function post(body: unknown, id = SUB_ID): Promise<Response> {
  const req = new NextRequest("http://localhost:3000/api/reconcile/" + id + "/row", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, {
    params: Promise.resolve({ submissionId: id }),
  }) as unknown as Promise<Response>;
}

const ACCEPT = { domain: "problems", row_id: ROW_ID, action: "accept" };

beforeEach(() => {
  H.reconcileEnabled = true;
  H.parent = { status: "provider_review", submitted_at: "2026-07-08T00:00:00Z" };
  H.existing = { id: ROW_ID, needs_coding: false };
  H.updateResult = { id: ROW_ID };
  H.updateError = null;
});

describe("POST /api/reconcile/[submissionId]/row -- phase guard (MED-5)", () => {
  it("accepts a row when the parent is in provider_review -> 200", async () => {
    const res = await post(ACCEPT);
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe("accept");
  });

  it("rejects the action when the parent is still patient_entered -> 409", async () => {
    H.parent = { status: "patient_entered", submitted_at: "2026-07-08T00:00:00Z" };
    expect((await post(ACCEPT)).status).toBe(409);
  });

  it("rejects the action when the parent is already reconciled -> 409", async () => {
    H.parent = { status: "reconciled", submitted_at: "2026-07-08T00:00:00Z" };
    expect((await post(ACCEPT)).status).toBe(409);
  });

  it("rejects the action when the parent is signed -> 409", async () => {
    H.parent = { status: "signed", submitted_at: "2026-07-08T00:00:00Z" };
    expect((await post(ACCEPT)).status).toBe(409);
  });

  it("rejects the action when the parent is in provider_review but NOT submitted -> 409", async () => {
    H.parent = { status: "provider_review", submitted_at: null };
    expect((await post(ACCEPT)).status).toBe(409);
  });

  it("404 when the parent submission does not exist", async () => {
    H.parent = null;
    expect((await post(ACCEPT)).status).toBe(404);
  });
});
