-- Performance Optimization: Add indexes on frequently queried columns
-- This migration improves query performance for common operations

-- ============================================================================
-- BILLING_CLAIMS INDEXES
-- ============================================================================

-- organization_id: Used in almost every billing API call for tenant isolation
CREATE INDEX IF NOT EXISTS idx_billing_claims_org_id
ON billing_claims(organization_id);

-- claim_number: Used for ERA matching and claim lookups
CREATE INDEX IF NOT EXISTS idx_billing_claims_claim_number
ON billing_claims(claim_number);

-- Composite index for common query pattern: org + status
CREATE INDEX IF NOT EXISTS idx_billing_claims_org_status
ON billing_claims(organization_id, status);

-- encounter_id: Used when generating claims from encounters
CREATE INDEX IF NOT EXISTS idx_billing_claims_encounter_id
ON billing_claims(encounter_id);

-- ============================================================================
-- CLINICAL_NOTES INDEXES
-- ============================================================================

-- Composite index for patient notes lookup (very common query)
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_org
ON notes(patient_id, organization_id);

-- encounter_id: Used when fetching notes for an encounter
CREATE INDEX IF NOT EXISTS idx_notes_encounter_id
ON notes(encounter_id);

-- Composite for signed notes lookup
CREATE INDEX IF NOT EXISTS idx_notes_encounter_status
ON notes(encounter_id, status);

-- ============================================================================
-- ERA_PAYMENTS INDEXES
-- ============================================================================

-- claim_id: Used when looking up payments for a claim
CREATE INDEX IF NOT EXISTS idx_era_payments_claim_id
ON era_payments(claim_id);

-- era_file_id: Used when viewing payments from a specific ERA file
CREATE INDEX IF NOT EXISTS idx_era_payments_era_file_id
ON era_payments(era_file_id);

-- ============================================================================
-- ENCOUNTERS INDEXES
-- ============================================================================

-- organization_id + status: Common filter for encounter lists
CREATE INDEX IF NOT EXISTS idx_encounters_org_status
ON encounters(organization_id, status);

-- patient_id: Used when viewing patient's encounter history
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id
ON encounters(patient_id);

-- ============================================================================
-- PATIENTS INDEXES
-- ============================================================================

-- organization_id: Tenant isolation for patient queries
CREATE INDEX IF NOT EXISTS idx_patients_org_id
ON patients(organization_id);

-- Composite for name search (common patient lookup)
CREATE INDEX IF NOT EXISTS idx_patients_org_lastname
ON patients(organization_id, last_name);

-- ============================================================================
-- USERS/PROFILES INDEXES
-- ============================================================================

-- email: Used in login and user lookup (if not already indexed)
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email);

-- organization_id: Tenant isolation for user queries
CREATE INDEX IF NOT EXISTS idx_profiles_org_id
ON profiles(organization_id);

-- ============================================================================
-- AUDIT_LOGS INDEXES
-- ============================================================================

-- organization_id + timestamp: Common audit query pattern
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp
ON audit_logs(organization_id, timestamp DESC);

-- event_type: Filtering by event type
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
ON audit_logs(event_type);

-- user_id: Viewing user's activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id);

-- ============================================================================
-- ORGANIZATION_SUBSCRIPTIONS INDEXES
-- ============================================================================

-- organization_id: Subscription lookup (very frequent)
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_id
ON organization_subscriptions(organization_id);

-- ============================================================================
-- FEE_SCHEDULE_ITEMS INDEXES
-- ============================================================================

-- cpt_code: Used in fee lookups during claim generation
CREATE INDEX IF NOT EXISTS idx_fee_schedule_items_cpt
ON fee_schedule_items(cpt_code);

-- ============================================================================
-- COMMENT: Estimated Performance Impact
-- ============================================================================
-- These indexes are expected to improve:
-- - Patient list queries: 10-100x faster on large datasets
-- - Claim lookups: 5-20x faster
-- - ERA matching: 10-50x faster
-- - Audit log queries: 20-100x faster
--
-- Trade-off: Slightly slower INSERT/UPDATE operations (negligible for this use case)
-- Disk space: ~5-15% increase depending on table sizes
