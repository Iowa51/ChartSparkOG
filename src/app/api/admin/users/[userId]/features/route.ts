/**
 * Admin Feature Assignment API
 * SEC-PT7-F5: Server-side feature grant/revoke with audit logging.
 * granted_by always set from authenticated session — never from request body.
 * POST /api/admin/users/[userId]/features — grant feature
 * DELETE /api/admin/users/[userId]/features — revoke feature
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema } from "@/lib/validation/schemas";

const FeatureToggleSchema = z
  .object({
    featureId: z.string().uuid(),
    enabled: z.boolean(),
  })
  .strict();

async function handlePost(context: AuthContext) {
  try {
    const userIdValidation = UUIDSchema.safeParse(context.params?.userId);
    if (!userIdValidation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const userId = userIdValidation.data;

    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const rawBody = await context.request.json();
    const parsed = FeatureToggleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { featureId, enabled } = parsed.data;

    // Verify target user is in the same organization
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, organization_id")
      .eq("id", userId)
      .single();

    if (!targetUser || targetUser.organization_id !== context.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SEC-PT7-F5: granted_by always server-set from authenticated session
    const { error: upsertError } = await supabase.from("user_features").upsert(
      {
        user_id: userId,
        feature_id: featureId,
        enabled,
        granted_by: context.user.id,
        granted_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,feature_id",
      },
    );

    if (upsertError) {
      logError({ action: "FEATURE_TOGGLE_ERROR", error: sanitizeError(upsertError) });
      return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
    }

    const { ipAddress, userAgent } = getRequestMetadata(context.request);
    await logAuditEvent({
      eventType: enabled ? "FEATURE_ASSIGNED" : "FEATURE_REVOKED",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "user_feature",
      resourceId: `${userId}:${featureId}`,
      details: {
        target_user_id: userId,
        feature_id: featureId,
        enabled,
      },
      phiAccessed: false,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ action: "FEATURE_TOGGLE_EXCEPTION", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, {
  requiredRole: ["ADMIN", "SUPER_ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
