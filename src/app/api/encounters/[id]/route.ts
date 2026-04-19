import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthContext, canAccessOrganization } from "@/lib/auth/api-auth";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logAuditEvent, logPHIAccess } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

const EncounterUpdateSchema = z
  .object({
    encounter_type: z.string().min(1).max(100).optional(),
    scheduled_start: z.string().datetime().optional(),
    scheduled_end: z.string().datetime().optional(),
    actual_start: z.string().datetime().optional().nullable(),
    actual_end: z.string().datetime().optional().nullable(),
    chief_complaint: z.string().max(1000).optional().nullable(),
    duration_minutes: z.number().int().min(1).max(480).optional().nullable(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  })
  .strict();

function getProviderName(provider: Record<string, unknown> | null | undefined) {
  if (!provider) return "Unknown Provider";
  const firstName = typeof provider.first_name === "string" ? provider.first_name : "";
  const lastName = typeof provider.last_name === "string" ? provider.last_name : "";
  return `${firstName} ${lastName}`.trim() || (provider.email as string) || "Unknown Provider";
}

async function loadEncounter(id: string, organizationId: string) {
  const supabase = await createClient();

  const { data: encounter, error } = await supabase
    .from("encounters")
    .select(
      `
      *,
      patient:patients(id, first_name, last_name, preferred_name, mrn, date_of_birth, gender, avatar_color, email, phone),
      provider:users(id, email, first_name, last_name)
    `,
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (error || !encounter) return null;

  const { data: notes } = await supabase
    .from("clinical_notes")
    .select("id, content, status, created_at, updated_at")
    .eq("encounter_id", id)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    ...encounter,
    provider: {
      ...(encounter.provider ?? {}),
      full_name: getProviderName(encounter.provider as Record<string, unknown>),
    },
    notes: notes ?? [],
  };
}

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid encounter id" }, { status: 400 });
    }

    const id = idValidation.data;
    const organizationId = context.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const encounter = await loadEncounter(id, organizationId);
    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    await logPHIAccess(
      context.user.id,
      context.user.email,
      context.user.role,
      organizationId,
      "ENCOUNTER",
      id,
      "VIEW",
      ipAddress,
      userAgent,
    );

    return NextResponse.json({ encounter });
  } catch (error) {
    logError({ action: "FETCH_ENCOUNTER_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  }
}

async function updateEncounterHandler(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid encounter id" }, { status: 400 });
    }

    const id = idValidation.data;
    const organizationId = context.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const rawBody = await context.request.json();
    const validation = validateRequest(EncounterUpdateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("encounters")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    if (!existing || !canAccessOrganization(context.user, existing.organization_id)) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const { data: encounter, error } = await supabase
      .from("encounters")
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error || !encounter) {
      throw error ?? new Error("Encounter update failed");
    }

    await logAuditEvent({
      eventType: "ENCOUNTER_UPDATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId,
      ipAddress,
      userAgent,
      resourceType: "encounter",
      resourceId: id,
      details: { updatedFields: Object.keys(validation.data) },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({ encounter });
  } catch (error) {
    logError({ action: "UPDATE_ENCOUNTER_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to update encounter" }, { status: 500 });
  }
}

async function handleDelete(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid encounter id" }, { status: 400 });
    }

    const id = idValidation.data;
    const organizationId = context.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("encounters")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    if (!existing || !canAccessOrganization(context.user, existing.organization_id)) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("encounters")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      throw error;
    }

    await logAuditEvent({
      eventType: "ENCOUNTER_DELETE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId,
      ipAddress,
      userAgent,
      resourceType: "encounter",
      resourceId: id,
      details: {},
      phiAccessed: true,
      riskLevel: "HIGH",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ action: "DELETE_ENCOUNTER_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to delete encounter" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const PATCH = withAuth(updateEncounterHandler, {
  requireOrganization: true,
  requireMFA: true,
});
export const PUT = PATCH;
export const DELETE = withAuth(handleDelete, { requireOrganization: true, requireMFA: true });
