// Sprint 2 / P3 (Part C) -- per-row reconciliation actions.
//   accept -> reconciled=true + provider attribution (reconciled_by/at); source
//             stays 'patient' (Guardrail 5). A code-less row must carry a code.
//   reject -> rejected=true soft-flag (kept for audit, excluded from snapshot).
// Codes come from the same coded-search components the patient used. First-class
// domains only (problems/medications/allergies). RECONCILE_V1-gated.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthContext } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { isReconcileV1Enabled } from "@/lib/config/environment";
import { validateRequest } from "@/lib/validation/schemas";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";

const RowSchema = z
  .object({
    domain: z.enum(["problems", "medications", "allergies"]),
    row_id: z.string().uuid(),
    action: z.enum(["accept", "reject"]),
    coded: z
      .object({
        code: z.string().max(64).nullable(),
        display: z.string().max(500),
        system: z.string().max(32),
      })
      .optional(),
  })
  .strict();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Map a coded value to the domain table's code columns (for an accept-with-edit).
function codeColumns(
  domain: string,
  coded: { code: string | null; display: string; system: string },
) {
  switch (domain) {
    case "problems":
      return {
        code_system: coded.system === "snomed" ? "snomed" : "icd10",
        code: coded.code ?? "",
        display: coded.display,
      };
    case "medications":
      return { rxnorm_code: coded.code, name: coded.display };
    case "allergies":
      return { allergen_code: coded.code, allergen_display: coded.display };
    default:
      return {};
  }
}

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
  const parsed = validateRequest(RowSchema, body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid action" } },
      { status: 422 },
    );
  }
  const { domain, row_id, action, coded } = parsed.data;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" } },
      { status: 503 },
    );
  }

  // Phase guard (P3-MED-5): rows may only be reconciled while the parent submission
  // is in provider_review AND has actually been submitted. Outside that window
  // (patient_entered, reconciled, signed) the action is rejected.
  const { data: parent, error: parentErr } = await supabase
    .from("intake_submissions")
    .select("status, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();
  if (parentErr) {
    logError({ action: "RECONCILE_ROW_PARENT_LOOKUP_ERROR", error: sanitizeError(parentErr) });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed" } },
      { status: 500 },
    );
  }
  if (!parent) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }
  if (parent.status !== "provider_review" || !parent.submitted_at) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Reconciliation is only allowed while the intake is in provider review",
        },
      },
      { status: 409 },
    );
  }

  // The row must belong to THIS submission (and, via RLS, the caller's org).
  const { data: existing, error: lookupErr } = await supabase
    .from(domain)
    .select("id, needs_coding")
    .eq("id", row_id)
    .eq("intake_submission_id", submissionId)
    .maybeSingle();
  if (lookupErr) {
    logError({ action: "RECONCILE_ROW_LOOKUP_ERROR", error: sanitizeError(lookupErr) });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed" } },
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }

  let updates: Record<string, unknown>;
  if (action === "reject") {
    updates = { rejected: true };
  } else {
    // accept (optionally with an edit that resolves the code)
    if (existing.needs_coding && !coded?.code) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "This item needs a code before it can be accepted",
          },
        },
        { status: 422 },
      );
    }
    updates = {
      reconciled: true,
      reconciled_by: context.user.id,
      reconciled_at: new Date().toISOString(),
      rejected: false,
      ...(coded ? { ...codeColumns(domain, coded), needs_coding: coded.code === null } : {}),
    };
  }

  const { data, error } = await supabase
    .from(domain)
    .update(updates)
    .eq("id", row_id)
    .eq("intake_submission_id", submissionId)
    .select("id")
    .maybeSingle();

  if (error) {
    logError({ action: "RECONCILE_ROW_UPDATE_REJECTED", error: sanitizeError(error) });
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Row is locked or update was blocked" } },
      { status: 409 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ id: data.id, action });
}

export const POST = withAuth(handler, {
  requiredRole: ["USER", "ADMIN", "SUPER_ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
