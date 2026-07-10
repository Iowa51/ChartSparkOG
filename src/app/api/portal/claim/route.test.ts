// @vitest-environment node
//
// Sprint 2 / P3 (Part A) -- portal invite claim flow. The claim unit
// (claimPortalInvite) and the session client are mocked; these tests assert the
// route's status mapping (feature gate, validation, claim outcomes, session).

import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => ({
  intakeEnabled: true,
  claimResult: { ok: true, email: "pat@example.com", patientId: "pat-1" } as
    | { ok: true; email: string; patientId: string }
    | { ok: false; status: number; error: string },
  signInError: null as unknown,
}));

vi.mock("@/lib/config/environment", () => ({ isIntakeV1Enabled: () => H.intakeEnabled }));
vi.mock("@/lib/security/csrf", () => ({ validateOrigin: () => true }));
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimitByKey: async () => ({ success: true }),
}));
vi.mock("@/lib/utils/get-client-ip", () => ({
  getRequestMetadata: () => ({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));
vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));
vi.mock("@/lib/portal/portal-invites", () => ({ claimPortalInvite: async () => H.claimResult }));
vi.mock("@/lib/supabase/route-handler-client", () => ({
  createRouteHandlerClient: () => ({
    supabase: { auth: { signInWithPassword: async () => ({ error: H.signInError }) } },
    applyCookies: (r: Response) => r,
  }),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

function post(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost:3000/api/portal/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const VALID = { token: "a-valid-invite-token-value", password: "Str0ng-P@ssw0rd!" };

beforeEach(() => {
  H.intakeEnabled = true;
  H.claimResult = { ok: true, email: "pat@example.com", patientId: "pat-1" };
  H.signInError = null;
});

describe("POST /api/portal/claim", () => {
  it("feature-off -> 404", async () => {
    H.intakeEnabled = false;
    expect((await post(VALID)).status).toBe(404);
  });

  it("rejects a body missing the password (400)", async () => {
    expect((await post({ token: "abcdefghij" })).status).toBe(400);
  });

  it("happy path: claims, establishes a session -> 200 signedIn", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, signedIn: true });
  });

  it("expired invite token -> 410", async () => {
    H.claimResult = { ok: false, status: 410, error: "This invite has expired" };
    expect((await post(VALID)).status).toBe(410);
  });

  it("already-used invite token -> 409", async () => {
    H.claimResult = { ok: false, status: 409, error: "This invite was already used" };
    expect((await post(VALID)).status).toBe(409);
  });

  it("invalid invite token -> 400", async () => {
    H.claimResult = { ok: false, status: 400, error: "Invalid invite link" };
    expect((await post(VALID)).status).toBe(400);
  });

  it("account created but auto-sign-in failed -> 200 signedIn:false", async () => {
    H.signInError = { message: "sign-in failed" };
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, signedIn: false });
  });
});
