// src/app/api/admin/submissions/[id]/review/route.ts
// Server-side admin review for submissions: approve or reject with org scoping + audit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

const ReviewSchema = z.object({
    action: z.enum(["approved", "rejected"]),
    reason: z.string().min(3).max(500).optional(),
});

const REVIEWABLE_STATUSES = new Set([
    "pending_audit",
    "pending_approval",
    "flagged",
]);

async function handlePatch(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    const idValidation = UUIDSchema.safeParse(context.params?.id);
    if (!idValidation.success) {
        return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }
    const submissionId = idValidation.data;

    try {
        const rawBody = await context.request.json();
        const validation = validateRequest(ReviewSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.errors },
                { status: 400 },
            );
        }
        const { action, reason } = validation.data;

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        const { data: submission, error: fetchError } = await supabase
            .from("submissions")
            .select("id, organization_id, status")
            .eq("id", submissionId)
            .single();

        if (fetchError || !submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        if (
            context.user.role !== "SUPER_ADMIN" &&
            submission.organization_id !== context.user.organizationId
        ) {
            await logAuditEvent({
                eventType: "UNAUTHORIZED_ACCESS",
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                ipAddress,
                userAgent,
                resourceType: "submission",
                resourceId: submissionId,
                details: { reason: "Cross-organization submission review attempt" },
                phiAccessed: false,
                riskLevel: "HIGH",
            });
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        if (!REVIEWABLE_STATUSES.has(submission.status)) {
            return NextResponse.json(
                { error: `Cannot review a submission with status: ${submission.status}` },
                { status: 400 },
            );
        }

        const now = new Date().toISOString();
        const updateData: Record<string, unknown> = {
            status: action,
            updated_at: now,
        };

        if (action === "approved") {
            updateData.admin_approved_by = context.user.id;
            updateData.admin_approved_at = now;
        } else if (reason) {
            updateData.rejection_reason = reason;
        }

        const { data: updated, error: updateError } = await supabase
            .from("submissions")
            .update(updateData)
            .eq("id", submissionId)
            .eq("organization_id", submission.organization_id)
            .select()
            .single();

        if (updateError || !updated) {
            logError({
                action: "SUBMISSION_REVIEW_UPDATE_ERROR",
                error: sanitizeError(updateError),
                resourceId: submissionId,
            });
            return NextResponse.json(
                { error: "Failed to update submission" },
                { status: 500 },
            );
        }

        await logAuditEvent({
            eventType: "SUBMISSION_REVIEW",
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress,
            userAgent,
            resourceType: "submission",
            resourceId: submissionId,
            details: {
                previous_status: submission.status,
                new_status: action,
                reason: reason ?? null,
            },
            phiAccessed: false,
            riskLevel: "MEDIUM",
        });

        return NextResponse.json({ success: true, submission: updated });
    } catch (error) {
        logError({
            action: "SUBMISSION_REVIEW_EXCEPTION",
            error: sanitizeError(error),
            resourceId: submissionId,
        });
        return NextResponse.json(
            { error: "Failed to review submission" },
            { status: 500 },
        );
    }
}

export const PATCH = withAuth(handlePatch, {
    requiredRole: ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
    requireOrganization: true,
    requireMFA: true,
});
