/**
 * Admin Role Change API
 * PATCH /api/admin/users/[userId]/role
 *
 * Dedicated endpoint for changing a user's role, separate from the general
 * user update endpoint which explicitly excludes role. Enforces:
 *   - Auth: SUPER_ADMIN or ADMIN only
 *   - Self-change prevention
 *   - Same-org scoping (unless SUPER_ADMIN)
 *   - Role hierarchy (ADMIN limited to USER<->AUDITOR transitions)
 *   - SUPER_ADMIN cannot be granted via API and cannot be demoted
 *   - Rate limited to 20/hr per caller
 *   - Uses service role client to bypass trg_prevent_users_role_escalation
 *     (the trigger's authorization intent is enforced by this endpoint's
 *     explicit checks — service role is the authorized server-side path).
 *   - Audit logged with HIGH risk level.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { checkRateLimitByKey } from "@/lib/security/rate-limit";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema } from "@/lib/validation/schemas";

const RoleChangeSchema = z
  .object({
    new_role: z.enum(["USER", "ADMIN", "AUDITOR"]),
    reason: z.string().min(5).max(500),
  })
  .strict();

type NewRole = z.infer<typeof RoleChangeSchema>["new_role"];

function isHierarchyAllowed(
  callerRole: string,
  targetCurrentRole: string,
  newRole: NewRole,
): { ok: true } | { ok: false; error: string } {
  if (targetCurrentRole === "SUPER_ADMIN") {
    return { ok: false, error: "Cannot modify SUPER_ADMIN accounts" };
  }

  if (callerRole === "SUPER_ADMIN") {
    return { ok: true };
  }

  if (callerRole === "ADMIN") {
    if (["ADMIN", "SUPER_ADMIN"].includes(targetCurrentRole)) {
      return { ok: false, error: "Admins cannot modify admin accounts" };
    }
    if (newRole === "ADMIN") {
      return { ok: false, error: "Admins cannot grant ADMIN role" };
    }
    const allowed =
      (targetCurrentRole === "USER" && newRole === "AUDITOR") ||
      (targetCurrentRole === "AUDITOR" && newRole === "USER");
    if (!allowed) {
      return {
        ok: false,
        error: "Admins may only toggle USER and AUDITOR roles",
      };
    }
    return { ok: true };
  }

  return { ok: false, error: "Insufficient privileges" };
}

async function handlePatch(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const userIdValidation = UUIDSchema.safeParse(context.params?.userId);
    if (!userIdValidation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const userId = userIdValidation.data;

    const rateLimit = await checkRateLimitByKey(
      context.user.id,
      "roleChange",
      "/api/admin/users/role",
    );
    if (!rateLimit.success && rateLimit.response) {
      return rateLimit.response;
    }

    const rawBody = await context.request.json();
    const parsed = RoleChangeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { new_role, reason } = parsed.data;

    if (userId === context.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 403 },
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("id, organization_id, role")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      context.user.role !== "SUPER_ADMIN" &&
      targetUser.organization_id !== context.user.organizationId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const hierarchy = isHierarchyAllowed(
      context.user.role,
      targetUser.role,
      new_role,
    );
    if (!hierarchy.ok) {
      return NextResponse.json({ error: hierarchy.error }, { status: 403 });
    }

    if (targetUser.role === new_role) {
      return NextResponse.json(
        { error: "Target user already has this role" },
        { status: 400 },
      );
    }

    // Use service role to bypass trg_prevent_users_role_escalation on public.users.
    // Our endpoint-level checks above are the authorized path; the trigger is
    // defense-in-depth against direct DB writes from authenticated clients.
    let serviceClient;
    try {
      serviceClient = createServiceRoleClient();
    } catch (err) {
      logError({
        action: "ADMIN_ROLE_CHANGE_SERVICE_CLIENT_ERROR",
        error: sanitizeError(err),
      });
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }
    if (!serviceClient) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { error: updateError } = await serviceClient
      .from("users")
      .update({ role: new_role })
      .eq("id", userId);

    if (updateError) {
      logError({
        action: "ADMIN_ROLE_CHANGE_ERROR",
        error: sanitizeError(updateError),
      });
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    await logAuditEvent({
      eventType: "USER_ROLE_CHANGE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "user",
      resourceId: userId,
      details: {
        target_user_id: userId,
        previous_role: targetUser.role,
        new_role,
        reason,
      },
      phiAccessed: false,
      riskLevel: "HIGH",
    });

    return NextResponse.json({
      success: true,
      user: { id: userId, role: new_role },
    });
  } catch (error) {
    logError({
      action: "ADMIN_ROLE_CHANGE_EXCEPTION",
      error: sanitizeError(error),
    });
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export const PATCH = withAuth(handlePatch, {
  requiredRole: ["SUPER_ADMIN", "ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
