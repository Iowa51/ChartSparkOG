/**
 * Database Type Definitions
 * F-029: Consolidated from src/types/database.ts and src/lib/types/database.ts
 * This is the single canonical source for all database types.
 */

// =============================================
// ENUMS & TYPE ALIASES
// =============================================

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN" | "AUDITOR";

export type SubscriptionTier = "starter" | "pro" | "complete";

export type FeeCollectionMethod = "deduct_from_billing" | "charge_separately";

export type NoteStatus = "draft" | "pending_review" | "signed" | "amended";

export type EncounterStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type FeeStatus = "pending" | "collected" | "waived";

// =============================================
// FEATURE ASSIGNMENT SYSTEM
// =============================================

export type FeatureTier = "STARTER" | "PROFESSIONAL" | "COMPLETE" | "ADMIN" | "SUPER_ADMIN";

export type FeatureCategory = "CORE" | "CLINICAL" | "AI" | "INTEGRATION" | "ADMIN" | "SUPER_ADMIN";

export type FeatureCode =
  // STARTER (CORE)
  | "DASHBOARD"
  | "PATIENTS_VIEW"
  | "PATIENTS_CREATE"
  | "PATIENTS_EDIT"
  | "NOTES_VIEW"
  | "NOTES_CREATE"
  | "TEMPLATES_BASIC"
  | "QUICK_PHRASES"
  | "BILLING_VIEW"
  | "ENCOUNTERS"
  | "REFERENCES_BASIC"
  // PROFESSIONAL (CLINICAL & AI)
  | "CALENDAR"
  | "TELEHEALTH"
  | "AI_NOTE_GENERATION"
  | "AI_DIAGNOSIS"
  | "AI_TREATMENT"
  | "CUSTOM_TEMPLATES"
  | "CUSTOM_PHRASES"
  | "ADVANCED_ANALYTICS"
  | "REFERENCES_FULL"
  | "EXPORT_DATA"
  // COMPLETE (INTEGRATION)
  | "E_PRESCRIBE"
  | "EHR_INTEGRATION"
  | "RELAPSE_PREVENTION"
  | "SUBMISSIONS_CREATE"
  | "AUDIT_REPORTS"
  | "API_ACCESS"
  | "PRIORITY_SUPPORT"
  | "WHITE_LABEL"
  // ADMIN
  | "USER_MANAGEMENT"
  | "FEATURE_ASSIGNMENT"
  | "SUBMISSIONS_REVIEW"
  | "SUBMISSIONS_APPROVE"
  | "ORG_SETTINGS"
  | "ORG_REPORTS"
  // SUPER_ADMIN
  | "ALL_ORGS_ACCESS"
  | "CREATE_ORGS"
  | "CREATE_ADMINS"
  | "CREATE_AUDITORS"
  | "FINANCIALS"
  | "PLATFORM_FEES"
  | "TIER_OVERRIDE"
  | "GLOBAL_SETTINGS"
  | "AUDIT_LOGS";

export interface Feature {
  id: string;
  code: FeatureCode;
  name: string;
  description: string;
  tier_required: FeatureTier;
  category: FeatureCategory;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface UserFeature {
  id: string;
  user_id: string;
  feature_id: string;
  enabled: boolean;
  granted_by: string | null;
  granted_at: string;
  revoked_by: string | null;
  revoked_at: string | null;
  is_tier_override: boolean;
  override_reason: string | null;
  expires_at: string | null;
  feature?: Feature;
}

// =============================================
// CORE ENTITIES
// =============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: "starter" | "pro" | "complete";
  subscription_status: "active" | "inactive" | "trial";
  platform_fee_percentage: number;
  fee_collection_method: "charge_separately" | "deduct_from_billing";
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  organization_id: string | null;
  specialty: string | null;
  custom_fee_percentage: number | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: "active" | "inactive" | "archived";
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Extended fields
  mrn?: string;
  preferred_name?: string;
  last_visit_date?: string;
  avatar_color?: string;
}

export interface PatientAllergy {
  id: string;
  patient_id: string;
  allergy: string;
  severity?: "mild" | "moderate" | "severe";
  created_at: string;
}

export interface PatientMedication {
  id: string;
  patient_id: string;
  medication: string;
  dosage?: string;
  frequency?: string;
  status: "active" | "discontinued";
  created_at: string;
  discontinued_at?: string;
}

