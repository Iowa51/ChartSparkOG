// src/app/api/notes/[id]/review/route.ts
// Auditor review workflow: approve or request revision on a note

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEventAsync, logPHIAccess } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { z } from "zod";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

const ReviewActionSchema = z.object({
  action: z.enum(["approve", "request_revision"]),
  comments: z.string().max(5000).optional(),
});

async function handlePost(context: AuthContext) {
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }
  const noteId = idValidation.data;

  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const rawData = await context.request.json();

    const validation = validateRequest(ReviewActionSchema, rawData);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const { action, comments } = validation.data;
    const supabase = await createClient();

    // Get current note to verify status and org access
    const { data: currentNote, error: fetchError } = await supabase
      .from("clinical_notes")
      .select("id, organization_id, status")
      .eq("id", noteId)
      .single();

    if (fetchError || !currentNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Verify organization access
    if (
      currentNote.organization_id !== context.user.organizationId &&
      context.user.role !== "SUPER_ADMIN"
    ) {
      await logAuditEventAsync({
        eventType: "UNAUTHORIZED_ACCESS",
        userId: context.user.id,
        userEmail: context.user.email,
        userRole: context.user.role,
        organizationId: context.user.organizationId ?? undefined,
        ipAddress,
        userAgent,
        resourceType: "clinical_note",
        resourceId: noteId,
        details: { reason: "Cross-organization review attempt" },
        phiAccessed: false,
        riskLevel: "CRITICAL",
      });
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only pending_review notes can be reviewed
    if (currentNote.status !== "pending_review") {
      return NextResponse.json(
        { error: `Cannot review a note with status: ${currentNote.status}` },
        { status: 400 },
      );
    }

    const newStatus = action === "approve" ? "approved" : "needs_revision";
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      status: newStatus,
      reviewed_at: now,
      updated_at: now,
    };

    if (comments) {
      updateData.reviewer_feedback = comments;
    }

    const { data: updatedNote, error: updateError } = await supabase
      .from("clinical_notes")
      .update(updateData)
      .eq("id", noteId)
      .eq("organization_id", context.user.organizationId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log PHI access
    await logPHIAccess(
      context.user.id,
      context.user.email,
      context.user.role,
      context.user.organizationId || "",
      "NOTE",
      noteId,
      "UPDATE",
      ipAddress,
      userAgent,
    );

    // Log the review action
    logAuditEventAsync({
      eventType: "NOTE_UPDATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "clinical_note",
      resourceId: noteId,
      details: { action, newStatus, comments: comments ? "[redacted]" : undefined },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    logError({
      action: "REVIEW_NOTE_ERROR",
      error: sanitizeError(error),
      resourceId: noteId,
    });
    return NextResponse.json({ error: "Failed to review note" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, {
  requiredRole: ["AUDITOR", "ADMIN", "SUPER_ADMIN"],
  requireMFA: true,
});
