// POST /api/assessments/administer
// Creates a new assessment administration record via the sidecar.
// Patient-scoped: requires canAccessPatient.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

const AdministerSchema = z
  .object({
    patient_id: UUIDSchema,
    scale_id: z.string().min(1).max(64),
    delivery_method: z.enum(["clinician", "portal_self", "portal_assigned"]).default("clinician"),
    encounter_id: UUIDSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  let parsedBody: unknown;
  try {
    parsedBody = await context.request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateRequest(AdministerSchema, parsedBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }
  const input = validation.data;

  const allowed = await canAccessPatient(context.user, input.patient_id);
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
      details: {
        action: "ASSESSMENT_ADMINISTER",
        patient_id: input.patient_id,
        scale_id: input.scale_id,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await callSidecar<{ id: string; status: string }>(context.user, {
    method: "POST",
    path: "/api/v1/assessments/administer",
    body: input,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_ADMINISTER",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_administration",
    resourceId: result.ok ? result.data?.id : undefined,
    details: {
      patient_id: input.patient_id,
      scale_id: input.scale_id,
      delivery_method: input.delivery_method,
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: true,
    riskLevel: "MEDIUM",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({
        action: "ASSESSMENT_ADMINISTER_FALLBACK",
        error: sanitizeError(result.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    logError({ action: "ASSESSMENT_ADMINISTER_ERROR", error: sanitizeError(result.error) });
    return NextResponse.json(
      { error: result.error || "Failed to administer assessment" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}

export const POST = withAuth(handlePost, { requiredFeature: "ASSESSMENTS_V1" });
