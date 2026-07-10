// @vitest-environment node
//
// Sprint 2 / P3 (Part A): the portal intake write path is LIVE. These tests
// drive POST through the four write states (feature-off 404, no-session 401,
// wrong-patient 403, happy 200), the template-aware validation layer, and keep
// the DELTA-API-2 body-size guards. The portal session + DB layer are mocked;
// the template-aware validation runs for real against a fixture template.

import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => ({
  intakeEnabled: true,
  portalPatient: null as null | { authUserId: string; patientId: string; organizationId: string },
  templateDef: null as unknown,
  ownedSubmission: null as null | {
    submittedAt: string | null;
    status: string;
    templateId: string | null;
  },
  insertId: "33333333-3333-4333-8333-333333333333",
  updateRows: 1,
  submitResult: { already_submitted: false, problems: 2 } as Record<string, unknown>,
}));

vi.mock("@/lib/config/environment", () => ({ isIntakeV1Enabled: () => H.intakeEnabled }));
vi.mock("@/lib/security/csrf", () => ({ validateOrigin: () => true }));
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimitByKey: async () => ({ success: true }),
}));
vi.mock("@/lib/utils/get-client-ip", () => ({ getClientIP: () => "127.0.0.1" }));
vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));
vi.mock("@/lib/portal/portal-session", () => ({
  resolvePortalPatient: async () => H.portalPatient,
}));
vi.mock("@/lib/portal/portal-db", () => ({
  getTemplateDefinition: async () => H.templateDef,
  getOwnedSubmission: async () => H.ownedSubmission,
  insertSubmission: async () => H.insertId,
  updateSubmissionResponses: async () => H.updateRows,
  submitIntake: async () => H.submitResult,
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

const URL = "http://localhost:3000/api/portal/intake";
const MAX_BODY_BYTES = 256 * 1024;
const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const SUBMISSION_ID = "22222222-2222-4222-8222-222222222222";
const PATIENT = { authUserId: "auth-1", patientId: "pat-1", organizationId: "org-1" };

const TEMPLATE_DEF = {
  sections: [
    {
      key: "demographics",
      label: "Demographics",
      fields: [
        { key: "legal_name", type: "text", label: "Name", required: false },
        { key: "severity", type: "number", label: "Severity", required: false },
      ],
    },
  ],
};

function jsonRequest(bodyText: string): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText,
  });
}
function post(body: unknown): Promise<Response> {
  return POST(jsonRequest(JSON.stringify(body)));
}
function streamRequest(bytes: Uint8Array): NextRequest {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  });
}

beforeEach(() => {
  H.intakeEnabled = true;
  H.portalPatient = PATIENT;
  H.templateDef = TEMPLATE_DEF;
  H.ownedSubmission = { submittedAt: null, status: "patient_entered", templateId: null };
  H.updateRows = 1;
  H.submitResult = { already_submitted: false, problems: 2 };
});

describe("POST /api/portal/intake — four write states", () => {
  it("feature-off -> 404", async () => {
    H.intakeEnabled = false;
    const res = await post({
      template_id: null,
      submission_id: null,
      responses: {},
      submit: false,
    });
    expect(res.status).toBe(404);
  });

  it("no portal session -> 401", async () => {
    H.portalPatient = null;
    const res = await post({
      template_id: null,
      submission_id: null,
      responses: {},
      submit: false,
    });
    expect(res.status).toBe(401);
  });

  it("submission not owned by the caller -> 403 (wrong patient)", async () => {
    H.ownedSubmission = null; // portal RLS cannot see it -> not the caller's
    const res = await post({
      template_id: null,
      submission_id: SUBMISSION_ID,
      responses: {},
      submit: false,
    });
    expect(res.status).toBe(403);
  });

  it("happy path: creates a new submission -> 200", async () => {
    const res = await post({
      template_id: null,
      submission_id: null,
      responses: {},
      submit: false,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submission_id).toBe(H.insertId);
    expect(body.submitted).toBe(false);
  });

  it("happy path: final submit materializes -> 200 with counts", async () => {
    const res = await post({
      template_id: null,
      submission_id: SUBMISSION_ID,
      responses: {},
      submit: true,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submitted).toBe(true);
    expect(body.materialized.problems).toBe(2);
  });

  it("already-submitted submission -> 409", async () => {
    H.ownedSubmission = {
      submittedAt: "2026-07-08T00:00:00Z",
      status: "patient_entered",
      templateId: null,
    };
    const res = await post({
      template_id: null,
      submission_id: SUBMISSION_ID,
      responses: {},
      submit: false,
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/portal/intake — template-aware validation", () => {
  it("rejects a response key not in the selected template (junk key) -> 400", async () => {
    const res = await post({
      template_id: TEMPLATE_ID,
      submission_id: null,
      responses: { not_a_section: { x: "y" } },
      submit: false,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details.some((e: string) => e.includes("unknown section"))).toBe(true);
  });

  it("coerces valid responses against the template and persists -> 200", async () => {
    const res = await post({
      template_id: TEMPLATE_ID,
      submission_id: null,
      responses: { demographics: { legal_name: "Jane", severity: "5" } },
      submit: false,
    });
    expect(res.status).toBe(200);
  });

  it("rejects an unknown/unavailable template -> 400", async () => {
    H.templateDef = null; // portal cannot load this template
    const res = await post({
      template_id: TEMPLATE_ID,
      submission_id: null,
      responses: { demographics: { legal_name: "Jane" } },
      submit: false,
    });
    expect(res.status).toBe(400);
  });

  // P3-HIGH-3: an update that omits/nulls template_id must still be validated
  // against the template the stored submission is already bound to.
  it("update with null template_id against a stored template still validates (junk key -> 400)", async () => {
    H.ownedSubmission = { submittedAt: null, status: "patient_entered", templateId: TEMPLATE_ID };
    const res = await post({
      template_id: null,
      submission_id: SUBMISSION_ID,
      responses: { not_a_section: { x: "y" } },
      submit: false,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details.some((e: string) => e.includes("unknown section"))).toBe(true);
  });

  it("update with null template_id + valid responses against the stored template -> 200", async () => {
    H.ownedSubmission = { submittedAt: null, status: "patient_entered", templateId: TEMPLATE_ID };
    const res = await post({
      template_id: null,
      submission_id: SUBMISSION_ID,
      responses: { demographics: { legal_name: "Jane", severity: "5" } },
      submit: false,
    });
    expect(res.status).toBe(200);
  });

  it("rejects an attempt to CHANGE a bound template -> 409", async () => {
    H.ownedSubmission = { submittedAt: null, status: "patient_entered", templateId: TEMPLATE_ID };
    const res = await post({
      template_id: "99999999-9999-4999-8999-999999999999",
      submission_id: SUBMISSION_ID,
      responses: { demographics: { legal_name: "Jane" } },
      submit: false,
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/portal/intake — body size guard (DELTA-API-2)", () => {
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
    const res = await POST(
      jsonRequest(JSON.stringify({ template_id: null, submission_id: null, responses: {} })),
    );
    expect(res.status).toBe(400);
  });
});
