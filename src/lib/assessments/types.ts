// Shared type definitions for the AssessmentsTab UI and its data access layer.
// These mirror the chartspark-assessments sidecar's ACTUAL payload shapes
// (render projection, administration/result rows, assignment rows). OG
// conforms to the sidecar — keep in sync with the sidecar
// (src/lib/scale-registry.ts, src/api/assessments.ts). See
// planning/ASSESSMENTS-CONTRACT.md.

export type ResponseShape = "flat-likert" | "cssrs";

export type ScaleType = "self-report" | "clinician" | "self/clinician";

export interface ScaleResponseOption {
  value: number;
  label: string;
}

export interface ScaleItem {
  id: string;
  text: string;
  /** The sidecar emits per-item options on every item; optional here because
   *  ScaleForm also accepts a shared top-level `options` fallback. */
  options?: ScaleResponseOption[];
  /** UI-only hints the sidecar does not currently emit, but ScaleForm renders
   *  when present. Kept optional so future projection fields don't break OG. */
  helpText?: string;
  parentItemId?: string;
}

export interface SeverityCutoff {
  min: number;
  max: number;
  label: string;
  code: string;
}

export interface CssrsBehaviorTimeframe {
  appliesTo?: "item6";
  /** When true, an answer here is required if item 6 is answered "yes". */
  requiredWhenAnswered: boolean;
  options: Array<{ value: string; label: string }>;
}

export interface CssrsStructuredItems {
  perItemFields?: readonly string[];
  item6BehaviorTimeframe: CssrsBehaviorTimeframe;
}

// Render-only scale projection — the sidecar `GET /scales/:id` shape. The
// top-level key is `id` (NOT `scaleId`). scoringFn/narrative/specialRules
// never cross the wire.
export interface RenderProjection {
  id: string;
  name: string;
  fullName?: string;
  description?: string;
  timeFrame?: string;
  type?: ScaleType;
  scoringRange?: [number, number];
  items: ScaleItem[];
  cutoffs?: SeverityCutoff[];
  publicDomain?: boolean;
  responseShape: ResponseShape;
  /** Shared options for flat-likert scales — ScaleForm fallback when an item
   *  omits its own options. */
  options?: ScaleResponseOption[];
  /** Present only when responseShape === 'cssrs'. */
  structuredItems?: CssrsStructuredItems;
}

// =========================================================================
// Administration + result shapes
// =========================================================================

export type AdministrationStatus = "pending" | "in_progress" | "completed" | "abandoned";

// Compact per-row result summary on the patient-assessments list. The list
// deliberately exposes derived metadata ONLY — `severity_code` (no human
// `severity` label) and `has_safety_flags` (no raw flag strings). Full flags
// and narrative require the detail endpoint (`getAssessment`).
export interface AssessmentResultSummary {
  total_score: number;
  severity_code: string;
  has_safety_flags: boolean;
}

// One row from `GET /api/assessments/patient/[id]` → `{ administrations: [...] }`.
export interface AssessmentSummary {
  id: string;
  scale_id: string;
  status: AdministrationStatus;
  delivery_method?: string;
  administered_at?: string;
  completed_at?: string | null;
  result_summary?: AssessmentResultSummary | null;
}

// Response of `POST /api/assessments/administer/[id]/complete` (compact).
export interface AssessmentResult {
  result_id: string;
  severity: string;
  severity_code: string;
  flags: string[];
  interpretation: string;
}

// Nested result on the detail endpoint.
export interface AssessmentDetailResult {
  id: string;
  total_score: number;
  sub_scores?: Record<string, number> | null;
  severity: string;
  severity_code: string;
  flags: string[];
  interpretation: string | null;
  narrative: string | null;
  scored_at: string;
}

// Full detail row from `GET /api/assessments/administer/[id]`.
export interface AssessmentWithResult {
  id: string;
  scale_id: string;
  org_id: string;
  patient_id: string;
  administered_by: string | null;
  administered_at: string;
  delivery_method: string;
  status: AdministrationStatus;
  completed_at: string | null;
  responses: unknown;
  result: AssessmentDetailResult | null;
}

// =========================================================================
// Responses (inputs to /complete)
// =========================================================================

export type FlatLikertResponses = Record<string, number>;

export interface CssrsItemResponse {
  answered: boolean;
  lifetime?: boolean;
  pastMonth?: boolean;
  behaviorTimeframe?: string;
}

export type CssrsResponses = Record<string, CssrsItemResponse>;

export type AssessmentResponses = FlatLikertResponses | CssrsResponses;

// =========================================================================
// Trend — one row of the sidecar `GET .../trend/:scaleId` response, which is
// `{ patient_id, scale_id, from, to, count, results: TrendPoint[] }`.
// =========================================================================

export interface TrendPoint {
  scored_at: string;
  total_score: number;
  severity_code: string;
  flags: string[];
}

// =========================================================================
// Assignments — sidecar row shape (`GET`/`POST` /api/assessments/assignments)
// =========================================================================

export type AssignmentRecurring = "weekly" | "biweekly" | "monthly";

export interface Assignment {
  id: string;
  patient_id: string;
  scale_id: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  recurring: AssignmentRecurring | null;
  completed: boolean;
  administration_id: string | null;
}

export interface CreateAssignmentInput {
  patient_id: string;
  scale_id: string;
  /** Day precision: YYYY-MM-DD. */
  due_date?: string;
  recurring?: AssignmentRecurring;
}

// =========================================================================
// Administer input (`POST` /api/assessments/administer)
// =========================================================================

export interface AdministerInput {
  patient_id: string;
  scale_id: string;
  delivery_method?: "clinician" | "portal_self" | "portal_assigned";
  encounter_id?: string;
  notes?: string;
}
