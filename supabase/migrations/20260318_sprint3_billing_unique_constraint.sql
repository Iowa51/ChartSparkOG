-- F-012: Add UNIQUE constraint on billing to prevent duplicate claims at DB level
-- This replaces the application-level SELECT-then-INSERT TOCTOU race condition
-- The 23505 error handler in the API route catches constraint violations gracefully

DO $$
BEGIN
    -- Add unique constraint on encounter_id + service_date + organization_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'billing_encounter_service_date_org_unique'
    ) THEN
        ALTER TABLE public.billing
            ADD CONSTRAINT billing_encounter_service_date_org_unique
            UNIQUE (encounter_id, service_date, organization_id);
    END IF;
END $$;
