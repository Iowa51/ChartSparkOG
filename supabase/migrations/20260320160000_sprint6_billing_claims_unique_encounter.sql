-- ============================================================
-- Sprint 6: Prevent duplicate billing claims for the same
-- encounter within a single organization.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_claims_org_encounter_unique
ON public.billing_claims (organization_id, encounter_id)
WHERE encounter_id IS NOT NULL;
