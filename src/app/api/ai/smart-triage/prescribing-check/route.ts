// src/app/api/ai/smart-triage/prescribing-check/route.ts
// Real-time prescribing interaction check

import { NextResponse } from "next/server";
import { withAuth, AuthContext, canAccessPatient } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import safeAzureOpenAI from "@/services/safeAzureOpenAI";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { buildMedicationTriagePrompt, PROMPT_VERSION } from "@/lib/ai/smart-triage-prompts";
import { getSafetyLevel, type PrescribingCheckResult } from "@/lib/types/smart-triage";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { PrescribingCheckSchema, validateRequest } from "@/lib/validation/schemas";

async function handler(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const body = await context.request.json();

    // Validate input with Zod schema
    const validation = validateRequest(PrescribingCheckSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const { patient_id, new_medication, dose, frequency } = validation.data;

    // SEC: verify caller has access to this patient in their org before any PHI read
    const canAccess = await canAccessPatient(context.user, patient_id);
    if (!canAccess) {
      return NextResponse.json({ error: "Patient not found" }, { status: 403 });
    }

    const supabase = await createClient();

    // Gather current medications
    let medications: { name: string; dose: string; frequency: string }[] = [];
    let patientAge = 35;
    let patientSex = "Unknown";

    if (supabase) {
      // Patient demographics + active medications in parallel.
      // Promise.allSettled preserves tolerance for patient_medications
      // which may not exist on older schemas.
      const [patientResult, medsResult] = await Promise.allSettled([
        supabase
          .from("patients")
          .select("date_of_birth, gender")
          .eq("id", patient_id)
          .eq("organization_id", context.user.organizationId!)
          .single(),
        // patient_medications has no organization_id column; enforce org scope via patients join
        supabase
          .from("patient_medications")
          .select("medication, dosage, frequency, patients!inner(organization_id)")
          .eq("patient_id", patient_id)
          .eq("patients.organization_id", context.user.organizationId!)
          .eq("status", "active"),
      ]);

      if (patientResult.status === "fulfilled") {
        const patient = patientResult.value.data;
        if (patient) {
          patientSex = patient.gender || "Unknown";
          if (patient.date_of_birth) {
            const dob = new Date(patient.date_of_birth);
            patientAge = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          }
        }
      }

      if (medsResult.status === "fulfilled") {
        const meds = medsResult.value.data;
        if (meds) {
          medications = meds.map((m: Record<string, string>) => ({
            name: m.medication,
            dose: m.dosage || "",
            frequency: m.frequency || "",
          }));
        }
      }
    }

    // Build prompt with new medication
    const prompt = buildMedicationTriagePrompt({
      age: patientAge,
      sex: patientSex,
      diagnoses: [],
      allergies: [],
      medications,
      newMedication: { name: new_medication, dose: dose || "", frequency: frequency || "" },
    });

    let result: PrescribingCheckResult;
    let isDemo = false;

    if (safeAzureOpenAI.isAvailable() && medications.length > 0) {
      try {
        const response = await safeAzureOpenAI.chat(prompt, []);
        const parsed = JSON.parse(response);
        const score = parsed.overall_safety_score || 85;

        result = {
          new_medication,
          dose: dose || "",
          overall_risk: getSafetyLevel(score),
          interactions: parsed.drug_drug_interactions || [],
          dosing_guidance: parsed.clinical_pearls?.[0] || "No specific dosing concerns identified.",
          alternatives: parsed.drug_drug_interactions?.[0]?.alternative_suggestions || [],
          requires_acknowledgment: score < 70,
          summary: parsed.summary || "No significant interactions found with current medications.",
        };
      } catch {
        result = getDemoPrescribingCheckResponse(new_medication, dose);
        isDemo = true;
      }
    } else {
      result = getDemoPrescribingCheckResponse(new_medication, dose);
      isDemo = true;
    }

    // Cache
    if (supabase) {
      await supabase.from("smart_triage_results").insert({
        organization_id: context.user.organizationId,
        patient_id,
        triage_type: "prescribing_check",
        safety_score:
          result.overall_risk === "green"
            ? 90
            : result.overall_risk === "yellow"
              ? 75
              : result.overall_risk === "red"
                ? 55
                : 25,
        result_data: result,
        alerts_count: result.interactions.length,
        critical_alerts_count: result.interactions.filter(
          (i) => i.severity === "critical" || i.severity === "high",
        ).length,
        ai_model: isDemo ? "demo" : "gpt-4o",
        ai_prompt_version: PROMPT_VERSION,
      });
    }

    await logAuditEvent({
      eventType: "NOTE_VIEW",
      userId: context.user.id,
      userEmail: context.user.email,
      userRole: context.user.role,
      organizationId: context.user.organizationId || undefined,
      ipAddress,
      userAgent,
      resourceType: "smart_triage",
      details: {
        action: "PRESCRIBING_CHECK",
        patient_id,
        new_medication,
        dose,
        risk_level: result.overall_risk,
        requires_ack: result.requires_acknowledgment,
        isDemo,
      },
      phiAccessed: true,
      riskLevel: result.requires_acknowledgment ? "HIGH" : "MEDIUM",
    });

    return NextResponse.json({ result, isDemo });
  } catch (error) {
    logError({ action: "ERROR_IN_PRESCRIBING_CHECK", error: sanitizeError(error) });
    return NextResponse.json({
      result: getDemoPrescribingCheckResponse("Unknown", ""),
      isDemo: true,
    });
  }
}

function getDemoPrescribingCheckResponse(medication: string, dose: string): PrescribingCheckResult {
  return {
    new_medication: medication,
    dose: dose || "as prescribed",
    overall_risk: "yellow",
    interactions: [
      {
        med_a: medication,
        med_b: "Sertraline 100mg",
        severity: "moderate",
        mechanism: "Potential pharmacokinetic interaction via CYP2D6 pathway",
        clinical_significance: "May require dose adjustment or enhanced monitoring",
        recommended_action: "Monitor for increased side effects. Consider lower starting dose.",
        alternative_suggestions: ["Alternative medication with fewer CYP interactions"],
      },
    ],
    dosing_guidance: `Start ${medication} at lowest effective dose. Titrate slowly with concurrent psychotropic medications.`,
    alternatives: [],
    requires_acknowledgment: false,
    summary: `${medication} has a moderate interaction potential with current medications. Standard monitoring recommended.`,
  };
}

export const POST = withAuth(handler, {
  requiredRole: ["USER", "ADMIN", "SUPER_ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
