// GET /api/assessments/administer/[id]
// Fetches a single administration (with result if completed) by id.
// The administration record carries patient_id — we run canAccessPatient on
// the returned patient_id and refuse to surface the body if access fails.

import { NextResponse } from "next/server";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

interface AdministrationRecord {
  id: string;
  patient_id: string;
  scale_id: string;
  status: string;
  [key: string]: unknown;
}

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid administration id" }, { status: 400 });
  }
  const administrationId = idValidation.data;

  const result = await callSidecar<AdministrationRecord>(context.user, {
    method: "GET",
    path: `/api/v1/assessments/administer/${encodeURIComponent(administrationId)}`,
  });

  if (!result.ok) {
    await logAuditEvent({
      eventType: "ASSESSMENT_READ",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "assessment_administration",
      resourceId: administrationId,
      details: { success: false, sidecar_status: result.status },
      phiAccessed: false,
      riskLevel: "LOW",
    });
    if (result.fallback) {
      logError({ action: "ASSESSMENT_READ_FALLBACK", error: sanitizeError(result.error) });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load assessment" }, { status: result.status });
  }

  const patientId = result.data?.patient_id;
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
        action: "ASSESSMENT_READ",
        patient_id: patientId,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAuditEvent({
    eventType: "ASSESSMENT_READ",
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
      scale_id: result.data?.scale_id,
      status: result.data?.status,
      success: true,
    },
    phiAccessed: true,
    riskLevel: "LOW",
  });

  return NextResponse.json(result.data);
}

export const GET = withAuth(handleGet, { requiredFeature: "ASSESSMENTS_V1" });
