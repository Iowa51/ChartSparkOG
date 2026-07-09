// src/app/api/portal/intake/route.ts
// Sprint 1 / P2 -- portal intake persistence endpoint (save-and-resume + final
// submit). Gated behind INTAKE_V1, CSRF-checked, rate-limited, and Zod-validated
// at the boundary.
//
// AUTH SEAM (fail-closed): writing intake PHI requires an authenticated,
// patient-scoped portal session (Supabase Auth for patients -> the patient_portal
// DB role). That session/client is delivered by the portal-claim/auth phase and
// does not exist in this repo yet, so this route validates the request and then
// FAILS CLOSED (401) rather than writing via a privilege-bypassing path. When the
// portal session lands, resolvePortalPatient() returns the patient and the write
// runs through the patient_portal RLS proven in
// 20260707120000_sprint1_p2_portal_intake_rls.sql (+ ...130000 fixes):
//   - upsert intake_submissions.responses (status stays 'patient_entered')
//   - on submit=true, set submitted_at=NOW() (the submit lock; see SCHEMA-NOTES)
// Never use the service role here -- that would bypass the per-patient RLS (S4).
//
// BOUNDARY VALIDATION (P2-API-1): IntakeWriteSchema bounds payload size, nesting,
// key shape/count, and enforces consent shape on submit -- all TEMPLATE-
// INDEPENDENT, so the boundary is safe before any write. TEMPLATE-AWARE checks
// (allowlist responses against the SELECTED template's keys + per-field types)
// run at the write path once the portal session loads the template from the DB.

import { NextRequest, NextResponse } from "next/server";
import { validateOrigin } from "@/lib/security/csrf";
import { getClientIP } from "@/lib/utils/get-client-ip";
import { checkRateLimitByKey } from "@/lib/security/rate-limit";
import { validateRequest } from "@/lib/validation/schemas";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { isIntakeV1Enabled } from "@/lib/config/environment";
import { IntakeWriteSchema } from "@/lib/intake/responses-schema";

// Hard cap on the raw request body: cheap DoS defense enforced BEFORE the body is
// fully materialized/parsed. The structural bounds in IntakeWriteSchema are the
// second layer (they run after parse); this bounds the allocation itself.
const MAX_BODY_BYTES = 256 * 1024;

// Read the body with a hard byte ceiling enforced WHILE consuming the stream, so
// a Content-Length-less or Content-Length-lying body cannot force a large
// allocation before validation runs (DELTA-API-2). Returns the decoded text, or
// a status marker (413 too large / 400 unreadable-or-absent body).
async function readCappedBodyText(
  request: NextRequest,
  cap: number,
): Promise<{ ok: true; text: string } | { ok: false; status: 400 | 413 }> {
  // Fast path: reject an over-declared length before reading a single byte.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > cap) return { ok: false, status: 413 };

  const stream = request.body;
  if (!stream) return { ok: false, status: 400 };

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > cap) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(buf) };
}

interface PortalPatient {
  patientId: string;
  organizationId: string;
}

// Placeholder for the portal session resolver delivered by the portal-auth phase
// (it will read the portal session off `request`). Fail-closed by design: no
// portal session in this repo yet => null => 401.
async function resolvePortalPatient(): Promise<PortalPatient | null> {
  return null;
}

export async function POST(request: NextRequest) {
  if (!isIntakeV1Enabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const rateLimit = await checkRateLimitByKey(getClientIP(request), "api", "/api/portal/intake");
  if (!rateLimit.success && rateLimit.response) return rateLimit.response;

  const capped = await readCappedBodyText(request, MAX_BODY_BYTES);
  if (!capped.ok) {
    return capped.status === 413
      ? NextResponse.json({ error: "Payload too large" }, { status: 413 })
      : NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(capped.text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validation = validateRequest(IntakeWriteSchema, parsedBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    const portal = await resolvePortalPatient();
    if (!portal) {
      // Fail closed: never persist intake PHI without an authenticated,
      // patient-scoped portal session.
      return NextResponse.json({ error: "Portal sign-in required" }, { status: 401 });
    }
    // Write path lands with the portal-auth phase (see file header).
    return NextResponse.json({ error: "Portal intake is not yet enabled" }, { status: 501 });
  } catch (error) {
    logError({ action: "PORTAL_INTAKE_WRITE_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to save intake" }, { status: 500 });
  }
}
