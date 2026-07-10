// Portal invite claim (Sprint 2 / P3, Part A; hardened in P3-FIXES). Server-only.
//
// The invite URL carries an opaque 32-byte token; only its SHA-256 hash is
// stored (patient_portal_invites.token_hash). This module NEVER uses the service
// role (P3-HIGH-4): invite READ + CLAIM DB access go through the patient_portal
// role + the SECURITY DEFINER public.validate_portal_invite / claim_portal_invite
// functions (see portal-db.ts + 20260709120000_sprint2_p3_fixes.sql). The Supabase
// Auth account is created by the isolated Auth-only module portal-auth-admin.ts
// (an Auth-API necessity, not a DB write). The session is established by the route.

import { createHash } from "crypto";
import { validatePassword } from "@/lib/auth/password-validation";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { validatePortalInvite, claimPortalInviteTx } from "@/lib/portal/portal-db";
import { createPortalAuthUser, deletePortalAuthUser } from "@/lib/auth/portal-auth-admin";

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteStatus = "valid" | "invalid" | "expired" | "claimed" | "unavailable";

export interface InviteRecord {
  id: string;
  patientId: string;
  orgId: string;
  email: string;
}

// Read-only validation for the accept page (decides accept-form vs error state).
export async function validateInviteToken(
  token: string,
): Promise<{ status: InviteStatus; invite?: InviteRecord }> {
  try {
    const result = await validatePortalInvite(hashInviteToken(token));
    if (result.status === "valid" && result.invite) {
      return { status: "valid", invite: result.invite };
    }
    return { status: result.status };
  } catch (error) {
    logError({ action: "PORTAL_INVITE_LOOKUP_ERROR", error: sanitizeError(error) });
    return { status: "unavailable" };
  }
}

export type ClaimResult =
  | { ok: true; email: string; patientId: string }
  | { ok: false; status: number; error: string };

/**
 * Claim an invite: validate token -> create Auth account -> atomically link +
 * mark the invite claimed (single-use, in one DB transaction). If the DB claim
 * fails AFTER the Auth account was created, the Auth account is compensated
 * (deleted); if that compensation also fails, a compensable state is recorded and
 * success is NOT reported (P3-MED-6; recovery path documented in SCHEMA-NOTES).
 */
export async function claimPortalInvite(token: string, password: string): Promise<ClaimResult> {
  const tokenHash = hashInviteToken(token);

  // 1. Validate the token (also gives us the email for the password policy).
  let invite: InviteRecord;
  try {
    const v = await validatePortalInvite(tokenHash);
    if (v.status === "invalid") return { ok: false, status: 400, error: "Invalid invite link" };
    if (v.status === "claimed")
      return { ok: false, status: 409, error: "This invite was already used" };
    if (v.status === "expired") return { ok: false, status: 410, error: "This invite has expired" };
    if (v.status !== "valid" || !v.invite) {
      return { ok: false, status: 500, error: "Unable to process invite" };
    }
    invite = v.invite;
  } catch (error) {
    logError({ action: "PORTAL_CLAIM_LOOKUP_ERROR", error: sanitizeError(error) });
    return { ok: false, status: 500, error: "Unable to process invite" };
  }

  const email = invite.email.toLowerCase();
  const pw = validatePassword(password, { email: invite.email });
  if (!pw.valid) return { ok: false, status: 400, error: "Password does not meet requirements" };

  // 2. Create the Supabase Auth account (Auth API only; no DB write).
  const created = await createPortalAuthUser(email, password);
  if (!created.ok) {
    if (created.reason === "exists") {
      return { ok: false, status: 409, error: "An account already exists. Please sign in." };
    }
    if (created.reason === "unavailable") {
      return { ok: false, status: 503, error: "Service unavailable" };
    }
    return { ok: false, status: 500, error: "Unable to create account" };
  }

  // 3. Atomically link + claim in the DB. Compensate the Auth user on any failure.
  let claim;
  try {
    claim = await claimPortalInviteTx(tokenHash, created.userId, email);
  } catch (error) {
    logError({ action: "PORTAL_CLAIM_DB_ERROR", error: sanitizeError(error) });
    await compensateAuthUser(created.userId);
    return { ok: false, status: 500, error: "Unable to create account" };
  }

  if (!claim.ok) {
    await compensateAuthUser(created.userId);
    switch (claim.reason) {
      case "claimed":
        return { ok: false, status: 409, error: "This invite was already used" };
      case "account_exists":
        return { ok: false, status: 409, error: "An account already exists. Please sign in." };
      case "expired":
        return { ok: false, status: 410, error: "This invite has expired" };
      default:
        return { ok: false, status: 400, error: "Invalid invite link" };
    }
  }

  return { ok: true, email, patientId: claim.patientId! };
}

// Delete the just-created Auth user when the DB claim did not succeed. If the
// delete itself fails, record the compensable state (an Auth user with no
// patient_portal_users link) WITHOUT reporting success -- a reconciliation job
// removes such orphans (see SCHEMA-NOTES "P3-FIXES invite claim").
async function compensateAuthUser(authUserId: string): Promise<void> {
  const del = await deletePortalAuthUser(authUserId);
  if (!del.ok) {
    logError({
      action: "PORTAL_CLAIM_ORPHAN_AUTH_USER",
      error:
        "Auth user created but claim failed and rollback delete failed; requires reconciliation",
    });
  }
}