export interface PatientProblem {
  id: string;
  patient_id: string;
  problem: string;
  icd10_code?: string;
  status: "active" | "resolved";
  onset_date?: string;
  created_at: string;
}

export interface PatientInsurance {
  id: string;
  patient_id: string;
  provider: string;
  policy_number?: string;
  group_number?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type PatientDocumentType =
  | "photo_id"
  | "insurance_card_front"
  | "insurance_card_back"
  | "other";

export interface PatientDocument {
  id: string;
  patient_id: string;
  organization_id: string;
  uploaded_by: string;
  document_type: PatientDocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  label?: string;
  created_at: string;
  updated_at: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  organization_id: string;
  provider_id: string;
  encounter_type: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  chief_complaint?: string;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  encounter_id: string;
  organization_id: string;
  provider_id: string;
  template_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  cpt_codes: string[];
  icd10_codes: string[];
  billing_amount: number;
  platform_fee_amount: number;
  net_amount: number;
  audio_url?: string;
  transcript?: string;
  status: "draft" | "completed" | "signed" | "amended";
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description?: string;
  is_system: boolean;
  is_default: boolean;
  structure: {
    subjective: { label: string; placeholder: string };
    objective: { label: string; placeholder: string };
    assessment: { label: string; placeholder: string };
    plan: { label: string; placeholder: string };
  };
  cpt_suggestions: string[];
  icd10_suggestions: string[];
  created_at: string;
  updated_at: string;
}

// =============================================
// INPUT TYPES (for create/update operations)
// =============================================

export interface PatientCreateInput {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  preferred_name?: string;
  avatar_color?: string;
  // Related data
  allergies?: string[];
  medications?: Array<{
    medication: string;
    dosage?: string;
    frequency?: string;
  }>;
  problems?: Array<{
    problem: string;
    icd10_code?: string;
  }>;
  insurance?: {
    provider: string;
    policy_number?: string;
    group_number?: string;
  };
}

export interface PatientUpdateInput {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  preferred_name?: string;
  status?: "active" | "inactive" | "archived";
}

export interface EncounterCreateInput {
  patient_id: string;
  encounter_type: string;
  scheduled_start: string;
  scheduled_end: string;
  chief_complaint?: string;
  duration_minutes?: number;
}

export interface EncounterUpdateInput {
  encounter_type?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string | null;
  actual_end?: string | null;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  chief_complaint?: string;
  duration_minutes?: number;
}

export interface NoteCreateInput {
  encounter_id: string;
  template_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  cpt_codes?: string[];
  icd10_codes?: string[];
}

export interface NoteUpdateInput {
  template_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  cpt_codes?: string[];
  icd10_codes?: string[];
  status?: "draft" | "completed" | "signed" | "amended";
}

// =============================================
// EXTENDED TYPES (with joined data)
// =============================================

export interface PatientWithDetails extends Patient {
  allergies: PatientAllergy[];
  medications: PatientMedication[];
  problems: PatientProblem[];
  insurance: PatientInsurance | null;
}

export interface EncounterWithDetails extends Encounter {
  patient: Patient;
  provider: User;
  note?: Note;
}

// =============================================
// QUERY RESULT TYPES
// =============================================

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
}

// =============================================
// ERROR TYPES
// =============================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// =============================================
// BILLING & FEE TYPES
// =============================================

export interface PlatformFee {
  id: string;
  note_id: string;
  organization_id: string;
  user_id: string;
  billing_amount: number;
  fee_percentage: number;
  fee_amount: number;
  collected_at?: string;
  status: FeeStatus;
  created_at: string;
}

export interface UserBillingStats {
  notes_generated: number;
  total_billing: number;
  codes_used: Record<string, number>;
}

export interface OrgBillingStats {
  organization_id: string;
  organization_name: string;
  total_users: number;
  total_notes: number;
  total_billing: number;
  total_fees: number;
  users: {
    user_id: string;
    user_name: string;
    notes_generated: number;
    billing_amount: number;
    fee_amount: number;
  }[];
}

export interface PlatformBillingStats {
  total_organizations: number;
  total_users: number;
  total_notes: number;
  total_billing: number;
  total_fees_collected: number;
  organizations: OrgBillingStats[];
}
