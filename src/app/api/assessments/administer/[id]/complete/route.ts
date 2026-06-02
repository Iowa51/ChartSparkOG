// POST /api/assessments/administer/[id]/complete
// Completes an administration with responses, returns scored result.
// Patient-scoped: we re-fetch the administration to determine patient_id
// and run canAccessPatient before forwarding the completion.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

// Responses can be either Record<itemId, number> (flat-likert) or the
// C-SSRS structured object. Validation is intentionally loose at the OG
// layer — the sidecar performs the authoritative shape check.
const CompleteSchema = z
  .object({
    responses: z.record(z.string(), z.unknown()),
    completed_at: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

interface AdministrationRecord {
  id: string;
  patient_id: string;
  scale_id: string;
  status: string;
}

async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid administration id" }, { status: 400 });
  }
  const administrationId = idValidation.data;

  let parsedBody: unknown;
  try {
    parsedBody = await context.request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validation = validateRequest(CompleteSchema, parsedBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }

  // Step 1: fetch the administration so we know which patient it belongs to.
  const lookup = await callSidecar<AdministrationRecord>(context.user, {
    method: "GET",
    path: `/api/v1/assessments/administer/${encodeURIComponent(administrationId)}`,
  });

  if (!lookup.ok) {
    await logAuditEvent({
      eventType: "ASSESSMENT_COMPLETE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "assessment_administration",
      resourceId: administrationId,
      details: { success: false, stage: "lookup", sidecar_status: lookup.status },
      phiAccessed: false,
      riskLevel: "LOW",
    });
    if (lookup.fallback) {
      logError({ action: "ASSESSMENT_COMPLETE_FALLBACK", error: sanitizeError(lookup.error) });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    if (lookup.status === 404) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load assessment" }, { status: lookup.status });
  }

  const patientId = lookup.data?.patient_id;
  const allowed = patientId ? await canAccessPatient(context.user, patientId) : false;
  if (!allowed) {
    await logAuditEvent({
      eventType: "PERMISSION_DENIED",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "assessment_administration",
      resourceId: administrationId,
      details: {
        action: "ASSESSMENT_COMPLETE",
        patient_id: patientId,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Step 2: forward the completion to the sidecar.
  const completion = await callSidecar(context.user, {
    method: "POST",
    path: `/api/v1/assessments/administer/${encodeURIComponent(administrationId)}/complete`,
    body: validation.data,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_COMPLETE",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_administration",
    resourceId: administrationId,
    details: {
      patient_id: patientId,
      scale_id: lookup.data?.scale_id,
      success: completion.ok,
      sidecar_status: completion.status,
    },
    phiAccessed: true,
    riskLevel: "MEDIUM",
  });

  if (!completion.ok) {
    if (completion.fallback) {
      logError({
        action: "ASSESSMENT_COMPLETE_FALLBACK",
        error: sanitizeError(completion.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    logError({ action: "ASSESSMENT_COMPLETE_ERROR", error: sanitizeError(completion.error) });
    return NextResponse.json(
      { error: completion.error || "Failed to complete assessment" },
      { status: completion.status },
    );
  }

  return NextResponse.json(completion.data);
}

export const POST = withAuth(handlePost, { requiredFeature: "ASSESSMENTS_V1" });
