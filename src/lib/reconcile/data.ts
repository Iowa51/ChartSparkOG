// Server data access for the reconciliation UI (Sprint 2 / P3, Part C). Uses the
// authenticated Supabase client -- RLS scopes every read to the caller's org.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  summarizeRows,
  rollupSummaries,
  readyToSign,
  type ReconcileRow,
  type ReconcileSummary,
} from "./reconcile";

// The three first-class coded domains that gate sign-readiness.
const FIRST_CLASS_DOMAINS = ["problems", "medications", "allergies"] as const;

/**
 * Mirror of the DB state-machine readiness gate (P3-CRIT-2), for a precise 409
 * instead of a generic transition error. Every first-class row must be resolved
 * (rejected OR accepted-and-coded) before `reconciled`/`signed`. The DB trigger is
 * the true enforcement point; this is a good-error pre-check only.
 */
export async function assertReconcileReady(
  supabase: SupabaseClient,
  submissionId: string,
): Promise<{ ready: boolean; message: string }> {
  const results = await Promise.all(
    FIRST_CLASS_DOMAINS.map((d) =>
      supabase
        .from(d)
        .select("id, reconciled, rejected, needs_coding")
        .eq("intake_submission_id", submissionId),
    ),
  );
  const rows: ReconcileRow[] = [];
  for (const res of results) {
    for (const r of (res.data ?? []) as Array<Record<string, unknown>>) {
      rows.push({
        id: String(r.id),
        reconciled: Boolean(r.reconciled),
        rejected: Boolean(r.rejected),
        needs_coding: Boolean(r.needs_coding),
      });
    }
  }
  return readyToSign(rows)
    ? { ready: true, message: "" }
    : {
        ready: false,
        message:
          "Every problem, medication, and allergy must be accepted-and-coded or rejected before this intake can be reconciled or signed",
      };
}

export interface QueueItem {
  id: string;
  status: string;
  submittedAt: string | null;
  patientName: string;
  templateName: string | null;
  counts: ReconcileSummary;
}

