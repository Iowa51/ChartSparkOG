// Typed fetch client for the OG-side /api/assessments/* routes.
// Browser-only. All calls go through OG's server-proxy routes; the sidecar
// is never contacted directly from the client. RenderProjection responses are
// memoized in a per-session Map (catalog data is public-domain and stable).

"use client";

import type {
  AdministerInput,
  Assignment,
  AssessmentResponses,
  AssessmentResult,
  AssessmentSummary,
  AssessmentWithResult,
  CreateAssignmentInput,
  RenderProjection,
  TrendPoint,
} from "./types";

const scaleCache = new Map<string, RenderProjection>();

class AssessmentsApiError extends Error {
  status: number;
  fallback: boolean;
  constructor(message: string, status: number, fallback = false) {
    super(message);
    this.name = "AssessmentsApiError";
    this.status = status;
    this.fallback = fallback;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    credentials: "same-origin",
  });

  const contentType = resp.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body: unknown = isJson ? await resp.json().catch(() => null) : null;

  if (!resp.ok) {
    const errMsg =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${resp.status}`;
    const fallback =
      body && typeof body === "object" && body !== null && "fallback" in body
        ? Boolean((body as { fallback: unknown }).fallback)
        : false;
    throw new AssessmentsApiError(errMsg, resp.status, fallback);
  }

  return body as T;
}

export async function getScale(scaleId: string): Promise<RenderProjection> {
  const cached = scaleCache.get(scaleId);
  if (cached) return cached;
  const projection = await request<RenderProjection>(
    `/api/assessments/scales/${encodeURIComponent(scaleId)}`,
  );
  scaleCache.set(scaleId, projection);
  return projection;
}

/** Test-only escape hatch; not part of the public surface. */
export function _clearScaleCache(): void {
  scaleCache.clear();
}

export interface PatientAssessmentsOptions {
  limit?: number;
  scaleId?: string;
  status?: "pending" | "completed" | "expired";
}

export async function getPatientAssessments(
  patientId: string,
  options?: PatientAssessmentsOptions,
): Promise<AssessmentSummary[]> {
  const qs = new URLSearchParams();
  if (options?.limit) qs.set("limit", String(options.limit));
  if (options?.scaleId) qs.set("scale_id", options.scaleId);
  if (options?.status) qs.set("status", options.status);
  const search = qs.toString();
  const path = `/api/assessments/patient/${encodeURIComponent(patientId)}${
    search ? `?${search}` : ""
  }`;
  const data = await request<{ assessments?: AssessmentSummary[] } | AssessmentSummary[]>(path);
  if (Array.isArray(data)) return data;
  return data.assessments ?? [];
}

export async function getAssessmentTrend(
  patientId: string,
  scaleId: string,
): Promise<TrendPoint[]> {
  const data = await request<{ points?: TrendPoint[] } | TrendPoint[]>(
    `/api/assessments/patient/${encodeURIComponent(patientId)}/trend/${encodeURIComponent(scaleId)}`,
  );
  if (Array.isArray(data)) return data;
  return data.points ?? [];
}

export async function administerAssessment(input: AdministerInput): Promise<{ id: string }> {
  return request<{ id: string }>("/api/assessments/administer", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeAssessment(
  administrationId: string,
  responses: AssessmentResponses,
  completedAt?: string,
): Promise<AssessmentResult> {
  return request<AssessmentResult>(
    `/api/assessments/administer/${encodeURIComponent(administrationId)}/complete`,
    {
      method: "POST",
      body: JSON.stringify({
        responses,
        ...(completedAt ? { completed_at: completedAt } : {}),
      }),
    },
  );
}

export async function getAssessment(administrationId: string): Promise<AssessmentWithResult> {
  return request<AssessmentWithResult>(
    `/api/assessments/administer/${encodeURIComponent(administrationId)}`,
  );
}

export interface AssignmentsListOptions {
  status?: "pending" | "completed" | "expired" | "cancelled";
  limit?: number;
}

export async function getAssignments(
  patientId: string,
  options?: AssignmentsListOptions,
): Promise<Assignment[]> {
  const qs = new URLSearchParams({ patient_id: patientId });
  if (options?.status) qs.set("status", options.status);
  if (options?.limit) qs.set("limit", String(options.limit));
  const data = await request<{ assignments?: Assignment[] } | Assignment[]>(
    `/api/assessments/assignments?${qs.toString()}`,
  );
  if (Array.isArray(data)) return data;
  return data.assignments ?? [];
}

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  return request<Assignment>("/api/assessments/assignments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteAssignment(assignmentId: string): Promise<{ success: true }> {
  return request<{ success: true }>(
    `/api/assessments/assignments/${encodeURIComponent(assignmentId)}`,
    { method: "DELETE" },
  );
}

export { AssessmentsApiError };
