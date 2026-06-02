// Shared type definitions for the AssessmentsTab UI and its data access layer.
// These match the chartspark-assessments sidecar's render-only projection
// contract — keep in sync if the sidecar projection shape changes.

export type ResponseShape = "flat-likert" | "cssrs";

export interface ScaleResponseOption {
  value: number;
  label: string;
}

export interface ScaleItem {
  id: string;
  text: string;
  /** Most items map to projection.options; some (e.g., C-SSRS item6) have their own option set. */
  options?: ScaleResponseOption[];
  /** Free-text hint shown below the item, when present. */
  helpText?: string;
  /** Index of a parent item that must be answered "yes" before this one is shown. */
  parentItemId?: string;
}

export interface CssrsBehaviorTimeframe {
  options: Array<{ value: string; label: string }>;
  /** When true, an answer here is required if the underlying item is answered "yes". */
  requiredWhenAnswered: boolean;
}

export interface CssrsStructuredItems {
  item6BehaviorTimeframe: CssrsBehaviorTimeframe;
}

export interface RenderProjection {
  scaleId: string;
  name: string;
  shortName?: string;
  description?: string;
  responseShape: ResponseShape;
  /** Shared options array for flat-likert scales (PHQ-9, GAD-7, etc). */
  options?: ScaleResponseOption[];
  items: ScaleItem[];
  /** Only present when responseShape === 'cssrs'. */
  structuredItems?: CssrsStructuredItems;
  /** Optional UI hint about which CPT code maps to this scale. */
  cptCodeHint?: string;
}

// =========================================================================
// Administration + result shapes
// =========================================================================

export type AdministrationStatus = "pending" | "in_progress" | "completed" | "expired";

export interface AssessmentSummary {
  id: string;
  patient_id: string;
  scale_id: string;
  scale_name?: string;
  status: AdministrationStatus;
  administered_at?: string;
  completed_at?: string | null;
  delivery_method?: string;
  total_score?: number | null;
  severity?: string | null;
  severity_code?: string | null;
  flags?: string[];
}

export interface AssessmentResult {
  administration_id: string;
  scale_id: string;
  scale_name?: string;
  total_score: number;
  severity: string;
  severity_code: string;
  flags: string[];
  narrative?: string | null;
  completed_at: string;
  /** Per-item scores, optional. */
  item_scores?: Record<string, number>;
}

export interface AssessmentWithResult extends AssessmentSummary {
  result?: AssessmentResult | null;
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
// Trend
// =========================================================================

export interface TrendPoint {
  administration_id: string;
  completed_at: string;
  total_score: number;
  severity: string;
  severity_code: string;
}

// =========================================================================
// Assignments
// =========================================================================

export type AssignmentStatus = "pending" | "completed" | "expired" | "cancelled";

export interface Assignment {
  id: string;
  patient_id: string;
  scale_id: string;
  scale_name?: string;
  status: AssignmentStatus;
  due_date?: string | null;
  recurring?: {
    interval: "daily" | "weekly" | "biweekly" | "monthly";
    count?: number;
  } | null;
  created_at: string;
  notes?: string | null;
}

export interface CreateAssignmentInput {
  patient_id: string;
  scale_id: string;
  due_date?: string;
  recurring?: {
    interval: "daily" | "weekly" | "biweekly" | "monthly";
    count?: number;
  };
  notes?: string;
}

// =========================================================================
// Administer input
// =========================================================================

export interface AdministerInput {
  patient_id: string;
  scale_id: string;
  delivery_method?: "in_office" | "self_report" | "remote" | "paper";
  encounter_id?: string;
  notes?: string;
}
