// Telehealth room creation via Daily.co API

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createTelehealthJoinSession } from "@/lib/security/telehealth-session-tokens";
import { createTelehealthInviteToken } from "@/lib/security/telehealth-invite-tokens";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { TelehealthCreateRoomSchema, validateRequest } from "@/lib/validation/schemas";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";

async function handler(context: AuthContext) {
  try {
    const body = await context.request.json();
    const validation = validateRequest(TelehealthCreateRoomSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const { appointmentId, patientName, providerId } = validation.data;
    const supabase = await createClient();

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, patient_id, provider_id, organization_id, status, telehealth_room_url")
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: "Appointment not found or invalid" }, { status: 400 });
    }

    // SEC-SPRINT11: Authorization check MUST happen BEFORE any room creation or audit logging.
    // Verify the caller's organization owns this appointment.
    if (
      appointment.organization_id !== context.user.organizationId &&
      context.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Access denied - appointment belongs to different organization" },
        { status: 403 },
      );
    }

    // SEC-PT4-F3: Only the assigned provider or an admin can initiate a telehealth room
    if (
      appointment.provider_id !== context.user.id &&
      !["ADMIN", "SUPER_ADMIN"].includes(context.user.role)
    ) {
      return NextResponse.json(
        { error: "Only the assigned provider or an admin can start this session" },
        { status: 403 },
      );
    }

    const allowedStatuses = ["scheduled", "confirmed", "in_progress"];
    if (!allowedStatuses.includes(appointment.status)) {
      return NextResponse.json(
        {
          error: `Appointment status '${appointment.status}' is not eligible for telehealth. Must be scheduled, confirmed, or in_progress.`,
        },
        { status: 400 },
      );
    }

    // Audit PHI access only AFTER authorization has been confirmed
    const { ipAddress, userAgent } = getRequestMetadata(context.request);
    await logAuditEvent({
      eventType: "phi_read",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "appointment",
      resourceId: appointment.id,
      details: {
        access_context: "telehealth_room_creation",
      },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    let roomUrl = appointment.telehealth_room_url || null;
    const roomName = roomUrl ? roomUrl.split("/").pop() || "" : `room-${randomUUID()}`;
    const dailyApiKey = process.env.DAILY_API_KEY;

    if (!dailyApiKey) {
      // SEC-SPRINT8: Demo/fallback telehealth is forbidden in production
      if (process.env.NODE_ENV === "production") {
        throw new Error("Demo telehealth is disabled in production");
      }
      roomUrl = roomUrl || `https://demo.daily.co/${roomName}`;

      await supabase
        .from("appointments")
        .update({
          is_telehealth: true,
          telehealth_room_url: roomUrl,
          status: "in_progress",
        })
        .eq("id", appointmentId)
        .eq("organization_id", context.user.organizationId);

      const providerSessionTokenRef = await createTelehealthJoinSession({
        appointmentId,
        organizationId: appointment.organization_id,
        participantRole: "provider",
        roomUrl,
        meetingToken: "demo-provider-token",
      });

      // SEC-SPRINT11: Patient session token created in DB only — never assigned to a local
      // or included in any response. accept-invite resolves it via the invite token lookup.
      await createTelehealthJoinSession({
        appointmentId,
        organizationId: appointment.organization_id,
        participantRole: "patient",
        roomUrl,
        meetingToken: "demo-patient-token",
      });

      // SEC-AUDIT-2026-04-10: Issue an opaque invite token. The plaintext token
      // is included in the invite URL and then discarded — only its SHA-256
      // hash is stored server-side.
      const demoInviteToken = await createTelehealthInviteToken({
        appointmentId,
        organizationId: appointment.organization_id,
        participantRole: "patient",
      });

      // SEC-PT4-F2: Provider token delivered via HTTP-only cookie when same-site allows it.
      // Body fallback included for cross-site contexts (e.g. hosted on Vercel behind proxies)
      // where the cookie may be dropped before join-session runs.
      const demoResponse = NextResponse.json({
        appointmentId,
        patientInvitePath: `/api/telehealth/accept-invite?token=${encodeURIComponent(demoInviteToken)}`,
        providerSessionToken: providerSessionTokenRef,
        isDemo: true,
      });
      demoResponse.cookies.set("telehealth_provider_session", providerSessionTokenRef, {
        httpOnly: true,
        secure: false, // Demo mode is always non-production
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });
      return demoResponse;
    }

    if (!roomUrl) {
      const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${dailyApiKey}`,
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            max_participants: 2,
            exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
          },
        }),
      });

      if (!roomResponse.ok) {
        const errorData = await roomResponse.json().catch(() => ({ error: "Unknown error" }));
        logError({
          action: "DAILY_API_ERROR",
          error: sanitizeError(errorData),
          status: String(roomResponse.status),
        });
        return NextResponse.json({ error: "Failed to create telehealth room" }, { status: 500 });
      }

      const room = await roomResponse.json();
      roomUrl = room.url;
    }

    const providerTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: `Provider ${providerId || context.user.id}`,
          is_owner: true,
          enable_recording: "cloud",
        },
      }),
    });

    const patientTokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: patientName || "Patient",
        },
      }),
    });

    if (!providerTokenResponse.ok || !patientTokenResponse.ok) {
      logError({
        action: "DAILY_TOKEN_GENERATION_ERROR",
        error: `Token generation failed: provider=${providerTokenResponse.status} patient=${patientTokenResponse.status}`,
      });
      return NextResponse.json(
        { error: "Failed to create telehealth session access" },
        { status: 500 },
      );
    }

    const providerToken = await providerTokenResponse.json();
    const patientToken = await patientTokenResponse.json();

    await supabase
      .from("appointments")
      .update({
        is_telehealth: true,
        telehealth_room_url: roomUrl,
        status: "in_progress",
      })
      .eq("id", appointmentId)
      .eq("organization_id", context.user.organizationId);

    await logAuditEvent({
      eventType: "APPOINTMENT_UPDATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "telehealth_room",
      resourceId: appointmentId,
      riskLevel: "LOW",
      details: {
        telehealth_action: "room_created",
      },
    });

    const providerSessionTokenRef = await createTelehealthJoinSession({
      appointmentId,
      organizationId: appointment.organization_id,
      participantRole: "provider",
      roomUrl,
      meetingToken: providerToken.token,
    });

    // SEC-SPRINT11: Patient session token created in DB only — never assigned to a local
    // or included in any response. accept-invite resolves it via the invite token lookup.
    await createTelehealthJoinSession({
      appointmentId,
      organizationId: appointment.organization_id,
      participantRole: "patient",
      roomUrl,
      meetingToken: patientToken.token,
    });

    // SEC-AUDIT-2026-04-10: Issue an opaque invite token. The plaintext token
    // is included in the invite URL and then discarded — only its SHA-256
    // hash is stored server-side.
    const patientInviteToken = await createTelehealthInviteToken({
      appointmentId,
      organizationId: appointment.organization_id,
      participantRole: "patient",
    });

    // SEC-PT4-F2: Provider token delivered via HTTP-only cookie when same-site allows it.
    // Body fallback included for cross-site contexts (e.g. hosted on Vercel behind proxies)
    // where the cookie may be dropped before join-session runs.
    const response = NextResponse.json({
      appointmentId,
      patientInvitePath: `/api/telehealth/accept-invite?token=${encodeURIComponent(patientInviteToken)}`,
      providerSessionToken: providerSessionTokenRef,
    });
    response.cookies.set("telehealth_provider_session", providerSessionTokenRef, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });
    return response;
  } catch (error: unknown) {
    logError({ action: "ERROR_CREATING_ROOM", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to create telehealth room" }, { status: 500 });
  }
}

export const POST = withAuth(handler, {
  requiredRole: ["USER", "ADMIN", "SUPER_ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
