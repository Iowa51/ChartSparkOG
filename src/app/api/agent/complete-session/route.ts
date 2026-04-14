// Agent orchestrator integration — ends a clinical session through the agent pipeline.
// Base: develop's orchestrator forwarding. Hardening grafted from main: server-side
// sidecar gate, Zod input validation, encounter-ownership + patient-access checks,
// and PHI audit logging.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { getAgentMode } from "@/lib/agent/subscription-gate";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logAuditEvent } from "@/lib/security/audit-log";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

const CompleteSessionSchema = z.object({
  sessionId: UUIDSchema,
  patientId: UUIDSchema.optional(),
  clinicianInput: z.string().max(20000).optional(),
  noteFormat: z.string().max(50).optional(),
  sessionType: z.string().max(50).optional(),
  duration: z.number().int().min(0).max(1440).optional(),
  payerType: z.string().max(50).optional(),
});

async function handler(context: AuthContext) {
  const { user } = context;

  if (!user.organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Server-side sidecar gate (defense in depth — the client also gates on NEXT_PUBLIC_SIDECAR_READY)
  if (process.env.SIDECAR_READY !== "true") {
    return NextResponse.json(
      { error: "AI scribe unavailable in this environment.", code: "SIDECAR_NOT_READY" },
      { status: 503 },
    );
  }

  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  let rawBody: unknown;
  try {
    rawBody = await context.request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validation = validateRequest(CompleteSessionSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }

  const { sessionId, patientId, clinicianInput, noteFormat, sessionType, duration, payerType } =
    validation.data;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Database unavailable", fallback: true },
      { status: 503 },
    );
  }

  // Authorization: confirm the encounter belongs to the caller's org before forwarding PHI
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id, organization_id, patient_id")
    .eq("id", sessionId)
    .single();

  if (!encounter || encounter.organization_id !== user.organizationId) {
    return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  // If a patientId was supplied, confirm the caller may access that patient
  if (patientId) {
    const canAccess = await canAccessPatient(user, patientId);
    if (!canAccess) {
      return NextResponse.json({ error: "Patient not found" }, { status: 403 });
    }
  }

  // Look up organization subscription tier (server-side gate — never trust client)
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", user.organizationId)
    .single();

  if (orgError || !org) {
    logError({ action: "agent_complete_session_org_lookup", error: sanitizeError(orgError) });
    return NextResponse.json(
      { success: false, error: "Organization lookup failed", fallback: true },
      { status: 500 },
    );
  }

  const mode = getAgentMode(org.subscription_tier ?? "starter");

  // Forward to agent-orchestrator
  const orchestratorUrl = process.env.AGENT_ORCHESTRATOR_URL ?? "http://localhost:3300";
  let orchestratorResult: Record<string, unknown>;

  try {
    const orchestratorBody = {
      sessionId,
      clinicianId: user.id,
      patientId: patientId ?? "",
      inputMode: "text",
      clinicianInput: clinicianInput ?? "",
      noteFormat: noteFormat ?? "SOAP",
      sessionType: sessionType ?? "individual",
      duration: duration ?? 60,
      payerType: payerType ?? "commercial",
      mode,
    };

    const resp = await fetch(`${orchestratorUrl}/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orchestratorBody),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Orchestrator returned ${resp.status}: ${text}`);
    }

    orchestratorResult = (await resp.json()) as Record<string, unknown>;
  } catch (err) {
    logError({ action: "agent_complete_session_orchestrator_error", error: sanitizeError(err) });
    // NEVER block the clinician — return fallback flag so UI stays functional
    return NextResponse.json({
      success: false,
      error: "Agent service unavailable",
      fallback: true,
    });
  }

  // Extract note sections from OrchestrationResult nested structure
  // OrchestrationResult: { documentation: AgentResult, billing: AgentResult|null, quality: AgentResult|null }
  // AgentResult.output contains the typed output for each agent

  type DocOutput = {
    note?: string;
    icd10Codes?: { code: string; description: string; isPrimary: boolean }[];
    cptCode?: { code: string; description: string; confidence: number };
    fhirDocument?: Record<string, unknown>;
    validationResult?: { isValid: boolean; issues: string[]; score: number };
  };
  type BillingOutput = {
    finalCptCode?: string;
    finalIcd10Codes?: { code: string }[];
    medicalNecessityFlags?: string[];
    authRequirement?: { required: boolean };
    reimbursementEstimate?: { estimatedAmount: number };
    invalidIcd10CodesRemoved?: string[];
    escalationReason?: string;
  };
  type QualityOutput = {
    scores?: { overall: number };
    flags?: string[];
    requiresSupervisorReview?: boolean;
    recommendations?: string[];
  };

  const docAgent = orchestratorResult.documentation as {
    output: DocOutput;
    confidence: number;
  } | null;
  const billingAgent = orchestratorResult.billing as {
    output: BillingOutput;
    confidence: number;
  } | null;
  const qualityAgent = orchestratorResult.quality as {
    output: QualityOutput;
    confidence: number;
  } | null;

  const docOut = docAgent?.output ?? {};
  const billingOut = billingAgent?.output ?? {};
  const qualityOut = qualityAgent?.output ?? {};

  const note = docOut.note;
  // Parse note into SOAP sections if possible
  const noteText = note ?? "";
  const subjMatch = noteText.match(
    /\*?\*?SUBJECTIVE\*?\*?\s*([\s\S]*?)(?=\*?\*?OBJECTIVE|\*?\*?ASSESSMENT|\*?\*?PLAN|$)/i,
  );
  const objMatch = noteText.match(
    /\*?\*?OBJECTIVE\*?\*?\s*([\s\S]*?)(?=\*?\*?ASSESSMENT|\*?\*?PLAN|$)/i,
  );
  const assMatch = noteText.match(/\*?\*?ASSESSMENT\*?\*?\s*([\s\S]*?)(?=\*?\*?PLAN|$)/i);
  const planMatch = noteText.match(/\*?\*?PLAN\*?\*?\s*([\s\S]*?)$/i);

  const subjective = (subjMatch?.[1] ?? "").trim();
  const objective = (objMatch?.[1] ?? "").trim();
  const assessment = (assMatch?.[1] ?? "").trim();
  const plan = (planMatch?.[1] ?? "").trim();

  const cptCode = (billingOut.finalCptCode ?? docOut.cptCode?.code) as string | undefined;
  const icd10Codes = (billingOut.finalIcd10Codes?.map((c) => c.code) ??
    docOut.icd10Codes?.map((c) => c.code)) as string[] | undefined;

  const qualityScore = qualityOut.scores?.overall;
  const confidence = orchestratorResult.overallConfidence as number | undefined;
  const requiresReview = qualityOut.requiresSupervisorReview;
  const flags = (qualityOut.flags ?? billingOut.medicalNecessityFlags) as string[] | undefined;
  const reimbursementEstimate = billingOut.reimbursementEstimate?.estimatedAmount as
    | number
    | undefined;

  const billingResult = billingAgent
    ? {
        finalCptCode: billingOut.finalCptCode ?? "",
        issuesFound: billingOut.medicalNecessityFlags ?? [],
        issuesFixed: billingOut.invalidIcd10CodesRemoved ?? [],
        authRequired: billingOut.authRequirement?.required ?? false,
        estimatedReimbursement: billingOut.reimbursementEstimate?.estimatedAmount ?? 0,
      }
    : undefined;

  // Update clinical_notes for this encounter
  try {
    const { data: existingNote } = await supabase
      .from("clinical_notes")
      .select("id")
      .eq("encounter_id", sessionId)
      .eq("organization_id", user.organizationId)
      .maybeSingle();

    if (existingNote) {
      await supabase
        .from("clinical_notes")
        .update({
          subjective: subjective || note,
          objective,
          assessment,
          plan,
          content: note,
          status: "pending_review",
        })
        .eq("id", existingNote.id);
    } else {
      await supabase.from("clinical_notes").insert({
        encounter_id: sessionId,
        organization_id: user.organizationId,
        provider_id: user.id,
        subjective: subjective || note,
        objective,
        assessment,
        plan,
        content: note,
        status: "pending_review",
      });
    }
  } catch (err) {
    // Log but don't fail — note update failure should not block clinician
    logError({ action: "agent_complete_session_note_update", error: sanitizeError(err) });
  }

  // Update encounter status to completed
  try {
    await supabase
      .from("encounters")
      .update({ status: "completed" })
      .eq("id", sessionId)
      .eq("organization_id", user.organizationId);
  } catch (err) {
    logError({ action: "agent_complete_session_encounter_update", error: sanitizeError(err) });
  }

  // For full_pipeline mode: create audit_flags record if agent flagged issues
  if (mode === "full_pipeline" && flags && flags.length > 0) {
    try {
      await supabase.from("audit_flags").insert({
        organization_id: user.organizationId,
        encounter_id: sessionId,
        flag_type: "agent_review",
        severity: requiresReview ? "high" : "medium",
        description: flags.join("; "),
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      logError({ action: "agent_complete_session_audit_flag", error: sanitizeError(err) });
    }
  }

  // PHI audit trail: the agent pipeline processed clinical data for this encounter
  await logAuditEvent({
    eventType: "ENCOUNTER_UPDATE",
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    organizationId: user.organizationId,
    ipAddress,
    userAgent,
    resourceType: "agent_session",
    resourceId: sessionId,
    details: {
      mode,
      hasPatient: Boolean(patientId),
      clinicianInputLength: (clinicianInput ?? "").length,
    },
    phiAccessed: true,
    riskLevel: "MEDIUM",
  });

  if (mode === "documentation_only") {
    return NextResponse.json({
      success: true,
      mode,
      note,
      cptCode,
      icd10Codes,
      qualityScore,
      confidence,
      flags,
    });
  }

  // full_pipeline
  return NextResponse.json({
    success: true,
    mode,
    note,
    cptCode,
    icd10Codes,
    qualityScore,
    confidence,
    flags,
    billingResult,
    reimbursementEstimate,
    requiresReview,
  });
}

export const POST = withAuth(handler, {
  requiredRole: ["USER", "ADMIN", "SUPER_ADMIN"],
  requireMFA: true,
  requireOrganization: true,
});
