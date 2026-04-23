// src/app/api/notes/[id]/submit-claim/route.ts
// P0 FIX: Creates a billing_claims record AND transitions the approved note to
// 'signed' atomically. Replaces the former false-success flow where the client
// PATCH'd status='signed' without ever inserting a claim.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEventAsync, logPHIAccess } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { UUIDSchema } from "@/lib/validation/schemas";

function generateClaimNumber(organizationId: string): string {
  const prefix = organizationId.substring(0, 4).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CLM-${prefix}-${timestamp}-${random}`;
}

async function handlePost(context: AuthContext) {
  const idValidation = UUIDSchema.safeParse(context.params?.id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }
  const noteId = idValidation.data;

  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const supabase = await createClient();

    const { data: note, error: fetchError } = await supabase
      .from("clinical_notes")
      .select(
        "id, organization_id, provider_id, patient_id, encounter_id, status, cpt_codes, icd10_codes, billing_amount, signed_at, updated_at",
      )
      .eq("id", noteId)
      .single();

    if (fetchError || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.organization_id !== context.user.organizationId) {
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
        details: { reason: "Cross-organization submit-claim attempt" },
        phiAccessed: false,
        riskLevel: "CRITICAL",
      });
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (
      note.provider_id !== context.user.id &&
      context.user.role !== "ADMIN" &&
      context.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only the note provider or an admin can submit this claim" },
        { status: 403 },
      );
    }

    if (note.status !== "approved") {
      return NextResponse.json(
        { error: `Only approved notes can be submitted for billing. Current status: ${note.status}` },
        { status: 400 },
      );
    }

    const cptCodes: string[] = Array.isArray(note.cpt_codes) ? note.cpt_codes : [];
    const icd10Codes: string[] = Array.isArray(note.icd10_codes) ? note.icd10_codes : [];

    if (cptCodes.length === 0) {
      return NextResponse.json(
        { error: "At least one CPT code is required to submit a claim" },
        { status: 400 },
      );
    }
    if (icd10Codes.length === 0) {
      return NextResponse.json(
        { error: "At least one ICD-10 code is required to submit a claim" },
        { status: 400 },
      );
    }

    // Best-effort payer lookup. Patient may not have insurance on file; the
    // billing_claims.payer_name column is nullable so we fall through to null
    // rather than blocking the clinician.
    let payerName: string | null = null;
    let payerId: string | null = null;
    const { data: insurance } = await supabase
      .from("patient_insurance")
      .select("provider, policy_number")
      .eq("patient_id", note.patient_id)
      .eq("is_primary", true)
      .maybeSingle();
    if (insurance) {
      payerName = (insurance as { provider?: string | null }).provider ?? null;
      payerId = (insurance as { policy_number?: string | null }).policy_number ?? null;
    }

    // Re-use an existing claim if one was already created for this note's
    // encounter (encounter_id is globally unique on billing_claims).
    if (note.encounter_id) {
      const { data: existingClaim } = await supabase
        .from("billing_claims")
        .select("id, claim_number")
        .eq("encounter_id", note.encounter_id)
        .maybeSingle();
      if (existingClaim) {
        const signedAt = new Date().toISOString();
        const { data: signedNote, error: updateError } = await supabase
          .from("clinical_notes")
          .update({ status: "signed", signed_at: signedAt, updated_at: signedAt })
          .eq("id", noteId)
          .eq("organization_id", context.user.organizationId)
          .eq("status", "approved")
          .select()
          .single();
        if (updateError || !signedNote) {
          logError({
            action: "SUBMIT_CLAIM_SIGN_FAILED",
            error: sanitizeError(updateError),
            resourceId: noteId,
          });
          return NextResponse.json(
            { error: "Claim exists but failed to sign note" },
            { status: 500 },
          );
        }
        return NextResponse.json({
          claim: existingClaim,
          note: signedNote,
          reused: true,
        });
      }
    }

    const claimNumber = generateClaimNumber(note.organization_id);
    const serviceDate = note.signed_at || note.updated_at || new Date().toISOString();
    const billedAmount = typeof note.billing_amount === "number" ? note.billing_amount : 0;

    const { data: claim, error: claimError } = await supabase
      .from("billing_claims")
      .insert({
        organization_id: note.organization_id,
        patient_id: note.patient_id,
        provider_id: note.provider_id,
        encounter_id: note.encounter_id,
        claim_number: claimNumber,
        service_date: serviceDate,
        diagnosis_codes: icd10Codes,
        procedure_codes: cptCodes,
        billed_amount: billedAmount,
        payer_name: payerName,
        payer_id: payerId,
        status: "draft",
      })
      .select()
      .single();

    if (claimError || !claim) {
      logError({
        action: "SUBMIT_CLAIM_INSERT_FAILED",
        error: sanitizeError(claimError),
        resourceId: noteId,
      });
      return NextResponse.json(
        { error: "Failed to create billing claim" },
        { status: 500 },
      );
    }

    // Atomic guard: only sign the note if it's still in 'approved' state.
    const signedAt = new Date().toISOString();
    const { data: signedNote, error: updateError } = await supabase
      .from("clinical_notes")
      .update({ status: "signed", signed_at: signedAt, updated_at: signedAt })
      .eq("id", noteId)
      .eq("organization_id", context.user.organizationId)
      .eq("status", "approved")
      .select()
      .single();

    if (updateError || !signedNote) {
      // Roll back the claim so we do not leave an orphaned billing row attached
      // to a non-signed note.
      const { error: rollbackError } = await supabase
        .from("billing_claims")
        .delete()
        .eq("id", claim.id);
      if (rollbackError) {
        logError({
          action: "SUBMIT_CLAIM_ROLLBACK_FAILED",
          error: sanitizeError(rollbackError),
          resourceId: claim.id,
        });
      }
      logError({
        action: "SUBMIT_CLAIM_SIGN_FAILED",
        error: sanitizeError(updateError),
        resourceId: noteId,
      });
      return NextResponse.json(
        { error: "Failed to sign note; claim was rolled back" },
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
      eventType: "BILLING_CLAIM_GENERATED",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "billing_claim",
      resourceId: claim.id,
      details: {
        note_id: noteId,
        claim_number: claim.claim_number,
        cpt_codes: cptCodes,
        icd10_codes: icd10Codes,
      },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

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
      details: { signed_at: signedAt, new_status: "signed", claim_id: claim.id },
      phiAccessed: true,
      riskLevel: "HIGH",
    });

    return NextResponse.json({ claim, note: signedNote });
  } catch (error) {
    logError({
      action: "SUBMIT_CLAIM_ERROR",
      error: sanitizeError(error),
      resourceId: noteId,
    });
    return NextResponse.json({ error: "Failed to submit claim" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, { requireMFA: true });
