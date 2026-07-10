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
import { safeParseTemplate } from "@/lib/intake/template";
import { validateResponsesAgainstTemplate } from "@/lib/intake/template-validation";
import { resolvePortalPatient } from "@/lib/portal/portal-session";
import {
  getTemplateDefinition,
  getOwnedSubmission,
  insertSubmission,
  updateSubmissionResponses,
  submitIntake,
} from "@/lib/portal/portal-db";
import type { IntakeResponses } from "@/lib/intake/types";

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

  const body = validation.data;

  try {
    // Layer: authenticated, patient-scoped portal session (never service role).
    const portal = await resolvePortalPatient();
    if (!portal) {
      return NextResponse.json({ error: "Portal sign-in required" }, { status: 401 });
    }

    // Resolve the target submission FIRST: an update must be validated against the
    // template the stored submission is ALREADY bound to (P3-HIGH-3), so we load
    // it before choosing which template governs validation.
    let owned: Awaited<ReturnType<typeof getOwnedSubmission>> = null;
    if (body.submission_id) {
      owned = await getOwnedSubmission(portal.authUserId, body.submission_id);
      if (!owned) {
        // Not the caller's submission (or absent). Forbidden -- do not write.
        return NextResponse.json({ error: "This intake is not available" }, { status: 403 });
      }
      if (owned.submittedAt) {
        return NextResponse.json({ error: "This intake was already submitted" }, { status: 409 });
      }
    }

    // EFFECTIVE TEMPLATE (P3-HIGH-3): a bound submission is governed by its OWN
    // stored template even when the request omits/nulls template_id -- otherwise a
    // client could send template_id:null to skip the allowlist while the DB keeps
    // the old template (COALESCE). Changing a bound template is rejected.
    if (owned?.templateId && body.template_id && body.template_id !== owned.templateId) {
      return NextResponse.json(
        { error: "This intake is bound to a different template and cannot be changed" },
        { status: 409 },
      );
    }
    const effectiveTemplateId = body.template_id ?? owned?.templateId ?? null;

    // TEMPLATE-AWARE VALIDATION (deferred from P2): load the EFFECTIVE template
    // through the patient_portal role (active system/own-org catalog read), then
    // allowlist response keys + coerce per field type on top of the boundary
    // schema. What we persist is the coerced, allowlisted responses.
    let responsesToStore: IntakeResponses = body.responses;
    if (effectiveTemplateId) {
      const definition = await getTemplateDefinition(portal.authUserId, effectiveTemplateId);
      if (!definition) {
        return NextResponse.json({ error: "Unknown or unavailable template" }, { status: 400 });
      }
      const parsed = safeParseTemplate(definition);
      if (!parsed.success) {
        // The stored template is malformed -- fail closed rather than write
        // unvalidated PHI.
        logError({ action: "PORTAL_INTAKE_TEMPLATE_PARSE_ERROR" });
        return NextResponse.json({ error: "Template is unavailable" }, { status: 500 });
      }
      const tv = validateResponsesAgainstTemplate(parsed.template, body.responses);
      if (!tv.valid) {
        return NextResponse.json(
          { error: "Validation failed", details: tv.errors },
          { status: 400 },
        );
      }
      responsesToStore = tv.coerced;
    }

    // Update an owned, still-open submission, or create a new patient_entered one.
    // RLS is the enforcement layer throughout.
    let submissionId = body.submission_id;
    if (submissionId) {
      const updated = await updateSubmissionResponses(portal.authUserId, submissionId, {
        templateId: effectiveTemplateId,
        responses: responsesToStore,
      });
      if (updated === 0) {
        // Raced into a submitted/locked state between the check and the write.
        return NextResponse.json({ error: "This intake is locked" }, { status: 409 });
      }
    } else {
      submissionId = await insertSubmission(portal.authUserId, {
        organizationId: portal.organizationId,
        patientId: portal.patientId,
        templateId: effectiveTemplateId,
        responses: responsesToStore,
      });
    }

    if (body.submit) {
      // Final submit: the SECURITY DEFINER RPC materializes child rows + sets the
      // submit lock, atomically and idempotently.
      const materialized = await submitIntake(portal.authUserId, submissionId);
      return NextResponse.json({ submission_id: submissionId, submitted: true, materialized });
    }
    return NextResponse.json({ submission_id: submissionId, submitted: false });
  } catch (error) {
    logError({ action: "PORTAL_INTAKE_WRITE_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to save intake" }, { status: 500 });
  }
}
