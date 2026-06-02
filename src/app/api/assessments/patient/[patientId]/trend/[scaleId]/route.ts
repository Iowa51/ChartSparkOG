// GET /api/assessments/patient/[patientId]/trend/[scaleId]
// Returns time-series trend data for one scale, one patient.

import { NextResponse } from "next/server";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

const SCALE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const patientIdValidation = UUIDSchema.safeParse(context.params?.patientId);
  if (!patientIdValidation.success) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }
  const patientId = patientIdValidation.data;
  const scaleId = context.params?.scaleId ?? "";
  if (!SCALE_ID_RE.test(scaleId)) {
    return NextResponse.json({ error: "Invalid scale id" }, { status: 400 });
  }

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
      resourceType: "assessment_trend",
      details: {
        action: "ASSESSMENT_TREND_READ",
        patient_id: patientId,
        scale_id: scaleId,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await callSidecar(context.user, {
    method: "GET",
    path: `/api/v1/assessments/patient/${encodeURIComponent(patientId)}/trend/${encodeURIComponent(scaleId)}`,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_TREND_READ",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_trend",
    details: {
      patient_id: patientId,
      scale_id: scaleId,
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: true,
    riskLevel: "LOW",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({
        action: "ASSESSMENT_TREND_FALLBACK",
        error: sanitizeError(result.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    logError({ action: "ASSESSMENT_TREND_ERROR", error: sanitizeError(result.error) });
    return NextResponse.json({ error: "Failed to load trend" }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export const GET = withAuth(handleGet, { requiredFeature: "ASSESSMENTS_V1" });
