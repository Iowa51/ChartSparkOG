// Integration tests for GET /api/assessments/scales/[id]
// All external services mocked. No real network I/O.

import { describe, it, expect, vi, beforeEach } from "vitest";

const authMockState = vi.hoisted(() => ({
  authenticated: true,
  featureAllowed: true,
}));

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
        return NextResponse.json(
          { error: "Feature not enabled for your account" },
          { status: 403 },
        );
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
  canAccessPatient: vi.fn(async () => true),
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
});

import { GET } from "@/app/api/assessments/scales/[id]/route";

function makeRequest(): unknown {
  return {
    method: "GET",
    headers: new Headers({ "user-agent": "vitest" }),
    url: "http://localhost:3000/api/assessments/scales/phq-9",
  };
}

function makeRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const PHQ9_PROJECTION = {
  id: "phq9",
  name: "PHQ-9",
  responseShape: "flat-likert",
  options: [
    { value: 0, label: "Not at all" },
    { value: 1, label: "Several days" },
    { value: 2, label: "More than half the days" },
    { value: 3, label: "Nearly every day" },
  ],
  items: Array.from({ length: 9 }, (_, i) => ({ id: `item${i + 1}`, text: `Item ${i + 1}` })),
};

describe("GET /api/assessments/scales/[id]", () => {
  it("returns the projection on success and audit-logs the access", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(PHQ9_PROJECTION), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await (GET as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest(),
      makeRouteContext("phq-9"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("phq9");
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ASSESSMENT_SCALE_READ",
        resourceId: "phq-9",
        details: expect.objectContaining({ success: true, sidecar_status: 200 }),
      }),
    );

    // Verify the sidecar was called with the shared-secret bearer and the
    // identity headers — these are non-negotiable per the contract.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/assessments/scales/phq-9"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-secret",
          "X-User-Id": "test-user-id",
          "X-Organization-Id": "test-org-id",
        }),
      }),
    );
  });

  it("returns 404 when the sidecar reports an unknown scale_id", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await (GET as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest(),
      makeRouteContext("not-a-real-scale"),
    );
    expect(res.status).toBe(404);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ASSESSMENT_SCALE_READ",
        details: expect.objectContaining({ success: false }),
      }),
    );
  });

  it("returns 401 when the user is not authenticated", async () => {
    authMockState.authenticated = false;
    const res = await (GET as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest(),
      makeRouteContext("phq-9"),
    );
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the ASSESSMENTS_V1 feature is denied", async () => {
    authMockState.featureAllowed = false;
    const res = await (GET as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest(),
      makeRouteContext("phq-9"),
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the scale id is malformed", async () => {
    const res = await (GET as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest(),
      makeRouteContext("not a valid id!"),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 with fallback flag when the sidecar is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await (GET as unknown as (r: unknown, ctx: unknown) => Promise<Response>)(
      makeRequest(),
      makeRouteContext("phq-9"),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.fallback).toBe(true);
  });
});
