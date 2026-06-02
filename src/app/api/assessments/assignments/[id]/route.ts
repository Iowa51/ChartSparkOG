// GET    /api/assessments/assignments/[id]
// DELETE /api/assessments/assignments/[id]
//
// DELETE may return 409 (BLOCKED) from the sidecar when the assignment has
// already produced completed administrations; that status is surfaced
// verbatim to the OG client along with the sidecar's error body.

import { NextResponse } from "next/server";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

interface AssignmentRecord {
  id: string;
  patient_id: string;
  scale_id: string;
  status: string;
}

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
  }
  const assignmentId = idValidation.data;

  const result = await callSidecar<AssignmentRecord>(context.user, {
    method: "GET",
    path: `/api/v1/assessments/assignments/${encodeURIComponent(assignmentId)}`,
  });

  if (!result.ok) {
    await logAuditEvent({
      eventType: "ASSESSMENT_ASSIGNMENT_LIST",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "assessment_assignment",
      resourceId: assignmentId,
      details: { success: false, sidecar_status: result.status },
      phiAccessed: false,
      riskLevel: "LOW",
    });
    if (result.fallback) {
      logError({
        action: "ASSESSMENT_ASSIGNMENT_READ_FALLBACK",
        error: sanitizeError(result.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load assignment" }, { status: result.status });
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
      resourceType: "assessment_assignment",
      resourceId: assignmentId,
      details: {
        action: "ASSESSMENT_ASSIGNMENT_LIST",
        patient_id: patientId,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAuditEvent({
    eventType: "ASSESSMENT_ASSIGNMENT_LIST",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_assignment",
    resourceId: assignmentId,
    details: {
      patient_id: patientId,
      scale_id: result.data?.scale_id,
      success: true,
    },
    phiAccessed: true,
    riskLevel: "LOW",
  });

  return NextResponse.json(result.data);
}

async function handleDelete(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
  }
  const assignmentId = idValidation.data;

  // Look up assignment first so we can canAccessPatient on its patient_id.
  const lookup = await callSidecar<AssignmentRecord>(context.user, {
    method: "GET",
    path: `/api/v1/assessments/assignments/${encodeURIComponent(assignmentId)}`,
  });

  if (!lookup.ok) {
    await logAuditEvent({
      eventType: "ASSESSMENT_ASSIGNMENT_DELETE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "assessment_assignment",
      resourceId: assignmentId,
      details: { success: false, stage: "lookup", sidecar_status: lookup.status },
      phiAccessed: false,
      riskLevel: "LOW",
    });
    if (lookup.fallback) {
      logError({
        action: "ASSESSMENT_ASSIGNMENT_DELETE_FALLBACK",
        error: sanitizeError(lookup.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    if (lookup.status === 404) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load assignment" }, { status: lookup.status });
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
      resourceType: "assessment_assignment",
      resourceId: assignmentId,
      details: {
        action: "ASSESSMENT_ASSIGNMENT_DELETE",
        patient_id: patientId,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await callSidecar(context.user, {
    method: "DELETE",
    path: `/api/v1/assessments/assignments/${encodeURIComponent(assignmentId)}`,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_ASSIGNMENT_DELETE",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_assignment",
    resourceId: assignmentId,
    details: {
      patient_id: patientId,
      scale_id: lookup.data?.scale_id,
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: false,
    riskLevel: "MEDIUM",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({
        action: "ASSESSMENT_ASSIGNMENT_DELETE_FALLBACK",
        error: sanitizeError(result.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    // 409 BLOCKED — surface verbatim so the UI can show the reason.
    if (result.status === 409) {
      return NextResponse.json(
        {
          error: result.error || "Assignment cannot be deleted",
          code: "BLOCKED",
          details: result.body,
        },
        { status: 409 },
      );
    }
    logError({
      action: "ASSESSMENT_ASSIGNMENT_DELETE_ERROR",
      error: sanitizeError(result.error),
    });
    return NextResponse.json(
      { error: result.error || "Failed to delete assignment" },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true });
}

export const GET = withAuth(handleGet, { requiredFeature: "ASSESSMENTS_V1" });
export const DELETE = withAuth(handleDelete, { requiredFeature: "ASSESSMENTS_V1" });
