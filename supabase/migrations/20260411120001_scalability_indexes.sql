-- ============================================================================
-- Scalability indexes — fill gaps identified during the query-pattern audit
-- ============================================================================
-- This migration adds indexes for filter combinations that appear on the hot
-- path but are not yet covered by any existing index. Each index name uses
-- the canonical idx_<table>_<cols> convention.
--
-- All statements are IF NOT EXISTS and safe to run on an already-partially-
-- migrated database. No existing indexes are dropped or renamed.
-- ============================================================================

BEGIN;

-- ────────────── screening_scores ──────────────
-- Filter pattern: .eq('patient_id', x).eq('organization_id', y)
-- Seen in: smart-triage chart-summary and screenings GET.
CREATE INDEX IF NOT EXISTS idx_screening_scores_patient_org
    ON public.screening_scores (patient_id, organization_id);

-- ────────────── patient_medications ──────────────
-- Filter pattern: .eq('patient_id', x).eq('status', 'active')
-- Hottest table in smart-triage prescribing-check / medication-review.
CREATE INDEX IF NOT EXISTS idx_patient_medications_patient_status
    ON public.patient_medications (patient_id, status);

-- ────────────── patient_problems ──────────────
-- Filter pattern: .eq('patient_id', x).eq('status', 'active')
CREATE INDEX IF NOT EXISTS idx_patient_problems_patient_status
    ON public.patient_problems (patient_id, status);

-- ────────────── patient_allergies ──────────────
-- Filter pattern: .eq('patient_id', x)
-- No status column in current schema — single-column index is the right shape.
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_id
    ON public.patient_allergies (patient_id);

-- ────────────── vitals ──────────────
-- Filter pattern: .eq('patient_id', x).eq('organization_id', y)
--                 .order('recorded_at', { ascending: false }).limit(n)
-- Composite index with DESC on recorded_at lets the index satisfy both the
-- WHERE + ORDER BY without a sort step.
CREATE INDEX IF NOT EXISTS idx_vitals_patient_org_recorded_at
    ON public.vitals (patient_id, organization_id, recorded_at DESC);

-- ────────────── profiles ──────────────
-- Filter pattern: .eq('role', 'ADMIN' | 'AUDITOR' | ...)
-- Low-cardinality, but useful for admin-scope dashboards and lockout logic.
CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles (role);

-- ────────────── collection_periods ──────────────
-- Filter pattern: .eq('organization_id', x) often combined with status or
-- a period_start range. Composite index mirrors the billing_claims pattern.
CREATE INDEX IF NOT EXISTS idx_collection_periods_org_status
    ON public.collection_periods (organization_id, status);

-- ────────────── login_attempts ──────────────
-- Filter pattern: .eq('email', x) combined with a created_at window for
-- brute-force detection / lockout logic. Composite supports both.
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created_at
    ON public.login_attempts (email, created_at);

-- ────────────── invitations ──────────────
-- Filter pattern: .eq('organization_id', x).eq('email', y).eq('status', 'pending')
-- Composite covers the full predicate — a single index lookup resolves the
-- "already invited?" check before an INSERT.
CREATE INDEX IF NOT EXISTS idx_invitations_org_email_status
    ON public.invitations (organization_id, email, status);

-- ────────────── smart_triage_results ──────────────
-- Filter pattern: .eq('patient_id', x).eq('triage_type', y).gt('expires_at', NOW())
--                 .order('created_at', DESC).limit(1)
-- Composite lets the cache lookup resolve via a single index walk.
CREATE INDEX IF NOT EXISTS idx_smart_triage_results_patient_type_expires
    ON public.smart_triage_results (patient_id, triage_type, expires_at);

COMMIT;
