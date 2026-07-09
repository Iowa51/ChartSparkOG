// @vitest-environment node
//
// Sprint 1 / P2-FIXES-2 (DELTA-API-2): the raw body cap must be enforced while
// the body is read, not solely from Content-Length. These tests drive POST with
// INTAKE_V1 on, origin + rate-limit mocked to pass, so the request reaches the
// body-size guard and the fail-closed 401. External deps are mocked; no network.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config/environment", () => ({ isIntakeV1Enabled: () => true }));
vi.mock("@/lib/security/csrf", () => ({ validateOrigin: () => true }));
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimitByKey: async () => ({ success: true }),
}));
vi.mock("@/lib/utils/get-client-ip", () => ({ getClientIP: () => "127.0.0.1" }));
vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

const URL = "http://localhost:3000/api/portal/intake";
const MAX_BODY_BYTES = 256 * 1024;

function jsonRequest(bodyText: string): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText,
  });
}

function streamRequest(bytes: Uint8Array): NextRequest {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  // A stream body carries no Content-Length -> exercises the streaming cap.
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    // duplex is required by the Fetch spec when the body is a stream
    duplex: "half",
  });
}

describe("POST /api/portal/intake — body size guard (DELTA-API-2)", () => {
  it("accepts a well-formed body and fails closed with 401 (no portal session)", async () => {
    const body = JSON.stringify({
      template_id: null,
      submission_id: null,
      responses: {},
      submit: false,
    });
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(401);
  });

  it("rejects an over-declared Content-Length before reading the body (413)", async () => {
    const res = await POST(jsonRequest("x".repeat(MAX_BODY_BYTES + 1)));
    expect(res.status).toBe(413);
  });

  it("rejects an oversized streamed body with NO Content-Length (413, streaming cap)", async () => {
    const oversized = new TextEncoder().encode("x".repeat(MAX_BODY_BYTES + 1024));
    const res = await POST(streamRequest(oversized));
    expect(res.status).toBe(413);
  });

  it("rejects malformed JSON within the size cap (400)", async () => {
    const res = await POST(jsonRequest("{ not valid json"));
    expect(res.status).toBe(400);
  });

  it("rejects a schema-invalid body (400 validation failed)", async () => {
    // `submit` missing -> IntakeWriteSchema (strict) rejects.
    const res = await POST(
      jsonRequest(JSON.stringify({ template_id: null, submission_id: null, responses: {} })),
    );
    expect(res.status).toBe(400);
  });
});
