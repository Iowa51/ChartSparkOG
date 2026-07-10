// Isolated Supabase Auth (GoTrue) admin operations for the portal invite-claim
// flow (Sprint 2 / P3-FIXES, HIGH-4). Server-only.
//
// This module is the ONLY portal-related code permitted to use the service-role
// client, and it uses it EXCLUSIVELY for the Supabase Auth Admin API
// (createUser / deleteUser) -- an Auth-API necessity with no DB-write equivalent
// (patient auth users live in the GoTrue `auth` namespace, not a public table).
// It performs NO database writes: every portal DB write goes through the
// `patient_portal` role + the SECURITY DEFINER claim function (see
// portal-invites.ts + portal-db.ts). Keeping it out of `src/lib/portal/**` is
// deliberate -- portal libs are asserted service-role-free (see
// src/lib/portal/__tests__/no-service-role.test.ts).

import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";

export type CreatePortalAuthUserResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "exists" | "unavailable" | "error" };

/** Create the patient's Supabase Auth account. Auth API only -- no DB write. */
export async function createPortalAuthUser(
  email: string,
  password: string,
): Promise<CreatePortalAuthUserResult> {
  const service = createServiceRoleClient();
  if (!service) {
    logError({ action: "PORTAL_AUTH_NO_SERVICE_CLIENT", error: "Service client unavailable" });
    return { ok: false, reason: "unavailable" };
  }
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // the invite proves email ownership
  });
  if (error || !data?.user) {
    const msg = sanitizeError(error).toLowerCase();
    if (msg.includes("already") || msg.includes("exist")) {
      return { ok: false, reason: "exists" };
    }
    logError({ action: "PORTAL_AUTH_CREATE_FAILED", error: sanitizeError(error) });
    return { ok: false, reason: "error" };
  }
  return { ok: true, userId: data.user.id };
}

/**
 * Delete a portal Auth user -- the compensation for a claim that failed AFTER the
 * Auth account was created (P3-MED-6). Best-effort: returns ok=false if the delete
 * itself fails, so the caller can record the compensable state.
 */
export async function deletePortalAuthUser(userId: string): Promise<{ ok: boolean }> {
  const service = createServiceRoleClient();
  if (!service) return { ok: false };
  const { error } = await service.auth.admin.deleteUser(userId);
  return { ok: !error };
}
