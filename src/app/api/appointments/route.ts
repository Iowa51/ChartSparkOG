// src/app/api/appointments/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// SEC-009: HIPAA-compliant appointments API with full audit logging

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext, canAccessPatient, isAdmin } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { z } from "zod";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

const AppointmentsListQuerySchema = z
  .object({
    status: z.string().max(50).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
      .optional(),
  })
  .strict();

// SEC-PT2-F4: .strict() rejects unknown fields. status removed — always server-set.
// provider_id only honoured for ADMIN/SUPER_ADMIN callers.
const AppointmentPostSchema = z
  .object({
    patient_id: UUIDSchema,
    provider_id: UUIDSchema.optional(),
    appointment_datetime: z.string().min(1, "Appointment datetime is required").max(50),
    appointment_type: z.string().max(100).optional(),
    notes: z.string().max(2000).optional().nullable(),
    duration_minutes: z.number().int().min(1).max(480).optional(),
    is_telehealth: z.boolean().optional().default(false),
    reason: z.string().max(500).optional().nullable(),
  })
  .strict();

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const supabase = await createClient();

    const searchParams = context.request.nextUrl.searchParams;
    const queryParsed = AppointmentsListQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryParsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryParsed.error.issues },
        { status: 400 },
      );
    }
    const { status, date } = queryParsed.data;

    let query = supabase
      .from("appointments")
      .select(
        `
                *,
                patient:patients(id, first_name, last_name),
                provider:users(id, first_name, last_name)
            `,
      )
      .eq("organization_id", context.user.organizationId)
      .order("appointment_datetime", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    } else {
      // Hide cancelled rows from default list views. Callers that actually need
      // them (e.g. an admin audit view) can opt in with ?status=cancelled.
      query = query.neq("status", "cancelled");
    }
    if (date) {
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;
      query = query.gte("appointment_datetime", startOfDay).lte("appointment_datetime", endOfDay);
    }

    const { data: appointments, error } = await query;

    if (error) throw error;

    // Log appointment viewing - contains patient schedule info
    await logAuditEvent({
      eventType: "PATIENT_VIEW",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "appointment",
      details: {
        statusFilter: status || "all",
        dateFilter: date || "all",
        resultCount: appointments?.length || 0,
      },
      phiAccessed: true,
      riskLevel: "LOW",
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    logError({ action: "ERROR_FETCHING_APPOINTMENTS", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const supabase = await createClient();

    const rawBody = await context.request.json();
    const validation = validateRequest(AppointmentPostSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }
    const appointmentData = validation.data;
    const canAccessTargetPatient = await canAccessPatient(context.user, appointmentData.patient_id);
    if (!canAccessTargetPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 403 });
    }

    // SEC-PT2-F4: Explicit field mapping — no spread operator.
    // provider_id only honoured for admins; status always server-set.
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert([
        {
          patient_id: appointmentData.patient_id,
          appointment_datetime: appointmentData.appointment_datetime,
          appointment_type: appointmentData.appointment_type,
          notes: appointmentData.notes,
          duration_minutes: appointmentData.duration_minutes,
          is_telehealth: appointmentData.is_telehealth ?? false,
          reason: appointmentData.reason,
          organization_id: context.user.organizationId,
          provider_id:
            isAdmin(context.user) && appointmentData.provider_id
              ? appointmentData.provider_id
              : context.user.id,
          status: "scheduled",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update patient's next appointment date
    await supabase
      .from("patients")
      .update({
        next_appointment_date: appointmentData.appointment_datetime.split("T")[0],
      })
      .eq("id", appointmentData.patient_id)
      .eq("organization_id", context.user.organizationId);

    // Log appointment creation
    await logAuditEvent({
      eventType: "PATIENT_CREATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "appointment",
      resourceId: appointment.id,
      details: {
        patientId: appointmentData.patient_id,
        appointmentType: appointmentData.appointment_type,
      },
      phiAccessed: true,
      riskLevel: "LOW",
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    logError({ action: "ERROR_CREATING_APPOINTMENT", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
