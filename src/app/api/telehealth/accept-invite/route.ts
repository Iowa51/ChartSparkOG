// SEC-AUDIT-2026-04-10 + P0-D: The invite URL carries an opaque single-use
// token (not the appointment ID, not any meeting credential). We hash it,
// look up + atomically consume the invite record, drop the patient session
// ref into an HTTP-only cookie, then redirect to a clean /telehealth/join URL.
// Neither the bearer session ref nor the room URL nor the meeting token
// ever appear in any URL or query string.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPatientSessionRefByAppointment } from "@/lib/security/telehealth-session-tokens";
import { consumeTelehealthInviteToken } from "@/lib/security/telehealth-invite-tokens";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getClientIP } from "@/lib/utils/get-client-ip";

const AcceptInviteQuerySchema = z
  .object({
    token: z.string().min(32).max(512),
  })
  .strict();

export async function GET(request: NextRequest) {
  const destination = new URL("/telehealth/join", request.url);
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  const queryParsed = AcceptInviteQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!queryParsed.success) {
    // SEC-PT4-F8: Audit invalid invite attempts
    await logAuditEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      ipAddress,
      userAgent,
      resourceType: "telehealth_invite",
      details: { reason: "missing_or_malformed_invite_token" },
      riskLevel: "MEDIUM",
    }).catch(() => {});
    return NextResponse.redirect(destination);
  }

  const presentedToken = queryParsed.data.token;

  try {
    // SEC-AUDIT-2026-04-10: Hash + atomic single-use consume.
    const inviteRecord = await consumeTelehealthInviteToken(presentedToken);

    if (!inviteRecord) {
      // SEC-PT4-F8: Audit failed invite (expired/invalid/consumed)
      await logAuditEvent({
        eventType: "SUSPICIOUS_ACTIVITY",
        ipAddress,
        userAgent,
        resourceType: "telehealth_invite",
        details: { reason: "invalid_expired_or_consumed_invite_token" },
        riskLevel: "MEDIUM",
      }).catch(() => {});
      return NextResponse.redirect(destination);
    }

    // Only patient-role invites are allowed through this endpoint — providers
    // receive their session token via cookie at room-creation time.
    if (inviteRecord.participantRole !== "patient") {
      await logAuditEvent({
        eventType: "SUSPICIOUS_ACTIVITY",
        ipAddress,
        userAgent,
        resourceType: "telehealth_invite",
        resourceId: inviteRecord.appointmentId,
        details: { reason: "non_patient_role_invite_attempted" },
        riskLevel: "HIGH",
      }).catch(() => {});
      return NextResponse.redirect(destination);
    }

    // Look up the server-side patient session token ref. The session ref
    // itself never touches the URL — it's referenced by appointment id only
    // after we've validated + consumed the invite token above.
    const sessionRef = await getPatientSessionRefByAppointment(inviteRecord.appointmentId);

    // Always redirect to a clean /telehealth/join URL. NO `r=`, NO `t=`,
    // NO base64url-encoded credentials. The page will resolve credentials
    // server-side via the cookie set below.
    const response = NextResponse.redirect(destination);

    if (sessionRef) {
      // SEC-PT4-F8: Audit successful invite acceptance
      await logAuditEvent({
        eventType: "phi_read",
        ipAddress,
        userAgent,
        resourceType: "telehealth_invite",
        resourceId: inviteRecord.appointmentId,
        details: { access_context: "telehealth_patient_invite_accepted" },
        phiAccessed: true,
        riskLevel: "LOW",
      }).catch(() => {});

      response.cookies.set("chartspark_th_session_patient", sessionRef, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 300, // 5 minutes — matches session token TTL
        path: "/api/telehealth",
      });
    } else {
      // Invite was valid but no active patient session ref exists for the
      // appointment. Audit as suspicious — indicates race or abuse.
      await logAuditEvent({
        eventType: "SUSPICIOUS_ACTIVITY",
        ipAddress,
        userAgent,
        resourceType: "telehealth_invite",
        resourceId: inviteRecord.appointmentId,
        details: { reason: "no_valid_patient_token_for_appointment" },
        riskLevel: "MEDIUM",
      }).catch(() => {});
    }

    return response;
  } catch (error) {
    logError({ action: "TELEHEALTH_ACCEPT_INVITE_ERROR", error: sanitizeError(error) });
    return NextResponse.redirect(destination);
  }
}
