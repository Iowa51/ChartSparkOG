// Sprint 2 / P3 (Part C) -- provider reconciliation status transitions.
// Advances an intake submission along the server-enforced state machine
// (patient_entered -> provider_review -> reconciled -> signed). On `signed`, the
// DB trigger builds the immutable snapshot; this route then auto-populates a
// DRAFT clinical note from it (never auto-finalized). RECONCILE_V1-gated.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthContext } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { isReconcileV1Enabled } from "@/lib/config/environment";
import { validateRequest } from "@/lib/validation/schemas";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { buildIntakeNoteDraft } from "@/lib/notes/intake-note-sections";
import { assertReconcileReady } from "@/lib/reconcile/data";

const StatusSchema = z.object({ to: z.enum(["provider_review", "reconciled", "signed"]) }).strict();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handler(context: AuthContext): Promise<NextResponse> {
  if (!isReconcileV1Enabled()) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }
  const submissionId = context.params?.submissionId;
  if (!submissionId || !UUID_RE.test(submissionId)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid body" } },
      { status: 422 },
    );
  }
  const parsed = validateRequest(StatusSchema, body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid transition" } },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" } },
      { status: 503 },
    );
  }

  // Readiness mirror (P3-CRIT-2). The DB state-machine trigger is the true gate;
  // these pre-checks yield precise 409s instead of a generic transition error.
  if (parsed.data.to === "provider_review") {
    const { data: sub } = await supabase
      .from("intake_submissions")
      .select("submitted_at")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 },
      );
    }
    if (!sub.submitted_at) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Intake has not been submitted yet" } },
        { status: 409 },
      );
    }
  }
  if (parsed.data.to === "reconciled" || parsed.data.to === "signed") {
    const readiness = await assertReconcileReady(supabase, submissionId);
    if (!readiness.ready) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: readiness.message } },
        { status: 409 },
      );
    }
  }

  const updates: Record<string, unknown> = { status: parsed.data.to };
  if (parsed.data.to === "provider_review" || parsed.data.to === "reconciled") {
    updates.reviewed_by = context.user.id;
    updates.reviewed_at = new Date().toISOString();
  }

  // RLS scopes to the caller's org; the state-machine trigger enforces legal
  // forward-only transitions (an illegal skip RAISEs -> error -> 409).
  const { data, error } = await supabase
    .from("intake_submissions")
    .update(updates)
    .eq("id", submissionId)
    .select("id, status, patient_id, organization_id, signed_snapshot")
    .maybeSingle();

  if (error) {
    logError({ action: "RECONCILE_TRANSITION_REJECTED", error: sanitizeError(error) });
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Illegal or blocked transition" } },
      { status: 409 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }

  let noteId: string | null = null;
  if (parsed.data.to === "signed") {
    noteId = await autoPopulateNote(supabase, context, data);
  }

  return NextResponse.json({ status: data.status, noteId });
}

// Reuse the existing note table (clinical_notes) -- best-effort. The model is
// SOAP + a single content blob (no discrete structured-section columns), so the
// structured sections render into `content` and pre-fill subjective/assessment.
// Failure here does NOT fail the (already-committed) sign.
async function autoPopulateNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: AuthContext,
  submission: { patient_id: string; organization_id: string; signed_snapshot: unknown },
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const draft = buildIntakeNoteDraft(submission.signed_snapshot);
    const { data, error } = await supabase
      .from("clinical_notes")
      .insert({
        patient_id: submission.patient_id,
        organization_id: submission.organization_id,
        provider_id: context.user.id,
        content: draft.content,
        subjective: draft.subjective,
        assessment: draft.assessment,
        status: "draft", // NEVER auto-finalized
      })
      .select("id")
      .maybeSingle();
    if (error || !data) {
      logError({ action: "RECONCILE_NOTE_AUTOPOP_FAILED", error: sanitizeError(error) });
      return null;
    }
    return data.id;
  } catch (err) {
    logError({ action: "RECONCILE_NOTE_AUTOPOP_ERROR", error: sanitizeError(err) });
    return null;
  }
}

export const POST = withAuth(handler, {
  requiredRole: ["USER", "ADMIN", "SUPER_ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
