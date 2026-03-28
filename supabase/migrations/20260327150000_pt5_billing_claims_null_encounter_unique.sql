-- SEC-PT5-F10: Add partial unique index for claims WITHOUT encounter_id.
-- The existing idx_billing_claims_org_encounter_unique only covers
-- WHERE encounter_id IS NOT NULL. This index covers the NULL case,
-- preventing duplicate claims for the same patient/provider/service date
-- when no encounter is linked.

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_claims_null_encounter_unique
  ON public.billing_claims (organization_id, patient_id, provider_id, service_date)
  WHERE encounter_id IS NULL;
