export type AgentMode = "documentation_only" | "full_pipeline";

export interface AgentResult {
  success: boolean;
  mode: AgentMode;
  note?: string;
  cptCode?: string;
  icd10Codes?: string[];
  qualityScore?: number;
  confidence?: number;
  billingResult?: BillingResult;
  reimbursementEstimate?: number;
  requiresReview?: boolean;
  flags?: string[];
  error?: string;
  fallback?: boolean;
}

export interface BillingResult {
  finalCptCode: string;
  issuesFound: string[];
  issuesFixed: string[];
  authRequired: boolean;
  estimatedReimbursement: number;
}
