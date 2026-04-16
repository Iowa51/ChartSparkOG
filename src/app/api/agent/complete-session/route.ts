import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logAuditEvent } from "@/lib/security/audit-log";
import { UUIDSchema, validateRequest } from "@/lib/validation/schemas";

const CompleteSessionSchema = z
  .object({
    patientId: UUIDSchema.optional(),
    encounterId: UUIDSchema.optional(),
    transcript: z.string().max(50000).optional().default(""),
    clinicianInput: z.string().max(20000).optional().default(""),
    selectedPhrases: z.record(z.string(), z.array(z.string().max(500))).optional().default({}),
    templateFormat: z.enum(["soap", "paragraph"]).optional().default("soap"),
  })
  .refine((data) => Boolean(data.patientId || data.encounterId), {
    message: "patientId or encounterId is required",
    path: ["patientId"],
  });

function buildDraft(body: z.infer<typeof CompleteSessionSchema>) {
  const phraseLines = Object.entries(body.selectedPhrases)
    .flatMap(([section, values]) => values.map((value) => `${section}: ${value}`))
    .join("\n");

  const combined = [body.transcript, body.clinicianInput, phraseLines].filter(Boolean).join("\n\n").trim();
  const summary = combined
    ? combined.split(/\s+/).slice(0, 80).join(" ")
    : "Session completed. Review and finalize the note draft.";

  if (body.templateFormat === "paragraph") {
    return {
      summary,
      noteDraft: combined || summary,
      sections: null,
    };
  }

  return {
    summary,
    noteDraft: combined || summary,
    sections: {
      subjective: body.transcript || "",
      objective: "",
      assessment: body.clinicianInput || "",
      plan: phraseLines || "",
    },
  };
}

async function handlePost(context: AuthContext) {
  if (process.env.SIDECAR_READY !== 'true') {
    return NextResponse.json(
      { error: "AI scribe unavailable in this environment.", code: "SIDECAR_NOT_READY" },
      { status: 503 },
    );
  }

  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const rawBody = await context.request.json();
    const validation = validateRequest(CompleteSessionSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const body = validation.data;

    if (body.patientId) {
      const canAccess = await canAccessPatient(context.user, body.patientId);
      if (!canAccess) {
        return NextResponse.json({ error: "Patient not found" }, { status: 403 });
      }
    }

    if (body.encounterId) {
      const supabase = await createClient();
      const { data: encounter } = await supabase
        .from("encounters")
        .select("id, organization_id, patient_id")
        .eq("id", body.encounterId)
        .single();

      if (!encounter || encounter.organization_id !== context.user.organizationId) {
        return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
      }
    }

    const result = buildDraft(body);

    await logAuditEvent({
      eventType: "ENCOUNTER_UPDATE",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId ?? undefined,
      ipAddress,
      userAgent,
      resourceType: "agent_session",
      resourceId: body.encounterId ?? body.patientId,
      details: {
        hasEncounter: Boolean(body.encounterId),
        hasPatient: Boolean(body.patientId),
        transcriptLength: body.transcript.length,
        clinicianInputLength: body.clinicianInput.length,
      },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({
      success: true,
      result,
      nextRoute: body.encounterId ? `/notes/new?encounterId=${body.encounterId}` : "/notes/new",
    });
  } catch (error) {
    logError({ action: "AGENT_COMPLETE_SESSION_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
