/**
 * Submit Claim to Clearinghouse API
 * SEC-HIGH-01: Migrated to withAuth wrapper with params support
 * POST /api/managed-billing/claims/[id]/submit
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitClaimToClearinghouse } from "@/lib/managed-billing/clearinghouse-service";
import { withAuth, AuthContext, isSuperAdmin } from "@/lib/auth/api-auth";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { logAuditEventAsync } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { UUIDSchema } from "@/lib/validation/schemas";

async function handlePost(context: AuthContext) {
  try {
    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid claim id" }, { status: 400 });
    }
    const id = idValidation.data;

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    // SEC-PT5-F6: Atomic status transition — UPDATE WHERE status IN (...) RETURNING.
    // Only one concurrent request can succeed; the second gets 0 rows.
    const { data: claim, error: updateError } = await supabase
      .from("billing_claims")
      .update({ status: "submitting" })
      .eq("id", id)
      .in("status", ["draft", "ready", "rejected"])
      .select("id, organization_id, status")
      .single();

    if (updateError || !claim) {
      return NextResponse.json(
        { error: "Claim not available for submission (not found or already submitted)" },
        { status: 409 },
      );
    }

    if (claim.organization_id !== context.user.organizationId && !isSuperAdmin(context.user)) {
      // Roll back status — this shouldn't happen with RLS but defense-in-depth
      await supabase.from("billing_claims").update({ status: "draft" }).eq("id", id);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await submitClaimToClearinghouse(id);

    if (!result.success) {
      // Revert to 'ready' so the claim can be retried
      await supabase.from("billing_claims").update({ status: "ready" }).eq("id", id);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const { ipAddress, userAgent } = getRequestMetadata(context.request);
    logAuditEventAsync({
      eventType: "BILLING_RECORD_CREATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "billing_claim",
      resourceId: id,
      details: { action: "CLAIM_SUBMIT", submissionId: result.submissionId },
      phiAccessed: true,
      riskLevel: "HIGH",
    });

    return NextResponse.json({
      success: true,
      submissionId: result.submissionId,
      clearinghouseClaimId: result.clearinghouseClaimId,
    });
  } catch (error) {
    logError({ action: "SUBMIT_CLAIM_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to submit claim" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
