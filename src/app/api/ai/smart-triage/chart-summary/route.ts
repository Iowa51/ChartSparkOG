// src/app/api/ai/smart-triage/chart-summary/route.ts
// AI-powered clinical chart summary

import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import safeAzureOpenAI from "@/services/safeAzureOpenAI";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import {
  buildChartSummaryPrompt,
  getDemoChartSummaryResponse,
  PROMPT_VERSION,
} from "@/lib/ai/smart-triage-prompts";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { ChartSummarySchema, validateRequest } from "@/lib/validation/schemas";

async function handler(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const body = await context.request.json();

    // Validate input with Zod schema
    const validation = validateRequest(ChartSummarySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const { patient_id } = validation.data;

    const supabase = await createClient();

    // Check cache
    if (supabase) {
      const { data: cached } = await supabase
        .from("smart_triage_results")
        .select("*")
        .eq("patient_id", patient_id)
        .eq("triage_type", "chart_summary")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return NextResponse.json({
          result: cached.result_data,
          cached: true,
          created_at: cached.created_at,
        });
      }
    }

    // Gather patient data
    let demographics = "Unknown patient";
    let diagnoses: string[] = [];
    let medications: { name: string; dose: string; frequency: string }[] = [];
    let allergies: string[] = [];
    let clinicalNotes: string[] = [];
    let screeningScores: { instrument: string; scores: { date: string; score: number }[] }[] = [];
    let weightTrend: { date: string; weight: number }[] = [];
    let bpTrend: { date: string; systolic: number; diastolic: number }[] = [];

    if (supabase) {
      // Fire all four reads in parallel — they are independent lookups
      // keyed by the same patient_id and organization_id. Promise.allSettled
      // preserves the per-query tolerance the original try/catch blocks
      // provided for tables that may not exist yet (vitals / screening_scores).
      const [patientResult, notesResult, vitalsResult, scoresResult] = await Promise.allSettled([
        supabase
          .from("patients")
          .select("*")
          .eq("id", patient_id)
          .eq("organization_id", context.user.organizationId)
          .single(),
        // Recent notes — SEC-CODEX-2: scope to patient to prevent cross-patient PHI leak
        supabase
          .from("clinical_notes")
          .select("subjective, objective, assessment, plan, created_at")
          .eq("patient_id", patient_id)
          .eq("organization_id", context.user.organizationId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("vitals")
          .select("weight, weight_unit, bp_systolic, bp_diastolic, recorded_at")
          .eq("patient_id", patient_id)
          .eq("organization_id", context.user.organizationId)
          .order("recorded_at", { ascending: true })
          .limit(6),
        supabase
          .from("screening_scores")
          .select("instrument, total_score, administered_at")
          .eq("patient_id", patient_id)
          .eq("organization_id", context.user.organizationId)
          .order("administered_at", { ascending: true })
          .limit(30),
      ]);

      // Patient demographics
      if (patientResult.status === "fulfilled") {
        const patient = patientResult.value.data;
        if (patient) {
          let age = "";
          if (patient.date_of_birth) {
            const dob = new Date(patient.date_of_birth);
            const ageNum = Math.floor(
              (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
            );
            age = `${ageNum}-year-old`;
          }
          demographics =
            `${age} ${patient.gender || ""} ${patient.first_name} ${patient.last_name}`.trim();
        }
      }

      // Recent notes
      if (notesResult.status === "fulfilled") {
        const notes = notesResult.value.data;
        if (notes) {
          clinicalNotes = notes.map((n: Record<string, string>) =>
            [n.subjective, n.objective, n.assessment, n.plan].filter(Boolean).join("\n"),
          );
        }
      }

      // Vitals trend — tolerate missing table exactly as the original try/catch did
      if (vitalsResult.status === "fulfilled") {
        const vitals = vitalsResult.value.data;
        if (vitals) {
          weightTrend = vitals
            .filter((v: Record<string, unknown>) => v.weight)
            .map((v: Record<string, unknown>) => ({
              date: new Date(v.recorded_at as string).toLocaleDateString(),
              weight:
                v.weight_unit === "kg" ? (v.weight as number) * 2.20462 : (v.weight as number),
            }));

          bpTrend = vitals
            .filter((v: Record<string, unknown>) => v.bp_systolic && v.bp_diastolic)
            .map((v: Record<string, unknown>) => ({
              date: new Date(v.recorded_at as string).toLocaleDateString(),
              systolic: v.bp_systolic as number,
              diastolic: v.bp_diastolic as number,
            }));
        }
      }

      // Screening trends — tolerate missing table
      if (scoresResult.status === "fulfilled") {
        const scores = scoresResult.value.data;
        if (scores) {
          const grouped: Record<string, { date: string; score: number }[]> = {};
          for (const s of scores) {
            if (!grouped[s.instrument]) grouped[s.instrument] = [];
            grouped[s.instrument].push({
              date: new Date(s.administered_at).toLocaleDateString(),
              score: s.total_score,
            });
          }
          screeningScores = Object.entries(grouped).map(([instrument, scoresList]) => ({
            instrument,
            scores: scoresList.slice(-6), // last 6
          }));
        }
      }
    }

    // Build prompt and call AI
    const prompt = buildChartSummaryPrompt({
      demographics,
      diagnoses,
      medications,
      allergies,
      clinicalNotes,
      screeningScores,
      labHistory: [],
      weightTrend,
      bpTrend,
    });

    let result;
    let isDemo = false;

    if (safeAzureOpenAI.isAvailable() && clinicalNotes.length > 0) {
      try {
        const response = await safeAzureOpenAI.chat(prompt, []);
        result = JSON.parse(response);
      } catch {
        result = getDemoChartSummaryResponse();
        isDemo = true;
      }
    } else {
      result = getDemoChartSummaryResponse();
      isDemo = true;
    }

    // Cache
    if (supabase) {
      await supabase.from("smart_triage_results").insert({
        organization_id: context.user.organizationId,
        patient_id,
        triage_type: "chart_summary",
        result_data: result,
        alerts_count: result.visit_alerts?.length || 0,
        critical_alerts_count:
          result.visit_alerts?.filter((a: { urgency: string }) => a.urgency === "high").length || 0,
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
      details: { action: "CHART_SUMMARY", isDemo },
      phiAccessed: true,
      riskLevel: "MEDIUM",
    });

    return NextResponse.json({ result, isDemo, cached: false });
  } catch (error) {
    logError({ action: "CHART_SUMMARY_ERROR", error: sanitizeError(error) });
    return NextResponse.json({
      result: getDemoChartSummaryResponse(),
      isDemo: true,
      cached: false,
    });
  }
}

export const POST = withAuth(handler, {
  requiredRole: ["USER", "ADMIN", "SUPER_ADMIN"],
  requireOrganization: true,
  requireMFA: true,
});
