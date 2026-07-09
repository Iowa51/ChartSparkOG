// Integration tests for POST /api/ai/smart-triage/medication-review
//
// All external services (Azure OpenAI, Supabase, audit sinks) are mocked.
// These tests must never perform real network I/O.

import { describe, it, expect, vi, beforeEach } from "vitest";

const authMockState = vi.hoisted(() => ({ authenticated: true }));

vi.mock("@/lib/auth/api-auth", () => ({
  withAuth: (handler: (ctx: unknown) => Promise<unknown>) => {
    return async (request: unknown) => {
      if (!authMockState.authenticated) {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
      }
      return handler({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          role: "USER",
          organizationId: "test-org-id",
        },
        request,
      });
    };
  },
  // The route gates on canAccessPatient() before any PHI read (added as a P0
  // security fix in 8906ed0). Grant access so these tests exercise the
  // post-access-check branches; without this the mock module omits the export
  // and the route throws "canAccessPatient is not a function".
  canAccessPatient: vi.fn(async () => true),
}));

vi.mock("@/services/safeAzureOpenAI", () => ({
  default: {
    isAvailable: vi.fn(() => true),
    chat: vi.fn(async () =>
      JSON.stringify({
        overall_safety_score: 85,
        drug_drug_interactions: [],
        black_box_warnings: [],
      }),
    ),
  },
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));

// Chainable Supabase mock. Each table returns a fresh chain whose terminal
// methods (`maybeSingle`, `single`, and direct `await`) resolve to
// `{ data, error }`. This supports all three usage patterns the route has:
//   await supabase.from(t).select().eq().maybeSingle()
//   await supabase.from(t).select().eq().eq()            // direct await
//   await supabase.from(t).insert(...)
vi.mock("@/lib/supabase/server", () => {
  const makeChain = (data: unknown, error: unknown = null) => {
    const result = { data, error };
    const chain: Record<string, unknown> = {};
    const selfReturning = ["select", "eq", "gt", "lt", "order", "limit"];
    for (const method of selfReturning) {
      chain[method] = vi.fn(() => chain);
    }
    chain.maybeSingle = vi.fn(() => Promise.resolve(result));
    chain.single = vi.fn(() => Promise.resolve(result));
    chain.insert = vi.fn(() => Promise.resolve(result));
    // Make the chain thenable so `await chain` resolves to { data, error }.
    chain.then = (onFulfilled: (v: unknown) => unknown, onRejected: (r: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected);
    return chain;
  };

  // Canned data per table. `patient_medications: []` is the critical piece:
  // an empty medication list triggers the route's early-return branch.
  const tableResponses: Record<string, unknown> = {
    smart_triage_results: null, // no cached result
    patients: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      age: 45,
      gender: "F",
      weight: 70,
    },
    patient_medications: [],
    patient_problems: [],
    patient_allergies: [],
  };

  return {
    createClient: vi.fn(async () => ({
      from: vi.fn((table: string) => makeChain(tableResponses[table] ?? null)),
    })),
  };
});

import { POST } from "@/app/api/ai/smart-triage/medication-review/route";

function makeJsonRequest(body: unknown): unknown {
  return {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      "x-real-ip": "127.0.0.1",
      "user-agent": "vitest",
    }),
    url: "http://localhost:3000/api/ai/smart-triage/medication-review",
    json: async () => body,
  };
}

const VALID_PATIENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /api/ai/smart-triage/medication-review", () => {
  beforeEach(() => {
    authMockState.authenticated = true;
    vi.clearAllMocks();
  });

  it("returns a null result when the patient has no active medications", async () => {
    const req = makeJsonRequest({ patient_id: VALID_PATIENT_ID });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      result: unknown;
      safety_score: unknown;
      message?: string;
    };
    expect(json.result).toBeNull();
    expect(json.safety_score).toBeNull();
    expect(json.message).toMatch(/no active medications/i);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMockState.authenticated = false;
    const req = makeJsonRequest({ patient_id: VALID_PATIENT_ID });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/unauthorized/i);
  });
});
