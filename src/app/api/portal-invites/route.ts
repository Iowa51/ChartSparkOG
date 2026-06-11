// src/app/api/portal-invites/route.ts
// PRD-02 P0 — clinician-side portal invite endpoint (OG-edit declared in
// features/02-patient-portal.md).
//
// POST — create an invite: validates the patient belongs to the caller's
//        org and has an email on file, expires prior unclaimed invites,
//        stores ONLY the SHA-256 hash of an opaque 32-byte token
//        (telehealth invite-token model; plaintext never persisted), and
//        returns the one-time invite URL. v1 is copy-link; email delivery
//        is a later phase.
// GET  — portal status for a patient:
//        not_invited | pending | expired | active.
//
// Both handlers are gated behind the PORTAL_V1 feature. The feature is
// not seeded until the foundation migration is applied, so the routes
// fail closed (403) until the portal rollout.

import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

// 7-day TTL — portal-appropriate (vs telehealth's 15 minutes): the
// patient claims the link from their inbox, not from an active call.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TOKEN_BYTES = 32;
const PORTAL_INVITE_BASE_URL = "https://portal.chartspark.io/invite";

const InviteCreateSchema = z.object({ patient_id: UUIDSchema }).strict();

type PortalStatus = "not_invited" | "pending" | "expired" | "active";

interface InviteRow {
  id: string;
  invited_at: string;
  expires_at: string;
  claimed_at: string | null;
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resolvePortalStatus(hasAccount: boolean, invite: InviteRow | null): PortalStatus {
  if (hasAccount) return "active";
  if (!invite) return "not_invited";
  if (invite.claimed_at) return "active"; // claimed — account creation in flight
  if (new Date(invite.expires_at).getTime() > Date.now()) return "pending";
  return "expired";
}

async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  // Defense in depth: withAuth({ requireOrganization: true }) already
  // enforces this; the guard also narrows the type for the queries below.
  const organizationId = context.user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organization required" }, { status: 403 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await context.request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validation = validateRequest(InviteCreateSchema, parsedBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }
  const patientId = validation.data.patient_id;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Same 404 whether the patient doesn't exist or belongs to another
    // org — no existence leak.
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, email")
      .eq("id", patientId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (patientError) throw patientError;
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (!patient.email) {
      return NextResponse.json(
        {
          error:
            "Patient has no email on file. Add an email address to the patient record before sending a portal invite.",
        },
        { status: 409 },
      );
    }

    const { data: portalUser, error: portalUserError } = await supabase
      .from("patient_portal_users")
      .select("id")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (portalUserError) throw portalUserError;
    if (portalUser) {
      return NextResponse.json({ error: "Patient already has a portal account" }, { status: 409 });
    }

    // Re-invite: expire prior unclaimed invites so exactly one link works.
    const nowIso = new Date().toISOString();
    const { error: expireError } = await supabase
      .from("patient_portal_invites")
      .update({ expires_at: nowIso })
      .eq("patient_id", patientId)
      .is("claimed_at", null)
      .gt("expires_at", nowIso);
    if (expireError) throw expireError;

    // Opaque token: plaintext goes into the returned URL only; the DB
    // stores the SHA-256 hash. Never log or persist the plaintext.
    const token = randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { data: invite, error: insertError } = await supabase
      .from("patient_portal_invites")
      .insert({
        patient_id: patientId,
        org_id: organizationId,
        token_hash: hashInviteToken(token),
        email: patient.email,
        invited_by: context.user.id,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insertError || !invite) {
      throw insertError ?? new Error("Invite insert returned no row");
    }

    // AuditEventType is a closed union in src/lib/security/audit-log.ts
    // (forbidden to modify in this OG-edit window); USER_INVITATION_CREATED
    // + resourceType "portal_invite" is the closest existing event.
    await logAuditEvent({
      eventType: "USER_INVITATION_CREATED",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId,
      ipAddress,
      userAgent,
      resourceType: "portal_invite",
      resourceId: invite.id,
      details: {
        // metadata only — never the patient email or the token
        patient_id: patientId,
        expires_at: expiresAt,
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json(
      {
        invite_id: invite.id,
        invite_url: `${PORTAL_INVITE_BASE_URL}/${token}`,
        expires_at: expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    logError({ action: "PORTAL_INVITE_CREATE_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to create portal invite" }, { status: 500 });
  }
}

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  const organizationId = context.user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organization required" }, { status: 403 });
  }

  const idValidation = UUIDSchema.safeParse(context.request.nextUrl.searchParams.get("patient_id"));
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid patient_id" }, { status: 400 });
  }
  const patientId = idValidation.data;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (patientError) throw patientError;
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { data: portalUser, error: portalUserError } = await supabase
      .from("patient_portal_users")
      .select("id, status")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (portalUserError) throw portalUserError;

    const { data: inviteRows, error: inviteError } = await supabase
      .from("patient_portal_invites")
      .select("id, invited_at, expires_at, claimed_at")
      .eq("patient_id", patientId)
      .order("invited_at", { ascending: false })
      .limit(1);
    if (inviteError) throw inviteError;
    const invite: InviteRow | null = inviteRows?.[0] ?? null;

    const portalStatus = resolvePortalStatus(Boolean(portalUser), invite);

    await logAuditEvent({
      eventType: "PATIENT_VIEW",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId,
      ipAddress,
      userAgent,
      resourceType: "portal_invite",
      resourceId: invite?.id,
      details: {
        patient_id: patientId,
        portal_status: portalStatus,
      },
      phiAccessed: false,
      riskLevel: "LOW",
    });

    return NextResponse.json({
      portal_status: portalStatus,
      account_status: portalUser?.status ?? null,
      invite: invite
        ? {
            invited_at: invite.invited_at,
            expires_at: invite.expires_at,
            claimed_at: invite.claimed_at,
          }
        : null,
    });
  } catch (error) {
    logError({ action: "PORTAL_INVITE_STATUS_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to load portal status" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, {
  requireOrganization: true,
  requireMFA: true,
  requiredFeature: "PORTAL_V1",
});
export const GET = withAuth(handleGet, {
  requireOrganization: true,
  requireMFA: true,
  requiredFeature: "PORTAL_V1",
});
