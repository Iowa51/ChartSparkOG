// Integration tests for POST /api/ai/generate-note
//
// All external services (Azure OpenAI, Supabase, audit sinks) are mocked.
// These tests must never perform real network I/O.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Controllable auth state shared with the vi.mock factory below.
// Must be declared via vi.hoisted so it exists before vi.mock hoisting.
// `canAccess` drives the mocked canAccessPatient() gate per test.
const authMockState = vi.hoisted(() => ({ authenticated: true, canAccess: true }));

// PHI-enrichment helper spies, so tests can assert whether the route reached
// them. Declared via vi.hoisted for the same hoisting reason.
const dataMocks = vi.hoisted(() => ({
  getPatientLatestVitals: vi.fn(async () => null),
  getPatientContextForAI: vi.fn(async () => null),
}));

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
  // Fail-closed patient-access gate; controlled by authMockState.canAccess.
  canAccessPatient: vi.fn(async () => authMockState.canAccess),
}));

vi.mock("@/lib/data/vitals", () => ({
  getPatientLatestVitals: dataMocks.getPatientLatestVitals,
}));

vi.mock("@/lib/data/patient-context", () => ({
  getPatientContextForAI: dataMocks.getPatientContextForAI,
  formatPatientContextForPrompt: vi.fn(() => ""),
}));

vi.mock("@/services/safeAzureOpenAI", () => ({
  default: {
    isAvailable: vi.fn(() => true),
    generateSOAPNote: vi.fn(async () =>
      [
        "SUBJECTIVE",
        "Patient reports intermittent headache for 3 days, rated 6/10.",
        "",
        "OBJECTIVE",
        "BP 120/80, HR 72, afebrile. Alert and oriented.",
        "",
        "ASSESSMENT",
        "Tension-type headache, likely stress-related.",
        "",
        "PLAN",
        "Ibuprofen 400mg PRN. Stress-reduction counseling. Follow up in 1 week.",
      ].join("\n"),
    ),
  },
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/billing/code-analyzer", () => ({
  analyzeNoteForCodes: vi.fn(() => ({
    cpt: [],
    icd10: [],
    cptDetails: [],
    icd10Details: [],
  })),
}));

vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));

// Route import MUST follow all vi.mock calls. vi.mock is hoisted above
// imports by vitest, but keeping the order explicit helps the reader.
import { POST } from "@/app/api/ai/generate-note/route";

function makeJsonRequest(body: unknown): unknown {
  return {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      "x-real-ip": "127.0.0.1",
      "user-agent": "vitest",
    }),
    url: "http://localhost:3000/api/ai/generate-note",
    json: async () => body,
  };
}

describe("POST /api/ai/generate-note", () => {
  beforeEach(() => {
    authMockState.authenticated = true;
    authMockState.canAccess = true;
    vi.clearAllMocks();
  });

  it("returns SOAP sections for valid clinician input", async () => {
    const req = makeJsonRequest({
      clinicianInput: "Patient with headache for 3 days, stress-related.",
      templateFormat: "soap",
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      sections: Record<string, string>;
    };
    expect(json.success).toBe(true);
    expect(json.sections).toBeDefined();
    expect(Object.keys(json.sections)).toEqual(
      expect.arrayContaining(["subjective", "objective", "assessment", "plan"]),
    );
    expect(json.sections.subjective).toMatch(/headache/i);
    expect(json.sections.objective).toMatch(/BP|HR/);
    expect(json.sections.assessment).toMatch(/tension/i);
    expect(json.sections.plan).toMatch(/ibuprofen/i);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMockState.authenticated = false;
    const req = makeJsonRequest({
      clinicianInput: "Patient with headache",
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 400 when input is empty", async () => {
    // Empty object parses cleanly through the Zod schema (all fields default)
    // but is rejected by the secondary "must have some input" check.
    const req = makeJsonRequest({});

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBeDefined();
  });

  // Valid v4 UUID (UUIDSchema = z.string().uuid(), which enforces the variant).
  const PATIENT_UUID = "550e8400-e29b-41d4-a716-446655440000";

  it("returns 403 and skips PHI enrichment when the caller cannot access the patient (item 7.4)", async () => {
    authMockState.canAccess = false;
    const req = makeJsonRequest({
      clinicianInput: "Patient with headache",
      templateFormat: "soap",
      patientId: PATIENT_UUID,
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(403);
    // The gate must fail closed BEFORE any PHI query runs.
    expect(dataMocks.getPatientLatestVitals).not.toHaveBeenCalled();
    expect(dataMocks.getPatientContextForAI).not.toHaveBeenCalled();
  });

  it("enriches with org-scoped vitals when the caller CAN access the patient", async () => {
    authMockState.canAccess = true;
    const req = makeJsonRequest({
      clinicianInput: "Patient with headache",
      templateFormat: "soap",
      patientId: PATIENT_UUID,
    });

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(req);

    expect(res.status).toBe(200);
    // Vitals are fetched with the caller's org id (fail-closed org scope).
    expect(dataMocks.getPatientLatestVitals).toHaveBeenCalledWith(
      PATIENT_UUID,
      "test-org-id",
      undefined,
    );
    expect(dataMocks.getPatientContextForAI).toHaveBeenCalled();
  });
});
