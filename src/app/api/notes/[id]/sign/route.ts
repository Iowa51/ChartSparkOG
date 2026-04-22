// src/app/api/notes/[id]/sign/route.ts
// "Sign & Send for Review" — clinician signs the note and sends it to auditor review.
// Writes clinical_notes.{status='pending_review', signed_at, updated_at} AND creates a
// companion submissions row in 'pending_audit'. If the submission insert fails, the
// note UPDATE is rolled back so the row never stays in a half-signed state.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEventAsync, logPHIAccess } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema } from "@/lib/validation/schemas";

async function handlePost(context: AuthContext) {
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }
  const noteId = idValidation.data;

  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const supabase = await createClient();

    const { data: currentNote, error: fetchError } = await supabase
      .from("clinical_notes")
      .select(
        "id, organization_id, provider_id, patient_id, status, signed_at, updated_at, cpt_codes, icd10_codes, billing_amount",
      )
      .eq("id", noteId)
      .single();

    if (fetchError || !currentNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (
      currentNote.provider_id !== context.user.id &&
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
        details: { reason: "Non-owner sign attempt", note_provider_id: currentNote.provider_id },
        phiAccessed: false,
        riskLevel: "HIGH",
      });
      return NextResponse.json(
        { error: "Only the note provider or a super admin can sign this note" },
        { status: 403 },
      );
    }

    if (currentNote.organization_id !== context.user.organizationId) {
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
        details: { reason: "Cross-organization sign attempt" },
        phiAccessed: false,
        riskLevel: "CRITICAL",
      });
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Workflow gate: only draft, completed, or needs_revision notes can be signed and sent for review.
    if (currentNote.status !== "draft" && currentNote.status !== "needs_revision" && currentNote.status !== "completed") {
      return NextResponse.json(
        {
          error: `Only draft, completed, or revision-requested notes can be signed. Current status: ${currentNote.status}`,
        },
        { status: 400 },
      );
    }

    const priorStatus = currentNote.status;
    const priorSignedAt = currentNote.signed_at;
    const priorUpdatedAt = currentNote.updated_at;

    const signedAt = new Date().toISOString();

    // Atomic guard: only transition from the expected prior status so two rapid
    // requests cannot both proceed past this point.
    const { data: signedNote, error: updateError } = await supabase
      .from("clinical_notes")
      .update({
        status: "pending_review",
        signed_at: signedAt,
        updated_at: signedAt,
      })
      .eq("id", noteId)
      .eq("organization_id", context.user.organizationId)
      .eq("status", priorStatus)
      .select()
      .single();

    if (updateError || !signedNote) {
      logError({
        action: "SIGN_NOTE_UPDATE_FAILED",
        error: sanitizeError(updateError),
        resourceId: noteId,
      });
      return NextResponse.json(
        { error: "Failed to sign note" },
        { status: 500 },
      );
    }

    // Create the companion submission row.
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        note_id: noteId,
        patient_id: currentNote.patient_id,
        provider_id: currentNote.provider_id,
        organization_id: currentNote.organization_id,
        cpt_code: currentNote.cpt_codes?.[0] ?? null,
        icd10_codes: currentNote.icd10_codes ?? [],
        billing_amount: currentNote.billing_amount ?? 0,
        status: "pending_audit",
      })
      .select("id")
      .single();

    if (submissionError || !submission) {
      // Roll back the note UPDATE so the row is not stuck in a half-signed state.
      const { error: rollbackError } = await supabase
        .from("clinical_notes")
        .update({
          status: priorStatus,
          signed_at: priorSignedAt,
          updated_at: priorUpdatedAt,
        })
        .eq("id", noteId)
        .eq("organization_id", context.user.organizationId);

      if (rollbackError) {
        logError({
          action: "SIGN_NOTE_ROLLBACK_FAILED",
          error: sanitizeError(rollbackError),
          resourceId: noteId,
        });
      }

      logError({
        action: "SUBMISSION_CREATE_FAILED",
        error: sanitizeError(submissionError),
        resourceId: noteId,
      });
      await logAuditEventAsync({
        eventType: "SUBMISSION_CREATE_FAILED",
        userId: context.user.id,
        userEmail: context.user.email,
        userRole: context.user.role,
        organizationId: context.user.organizationId ?? undefined,
        ipAddress,
        userAgent,
        resourceType: "submission",
        resourceId: noteId,
        details: {
          rollback_succeeded: !rollbackError,
        },
        phiAccessed: false,
        riskLevel: "HIGH",
      });

      return NextResponse.json(
        { error: "Failed to create submission; note was reverted to its prior state" },
        { status: 500 },
      );
    }

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

    await logAuditEventAsync({
      eventType: "NOTE_SIGN",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "clinical_note",
      resourceId: noteId,
      details: {
        signed_at: signedAt,
        new_status: "pending_review",
      },
      phiAccessed: true,
      riskLevel: "HIGH",
    });

    await logAuditEventAsync({
      eventType: "SUBMISSION_CREATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "submission",
      resourceId: submission.id,
      details: {
        note_id: noteId,
      },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({
      noteId,
      submissionId: submission.id,
      status: "pending_review",
    });
  } catch (error) {
    logError({
      action: "SIGN_NOTE_ERROR",
      error: sanitizeError(error),
      resourceId: noteId,
    });
    return NextResponse.json({ error: "Failed to sign note" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, { requireMFA: true });