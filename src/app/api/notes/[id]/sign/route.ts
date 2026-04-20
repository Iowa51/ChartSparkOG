// src/app/api/notes/[id]/sign/route.ts
// "Sign & Send for Review" — clinician signs the note and sends it to auditor review.
// Writes clinical_notes.{status='pending_review', is_signed, signed_at, signed_by,
// is_locked, updated_at} AND creates a companion submissions row in 'pending_audit'.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEventAsync, logPHIAccess } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema } from "@/lib/validation/schemas";

const DEFAULT_CPT_CODE = "99213"; // E&M follow-up fallback when note has no CPT codes

async function handlePost(context: AuthContext) {
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }
  const noteId = idValidation.data;

  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const supabase = await createClient();

    // Load current note to validate ownership, org, status, and read fields needed
    // for the submission row.
    const { data: currentNote, error: fetchError } = await supabase
      .from("clinical_notes")
      .select(
        "id, organization_id, provider_id, patient_id, status, is_signed, signed_at, signed_by, cpt_codes, icd10_codes",
      )
      .eq("id", noteId)
      .single();

    if (fetchError || !currentNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Provider ownership — only the note's provider (or SUPER_ADMIN) may sign.
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

    // Organization access.
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

    if (currentNote.is_signed) {
      return NextResponse.json(
        {
          error: "Note already signed",
          details: {
            signed_at: currentNote.signed_at,
            signed_by: currentNote.signed_by,
          },
        },
        { status: 400 },
      );
    }

    // Workflow gate: only draft or needs_revision notes can be signed and sent for review.
    if (currentNote.status !== "draft" && currentNote.status !== "needs_revision") {
      return NextResponse.json(
        {
          error: `Only draft or revision-requested notes can be signed. Current status: ${currentNote.status}`,
        },
        { status: 400 },
      );
    }

    const signedAt = new Date().toISOString();

    const { data: signedNote, error: updateError } = await supabase
      .from("clinical_notes")
      .update({
        status: "pending_review",
        is_signed: true,
        signed_at: signedAt,
        signed_by: context.user.id,
        is_locked: true,
        updated_at: signedAt,
      })
      .eq("id", noteId)
      .eq("organization_id", context.user.organizationId)
      .eq("is_signed", false) // race guard
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create the companion submission row. Auditor picks it up in /auditor/notes queue.
    // Option A: primary CPT code per submission (first from the note's array, default fallback).
    const primaryCptCode = currentNote.cpt_codes?.[0] || DEFAULT_CPT_CODE;
    const icd10Codes: string[] = currentNote.icd10_codes || [];

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        note_id: noteId,
        patient_id: currentNote.patient_id,
        provider_id: currentNote.provider_id,
        organization_id: currentNote.organization_id,
        cpt_code: primaryCptCode,
        icd10_codes: icd10Codes,
        billing_amount: 0,
        status: "pending_audit",
      })
      .select()
      .single();

    if (submissionError) {
      // The note is signed but the submission write failed. Log for operator follow-up
      // but don't fail the clinician's action — clinical signing already happened.
      logError({
        action: "SUBMISSION_CREATE_FAILED",
        error: sanitizeError(submissionError),
        resourceId: noteId,
      });
      await logAuditEventAsync({
        eventType: "NOTE_UPDATE",
        userId: context.user.id,
        userEmail: context.user.email,
        userRole: context.user.role,
        organizationId: context.user.organizationId ?? undefined,
        ipAddress,
        userAgent,
        resourceType: "submission",
        resourceId: noteId,
        details: {
          action: "SUBMISSION_CREATE_FAILED",
          error: sanitizeError(submissionError),
        },
        phiAccessed: false,
        riskLevel: "HIGH",
      });
    }

    // High-risk PHI audit for the sign event.
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
        signer_name: context.user.email,
        signed_at: signedAt,
        new_status: "pending_review",
      },
      phiAccessed: true,
      riskLevel: "HIGH",
    });

    if (submission) {
      await logAuditEventAsync({
        eventType: "NOTE_UPDATE",
        userId: context.user.id,
        userEmail: context.user.email,
        userRole: context.user.role,
        organizationId: context.user.organizationId ?? undefined,
        ipAddress,
        userAgent,
        resourceType: "submission",
        resourceId: submission.id,
        details: {
          action: "SUBMISSION_CREATED",
          note_id: noteId,
          cpt_code: primaryCptCode,
          icd10_count: icd10Codes.length,
        },
        phiAccessed: true,
        riskLevel: "MEDIUM",
      });
    }

    return NextResponse.json({
      success: true,
      note: signedNote,
      submission: submission ?? null,
      warning: submission ? undefined : "Note signed but submission creation failed — logged for investigation",
      message: "Note signed and sent for auditor review",
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
