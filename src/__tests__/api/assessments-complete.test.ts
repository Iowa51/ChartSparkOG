// Integration tests for POST /api/assessments/administer/[id]/complete
// All external services mocked. No real network I/O.

import { describe, it, expect, vi, beforeEach } from "vitest";

const authMockState = vi.hoisted(() => ({ authenticated: true, featureAllowed: true }));
const canAccessPatientMock = vi.hoisted(() => vi.fn(async () => true));

vi.mock("@/lib/auth/api-auth", () => ({
  withAuth: (
    handler: (ctx: unknown) => Promise<unknown>,
    options?: { requiredFeature?: string },
  ) => {
    return async (request: unknown, routeContext?: { params: Promise<Record<string, string>> }) => {
      const { NextResponse } = await import("next/server");
      if (!authMockState.authenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (options?.requiredFeature && !authMockState.featureAllowed) {
        return NextResponse.json({ error: "Feature denied" }, { status: 403 });
      }
      const params = routeContext?.params ? await routeContext.params : undefined;
      return handler({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          role: "USER",
          organizationId: "test-org-id",
        },
        request,
        params,
      });
    };
  },
  canAccessPatient: canAccessPatientMock,
}));

const logAuditEventMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: logAuditEventMock,
}));

vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));

vi.mock("@/lib/utils/get-client-ip", () => ({
  getRequestMetadata: () => ({ ipAddress: "127.0.0.1", userAgent: "vitest" }),
}));

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  authMockState.authenticated = true;
  authMockState.featureAllowed = true;
  process.env.ASSESSMENTS_SIDECAR_URL = "http://localhost:3301";
  process.env.ASSESSMENTS_SIDECAR_SECRET = "test-secret";
  vi.clearAllMocks();
  canAccessPatientMock.mockResolvedValue(true);
});

import { POST } from "@/app/api/assessments/administer/[id]/complete/route";

const VALID_ADMIN_ID = "33333333-3333-4333-8333-333333333333";
const VALID_PATIENT_ID = "44444444-4444-4444-8444-444444444444";

function makeRequest(body: unknown): unknown {
  return {
    method: "POST",
    headers: new Headers({ "content-type": "application/json", "user-agent": "vitest" }),
    url: `http://localhost:3000/api/assessments/administer/${VALID_ADMIN_ID}/complete`,
    json: async () => body,
  };
}

function makeRouteContext() {
  return { params: Promise.resolve({ id: VALID_ADMIN_ID }) };
}

const ADMIN_LOOKUP_RESPONSE = {
  id: VALID_ADMIN_ID,
  patient_id: VALID_PATIENT_ID,
  scale_id: "phq-9",
  status: "in_progress",
};

const COMPLETION_RESPONSE = {
  administration_id: VALID_ADMIN_ID,
  scale_id: "phq-9",
  total_score: 14,
  severity: "Moderately Severe",
  severity_code: "moderate-severe",
  flags: ["HIGH_RISK"],
  completed_at: "2026-05-31T20:00:00.000Z",
};

describe("POST /api/assessments/administer/[id]/complete", () => {
  it("completes the administration and audit-logs ASSESSMENT_COMPLETE on success", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(ADMIN_LOOKUP_RESPONSE), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(COMPLETION_RESPONSE), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const res = await (POST as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest({ responses: { item1: 2, item2: 3 } }),
      makeRouteContext(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.severity_code).toBe("moderate-severe");

    expect(canAccessPatientMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "test-user-id" }),
      VALID_PATIENT_ID,
    );

    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ASSESSMENT_COMPLETE",
        resourceId: VALID_ADMIN_ID,
        phiAccessed: true,
        details: expect.objectContaining({
          patient_id: VALID_PATIENT_ID,
          scale_id: "phq-9",
          success: true,
        }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      `/api/v1/assessments/administer/${VALID_ADMIN_ID}/complete`,
    );
  });

  it("returns 503 fallback when the sidecar 5xxs during completion", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(ADMIN_LOOKUP_RESPONSE), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockRejectedValueOnce(new Error("upstream timeout"));

    const res = await (POST as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest({ responses: { item1: 1 } }),
      makeRouteContext(),
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.fallback).toBe(true);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ASSESSMENT_COMPLETE",
        details: expect.objectContaining({ success: false }),
      }),
    );
  });

  it("returns 403 and audits PERMISSION_DENIED when canAccessPatient denies the lookup patient", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(ADMIN_LOOKUP_RESPONSE), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    canAccessPatientMock.mockResolvedValueOnce(false);

    const res = await (POST as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest({ responses: { item1: 1 } }),
      makeRouteContext(),
    );

    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the lookup
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PERMISSION_DENIED",
        details: expect.objectContaining({
          action: "ASSESSMENT_COMPLETE",
          reason: "canAccessPatient denied",
        }),
      }),
    );
  });

  it("returns 404 when the administration does not exist", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await (POST as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest({ responses: { item1: 1 } }),
      makeRouteContext(),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when responses field is missing", async () => {
    const res = await (POST as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest({}),
      makeRouteContext(),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
