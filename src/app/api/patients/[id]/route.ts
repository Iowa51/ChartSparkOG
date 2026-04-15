// src/app/api/patients/[id]/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// HIPAA-compliant patient detail API with full audit logging

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent, logPHIAccess } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getPatientById, updatePatient, type PatientUpdateInput } from "@/lib/data";
import { PatientUpdateSchema, UUIDSchema, validateRequest } from "@/lib/validation/schemas";

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }
    const id = idValidation.data;

    // Get patient with all related details
    const patient = await getPatientById(id, context.user.organizationId || "", {
      includeDetails: true,
    });

    await logAuditEvent({
      eventType: "phi_read",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "patient",
      resourceId: id,
      details: {
        record_id: id,
        organization_id: context.user.organizationId,
      },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json(patient);
  } catch (error) {
    logError({
      action: "FETCH_PATIENT_ERROR",
      error: sanitizeError(error),
    });

    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
}

async function handlePatch(context: AuthContext) {
  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }
    const id = idValidation.data;

    const body = await context.request.json();

    // F-015: Validate input with Zod and strip protected fields
    const validation = validateRequest(PatientUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    // Exclude protected fields that must never be mass-assigned
    const { ...safeUpdates } = validation.data;
    delete (safeUpdates as Record<string, unknown>)["organization_id"];
    delete (safeUpdates as Record<string, unknown>)["created_by"];
    delete (safeUpdates as Record<string, unknown>)["id"];
    delete (safeUpdates as Record<string, unknown>)["created_at"];
    delete (safeUpdates as Record<string, unknown>)["updated_at"];

    // Use data layer to update patient
    const patient = await updatePatient(
      id,
      context.user.organizationId || "",
      context.user.id,
      safeUpdates as unknown as PatientUpdateInput,
    );

    return NextResponse.json(patient);
  } catch (error) {
    logError({
      action: "UPDATE_PATIENT_ERROR",
      error: sanitizeError(error),
    });

    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

async function handleDelete(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }
    const id = idValidation.data;

    // Soft delete - set status to archived
    await updatePatient(id, context.user.organizationId || "", context.user.id, {
      status: "archived",
    });

    // Log PHI deletion (high risk event)
    await logPHIAccess(
      context.user.id,
      context.user.email,
      context.user.role,
      context.user.organizationId || "",
      "PATIENT",
      id,
      "DELETE",
      ipAddress,
      userAgent,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({
      action: "DELETE_PATIENT_ERROR",
      error: sanitizeError(error),
    });

    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const PATCH = withAuth(handlePatch, { requireOrganization: true, requireMFA: true });
export const DELETE = withAuth(handleDelete, {
  requireOrganization: true,
  requiredRole: ["ADMIN", "SUPER_ADMIN"],
  requireMFA: true,
});
