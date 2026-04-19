import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logAuditEvent, logAuditEventAsync } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { createEncounter, getEncounters } from "@/lib/data";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";
import { ENCOUNTER_TYPE_VALUES } from "@/lib/utils/encounter-type";

const EncounterListQuerySchema = z
  .object({
    patient_id: UUIDSchema.optional(),
    patientId: UUIDSchema.optional(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

const EncounterCreateSchema = z
  .object({
    patient_id: UUIDSchema,
    encounter_type: z.enum(ENCOUNTER_TYPE_VALUES),
    scheduled_start: z.string().datetime(),
    scheduled_end: z.string().datetime(),
    chief_complaint: z.string().max(1000).optional().nullable(),
    duration_minutes: z.number().int().min(1).max(480).optional().nullable(),
  })
  .strict();

function formatProvider(provider: Record<string, unknown> | null | undefined) {
  if (!provider) return null;
  const firstName = typeof provider.first_name === "string" ? provider.first_name : "";
  const lastName = typeof provider.last_name === "string" ? provider.last_name : "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    id: provider.id,
    email: provider.email,
    first_name: provider.first_name,
    last_name: provider.last_name,
    full_name: fullName || provider.email || "Unknown Provider",
  };
}

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    if (!context.user.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const searchParams = context.request.nextUrl.searchParams;
    const queryParsed = EncounterListQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryParsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryParsed.error.issues },
        { status: 400 },
      );
    }

    const patientId = queryParsed.data.patient_id ?? queryParsed.data.patientId;
    const result = await getEncounters(context.user.organizationId, {
      page: queryParsed.data.page,
      pageSize: queryParsed.data.limit,
      patientId,
      status: queryParsed.data.status,
    });

    const encounters = result.data.map((encounter) => ({
      ...encounter,
      provider: formatProvider(encounter.provider as unknown as Record<string, unknown>),
    }));

    logAuditEventAsync({
      eventType: "ENCOUNTER_VIEW",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId,
      ipAddress,
      userAgent,
      resourceType: "encounter",
      details: {
        patientId: patientId ?? null,
        statusFilter: queryParsed.data.status ?? "all",
        resultCount: encounters.length,
      },
      phiAccessed: true,
      riskLevel: "LOW",
    });

    return NextResponse.json({
      encounters,
      pagination: {
        page: result.page,
        limit: result.pageSize,
        total: result.count,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logError({ action: "FETCH_ENCOUNTERS_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to fetch encounters" }, { status: 500 });
  }
}

async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    if (!context.user.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const rawBody = await context.request.json();
    const validation = validateRequest(EncounterCreateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const body = validation.data;
    const canAccessTargetPatient = await canAccessPatient(context.user, body.patient_id);
    if (!canAccessTargetPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 403 });
    }

    const encounter = await createEncounter(context.user.organizationId, context.user.id, {
      patient_id: body.patient_id,
      encounter_type: body.encounter_type,
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      chief_complaint: body.chief_complaint ?? undefined,
      duration_minutes: body.duration_minutes ?? undefined,
    });

    await logAuditEvent({
      eventType: "ENCOUNTER_CREATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId,
      ipAddress,
      userAgent,
      resourceType: "encounter",
      resourceId: encounter.id,
      details: {
        patientId: encounter.patient_id,
        encounterType: encounter.encounter_type,
      },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({ encounter }, { status: 201 });
  } catch (error) {
    logError({ action: "CREATE_ENCOUNTER_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to create encounter" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
