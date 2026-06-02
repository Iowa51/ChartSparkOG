// GET /api/assessments/patient/[patientId]
// List of administrations + their results for one patient.
// Patient-scoped — canAccessPatient enforced before forwarding.

import { NextResponse } from "next/server";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const patientIdValidation = UUIDSchema.safeParse(context.params?.patientId);
  if (!patientIdValidation.success) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }
  const patientId = patientIdValidation.data;

  const allowed = await canAccessPatient(context.user, patientId);
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
        action: "ASSESSMENT_LIST",
        patient_id: patientId,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(context.request.url);
  const upstreamQs = new URLSearchParams();
  const limit = searchParams.get("limit");
  const scaleId = searchParams.get("scale_id");
  const status = searchParams.get("status");
  if (limit) upstreamQs.set("limit", limit);
  if (scaleId) upstreamQs.set("scale_id", scaleId);
  if (status) upstreamQs.set("status", status);
  const qs = upstreamQs.toString();

  const result = await callSidecar(context.user, {
    method: "GET",
    path: `/api/v1/assessments/patient/${encodeURIComponent(patientId)}${qs ? `?${qs}` : ""}`,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_LIST",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_administration",
    details: {
      patient_id: patientId,
      scale_id: scaleId || undefined,
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: true,
    riskLevel: "LOW",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({ action: "ASSESSMENT_LIST_FALLBACK", error: sanitizeError(result.error) });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    logError({ action: "ASSESSMENT_LIST_ERROR", error: sanitizeError(result.error) });
    return NextResponse.json({ error: "Failed to load assessments" }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export const GET = withAuth(handleGet, { requiredFeature: "ASSESSMENTS_V1" });
