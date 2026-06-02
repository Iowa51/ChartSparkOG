// Integration tests for POST /api/assessments/administer
// All external services mocked. No real network I/O.

import { describe, it, expect, vi, beforeEach } from "vitest";

const authMockState = vi.hoisted(() => ({ authenticated: true, featureAllowed: true }));
const canAccessPatientMock = vi.hoisted(() => vi.fn(async () => true));

vi.mock("@/lib/auth/api-auth", () => ({
  withAuth: (
    handler: (ctx: unknown) => Promise<unknown>,
    options?: { requiredFeature?: string },
  ) => {
    return async (request: unknown) => {
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
  canAccessPatientMock.mockResolvedValue(true);
  process.env.ASSESSMENTS_SIDECAR_URL = "http://localhost:3301";
  process.env.ASSESSMENTS_SIDECAR_SECRET = "test-secret";
  vi.clearAllMocks();
  canAccessPatientMock.mockResolvedValue(true);
});

import { POST } from "@/app/api/assessments/administer/route";

const VALID_PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const NEW_ADMIN_ID = "22222222-2222-4222-8222-222222222222";

function makeRequest(body: unknown): unknown {
  return {
    method: "POST",
    headers: new Headers({ "content-type": "application/json", "user-agent": "vitest" }),
    url: "http://localhost:3000/api/assessments/administer",
    json: async () => body,
  };
}

describe("POST /api/assessments/administer", () => {
  it("creates an administration and audit-logs ASSESSMENT_ADMINISTER on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: NEW_ADMIN_ID, status: "in_progress" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(
      makeRequest({
        patient_id: VALID_PATIENT_ID,
        scale_id: "phq-9",
        delivery_method: "in_office",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(NEW_ADMIN_ID);

    expect(canAccessPatientMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "test-user-id" }),
      VALID_PATIENT_ID,
    );

    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ASSESSMENT_ADMINISTER",
        resourceId: NEW_ADMIN_ID,
        phiAccessed: true,
        details: expect.objectContaining({
          patient_id: VALID_PATIENT_ID,
          scale_id: "phq-9",
          success: true,
        }),
      }),
    );

    // Bearer + identity headers
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/assessments/administer"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-secret",
          "X-User-Id": "test-user-id",
          "X-Organization-Id": "test-org-id",
        }),
      }),
    );
  });

  it("returns 403 and audits PERMISSION_DENIED when canAccessPatient denies", async () => {
    canAccessPatientMock.mockResolvedValueOnce(false);

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(
      makeRequest({
        patient_id: VALID_PATIENT_ID,
        scale_id: "phq-9",
      }),
    );

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PERMISSION_DENIED",
        details: expect.objectContaining({
          action: "ASSESSMENT_ADMINISTER",
          reason: "canAccessPatient denied",
        }),
      }),
    );
  });

  it("returns 503 fallback when the sidecar is unreachable and audit-logs the failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));

    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(
      makeRequest({
        patient_id: VALID_PATIENT_ID,
        scale_id: "phq-9",
      }),
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.fallback).toBe(true);

    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ASSESSMENT_ADMINISTER",
        details: expect.objectContaining({ success: false }),
      }),
    );
  });

  it("returns 400 when patient_id is missing", async () => {
    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(
      makeRequest({ scale_id: "phq-9" }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    authMockState.authenticated = false;
    const res = await (POST as unknown as (r: unknown) => Promise<Response>)(
      makeRequest({ patient_id: VALID_PATIENT_ID, scale_id: "phq-9" }),
    );
    expect(res.status).toBe(401);
  });
});
