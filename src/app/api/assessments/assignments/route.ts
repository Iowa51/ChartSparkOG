// POST /api/assessments/assignments — create assignment
// GET  /api/assessments/assignments?patient_id=... — list assignments

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

const AssignmentCreateSchema = z
  .object({
    patient_id: UUIDSchema,
    scale_id: z.string().min(1).max(64),
    due_date: z.string().datetime().optional(),
    recurring: z
      .object({
        interval: z.enum(["daily", "weekly", "biweekly", "monthly"]),
        count: z.number().int().min(1).max(52).optional(),
      })
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const AssignmentListQuerySchema = z
  .object({
    patient_id: UUIDSchema,
    status: z.enum(["pending", "completed", "expired", "cancelled"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
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
  const validation = validateRequest(AssignmentCreateSchema, parsedBody);
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
      resourceType: "assessment_assignment",
      details: {
        action: "ASSESSMENT_ASSIGNMENT_CREATE",
        patient_id: input.patient_id,
        scale_id: input.scale_id,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await callSidecar<{ id: string }>(context.user, {
    method: "POST",
    path: "/api/v1/assessments/assignments",
    body: input,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_ASSIGNMENT_CREATE",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_assignment",
    resourceId: result.ok ? result.data?.id : undefined,
    details: {
      patient_id: input.patient_id,
      scale_id: input.scale_id,
      recurring: Boolean(input.recurring),
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: true,
    riskLevel: "MEDIUM",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({
        action: "ASSESSMENT_ASSIGNMENT_CREATE_FALLBACK",
        error: sanitizeError(result.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    logError({
      action: "ASSESSMENT_ASSIGNMENT_CREATE_ERROR",
      error: sanitizeError(result.error),
    });
    return NextResponse.json(
      { error: result.error || "Failed to create assignment" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const { searchParams } = new URL(context.request.url);
  const queryParsed = AssignmentListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: queryParsed.error.issues },
      { status: 400 },
    );
  }
  const { patient_id, status, limit } = queryParsed.data;

  const allowed = await canAccessPatient(context.user, patient_id);
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
      details: {
        action: "ASSESSMENT_ASSIGNMENT_LIST",
        patient_id,
        reason: "canAccessPatient denied",
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const upstreamQs = new URLSearchParams({ patient_id });
  if (status) upstreamQs.set("status", status);
  if (limit) upstreamQs.set("limit", String(limit));

  const result = await callSidecar(context.user, {
    method: "GET",
    path: `/api/v1/assessments/assignments?${upstreamQs.toString()}`,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_ASSIGNMENT_LIST",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_assignment",
    details: {
      patient_id,
      status: status || undefined,
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: true,
    riskLevel: "LOW",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({
        action: "ASSESSMENT_ASSIGNMENT_LIST_FALLBACK",
        error: sanitizeError(result.error),
      });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    logError({
      action: "ASSESSMENT_ASSIGNMENT_LIST_ERROR",
      error: sanitizeError(result.error),
    });
    return NextResponse.json({ error: "Failed to load assignments" }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export const POST = withAuth(handlePost, { requiredFeature: "ASSESSMENTS_V1" });
export const GET = withAuth(handleGet, { requiredFeature: "ASSESSMENTS_V1" });