// Rows in the reconcile queue: submitted intakes awaiting or in provider review.
export async function getReconcileQueue(supabase: SupabaseClient): Promise<QueueItem[]> {
  const { data: subs, error } = await supabase
    .from("intake_submissions")
    .select("id, status, submitted_at, patients(first_name, last_name), intake_templates(name)")
    .in("status", ["patient_entered", "provider_review"])
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: true });
  if (error || !subs) return [];

  const ids = subs.map((s: { id: string }) => s.id);
  const countsBySubmission = await countsForSubmissions(supabase, ids);

  return subs.map((s: Record<string, unknown>) => {
    const patient = normalizeOne(s.patients) as { first_name?: string; last_name?: string } | null;
    const template = normalizeOne(s.intake_templates) as { name?: string } | null;
    return {
      id: s.id as string,
      status: s.status as string,
      submittedAt: (s.submitted_at as string | null) ?? null,
      patientName: patient
        ? `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()
        : "Unknown",
      templateName: template?.name ?? null,
      counts: countsBySubmission.get(s.id as string) ?? emptySummary(),
    };
  });
}

async function countsForSubmissions(
  supabase: SupabaseClient,
  submissionIds: string[],
): Promise<Map<string, ReconcileSummary>> {
  const result = new Map<string, ReconcileSummary>();
  if (submissionIds.length === 0) return result;

  const domains = ["problems", "medications", "allergies"] as const;
  const rowsByDomain = await Promise.all(
    domains.map((d) =>
      supabase
        .from(d)
        .select("intake_submission_id, reconciled, rejected, needs_coding")
        .in("intake_submission_id", submissionIds),
    ),
  );

  const bySubmission = new Map<string, ReconcileRow[]>();
  for (const res of rowsByDomain) {
    for (const row of (res.data ?? []) as Array<Record<string, unknown>>) {
      const sid = row.intake_submission_id as string;
      const list = bySubmission.get(sid) ?? [];
      list.push({
        id: "",
        reconciled: Boolean(row.reconciled),
        rejected: Boolean(row.rejected),
        needs_coding: Boolean(row.needs_coding),
      });
      bySubmission.set(sid, list);
    }
  }
  for (const sid of submissionIds) {
    result.set(sid, summarizeRows(bySubmission.get(sid) ?? []));
  }
  return result;
}

export interface DomainRowView extends Record<string, unknown> {
  id: string;
  reconciled?: boolean;
  rejected?: boolean;
  needs_coding?: boolean;
}

export interface SubmissionDetail {
  id: string;
  status: string;
  patientName: string;
  submittedAt: string | null;
  responses: Record<string, unknown>;
  problems: DomainRowView[];
  medications: DomainRowView[];
  allergies: DomainRowView[];
  familyHistory: DomainRowView[];
  immunizations: DomainRowView[];
  socialHistory: DomainRowView[];
  ros: DomainRowView[];
  rollup: ReconcileSummary;
}

export async function getSubmissionDetail(
  supabase: SupabaseClient,
  submissionId: string,
): Promise<SubmissionDetail | null> {
  const { data: submission, error } = await supabase
    .from("intake_submissions")
    .select("id, status, submitted_at, responses, patients(first_name, last_name)")
    .eq("id", submissionId)
    .maybeSingle();
  if (error || !submission) return null;

  const [problems, medications, allergies, familyHistory, immunizations, socialHistory, ros] =
    await Promise.all([
      fetchDomain(
        supabase,
        "problems",
        submissionId,
        "id, code, code_system, display, status, source, reconciled, rejected, needs_coding, reconciled_by",
      ),
      fetchDomain(
        supabase,
        "medications",
        submissionId,
        "id, rxnorm_code, name, strength, dose, source, reconciled, rejected, needs_coding, reconciled_by",
      ),
      fetchDomain(
        supabase,
        "allergies",
        submissionId,
        "id, allergen_code, allergen_display, reaction, severity, nkda, source, reconciled, rejected, needs_coding, reconciled_by",
      ),
      fetchDomain(
        supabase,
        "family_history",
        submissionId,
        "id, relative, condition_code, condition_display, source",
      ),
      fetchDomain(
        supabase,
        "immunizations",
        submissionId,
        "id, vaccine_code, vaccine_display, date, source",
      ),
      fetchDomain(
        supabase,
        "social_history",
        submissionId,
        "id, tobacco_status, pack_years, alcohol_audit_c, occupation, living_situation, source",
      ),
      fetchDomain(supabase, "ros_responses", submissionId, "id, system, finding"),
    ]);

  const patient = normalizeOne(submission.patients) as {
    first_name?: string;
    last_name?: string;
  } | null;
  const rollup = rollupSummaries(
    [problems, medications, allergies].map((rows) =>
      summarizeRows(
        rows.map((r) => ({
          id: r.id,
          reconciled: Boolean(r.reconciled),
          rejected: Boolean(r.rejected),
          needs_coding: Boolean(r.needs_coding),
        })),
      ),
    ),
  );

  return {
    id: submission.id,
    status: submission.status,
    submittedAt: submission.submitted_at ?? null,
    responses: (submission.responses as Record<string, unknown>) ?? {},
    patientName: patient
      ? `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()
      : "Unknown",
    problems,
    medications,
    allergies,
    familyHistory,
    immunizations,
    socialHistory,
    ros,
    rollup,
  };
}

async function fetchDomain(
  supabase: SupabaseClient,
  table: string,
  submissionId: string,
  columns: string,
): Promise<DomainRowView[]> {
  const { data } = await supabase
    .from(table)
    .select(columns)
    .eq("intake_submission_id", submissionId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as DomainRowView[];
}

// A Supabase to-one embed may arrive as an object or a single-element array.
function normalizeOne(value: unknown): unknown {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function emptySummary(): ReconcileSummary {
  return { total: 0, accepted: 0, rejected: 0, unreconciled: 0, codeless: 0 };
}
