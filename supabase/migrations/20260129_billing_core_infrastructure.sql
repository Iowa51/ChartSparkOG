-- ============================================================
-- CHARTSPARK MANAGED BILLING - PHASE 1: DATABASE FOUNDATION
-- Version: 1.0.0
-- Date: 2026-01-29
-- Description: Core infrastructure for Office Ally integration
-- ============================================================

-- 1. PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL, -- billing, rendering, both
  
  -- Organization info (for billing provider)
  organization_name VARCHAR(255),
  
  -- Individual info (for rendering provider)
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_name VARCHAR(50),
  
  -- NPIs
  billing_npi VARCHAR(10), -- Billing NPI (10 digits)
  rendering_npi VARCHAR(10), -- Rendering NPI (10 digits)
  
  -- Tax info
  tin VARCHAR(20), -- Tax ID Number (encrypted)
  
  -- Professional info
  taxonomy VARCHAR(20), -- NUCC taxonomy code
  state_license_number VARCHAR(50),
  state_license_state VARCHAR(2),
  dea_number VARCHAR(20), -- DEA for controlled substances (encrypted)
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  
  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Validation
  npi_validated_at TIMESTAMPTZ,
  npi_validation_status VARCHAR(50), -- valid, invalid, pending
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_org ON public.providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_providers_billing_npi ON public.providers(billing_npi);
CREATE INDEX IF NOT EXISTS idx_providers_rendering_npi ON public.providers(rendering_npi);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.providers;
CREATE POLICY "tenant_isolation" ON public.providers
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id());


-- 2. PAYERS TABLE (Directory)
CREATE TABLE IF NOT EXISTS public.payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Payer identification
  name VARCHAR(255) NOT NULL,
  payer_id VARCHAR(50) UNIQUE NOT NULL, -- For EDI Loop 2010BB
  
  -- Payer type
  payer_type VARCHAR(50), -- commercial, medicare, medicaid, other
  
  -- Contact info
  phone VARCHAR(20),
  website VARCHAR(255),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  
  -- EDI configuration
  claim_filing_indicator_code VARCHAR(2), -- e.g., '12' for PPO
  
  -- Timely filing
  timely_filing_days INTEGER DEFAULT 365,
  
  -- Office Ally specific config
  office_ally_payer_id VARCHAR(50),
  office_ally_enabled BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payers_payer_id ON public.payers(payer_id);
CREATE INDEX IF NOT EXISTS idx_payers_name ON public.payers(name);

ALTER TABLE public.payers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_only_payers" ON public.payers;
CREATE POLICY "read_only_payers" ON public.payers
  FOR SELECT TO authenticated
  USING (is_active = TRUE);


-- 3. COVERAGES TABLE
CREATE TABLE IF NOT EXISTS public.coverages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  
  -- Priority (for COB)
  priority VARCHAR(20) NOT NULL, -- PRIMARY, SECONDARY, TERTIARY
  
  -- Member info
  member_id VARCHAR(50) NOT NULL,
  group_id VARCHAR(50),
  
  -- Plan info
  plan_type VARCHAR(50), -- HMO, PPO, EPO, POS, Medicare, Medicaid
  plan_name VARCHAR(255),
  
  -- Subscriber info (if patient is not subscriber)
  subscriber_relationship VARCHAR(20) NOT NULL DEFAULT '18', -- 18=self
  subscriber_first_name VARCHAR(100),
  subscriber_last_name VARCHAR(100),
  subscriber_middle_name VARCHAR(50),
  subscriber_date_of_birth DATE,
  subscriber_gender VARCHAR(10),
  subscriber_ssn VARCHAR(20), -- Encrypted
  
  -- Coverage dates
  active_from DATE,
  active_to DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMPTZ,
  
  -- Insurance card images
  card_front_image_url TEXT,
  card_back_image_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(patient_id, payer_id, priority)
);

CREATE INDEX IF NOT EXISTS idx_coverages_org ON public.coverages(organization_id);
CREATE INDEX IF NOT EXISTS idx_coverages_patient ON public.coverages(patient_id);

ALTER TABLE public.coverages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.coverages;
CREATE POLICY "tenant_isolation" ON public.coverages
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id());


-- 4. EXTEND BILLING_CLAIMS
DO $$ 
BEGIN
  -- Add missing fields from robust schema
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS coverage_id UUID REFERENCES coverages(id);
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS billing_provider_id UUID REFERENCES providers(id);
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS rendering_provider_id UUID REFERENCES providers(id);
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS frequency_code VARCHAR(1) DEFAULT '1';
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS place_of_service VARCHAR(2) DEFAULT '11';
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS prior_auth_number VARCHAR(50);
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS timely_filing_deadline DATE;
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS last_scrubbed_at TIMESTAMPTZ;
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS scrub_results JSONB;
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);
  ALTER TABLE public.billing_claims ADD COLUMN IF NOT EXISTS status_reason JSONB;
END $$;


-- 5. CLAIM LINES TABLE
CREATE TABLE IF NOT EXISTS public.claim_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES billing_claims(id) ON DELETE CASCADE,
  
  -- Line identification
  line_number INTEGER NOT NULL,
  
  -- Service details
  cpt_code VARCHAR(10) NOT NULL,
  modifiers JSONB, -- Array of up to 4 modifiers
  
  -- Diagnosis
  diagnosis_pointers JSONB NOT NULL, -- Array of diagnosis pointers (1-based)
  
  -- Quantity and charges
  units DECIMAL(10,2) NOT NULL DEFAULT 1,
  charge_amount INTEGER NOT NULL, -- In cents
  
  -- Service date
  service_date DATE NOT NULL,
  
  -- Rendering provider (can differ per line)
  rendering_npi VARCHAR(10),
  
  -- Payment details (from ERA)
  allowed_amount INTEGER,
  paid_amount INTEGER,
  patient_responsibility INTEGER,
  adjustment_amount INTEGER,
  line_status VARCHAR(50), -- paid, denied, adjusted
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(claim_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON public.claim_lines(claim_id);


-- 6. EDI TRANSACTIONS LOG
CREATE TABLE IF NOT EXISTS public.edi_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES billing_claims(id) ON DELETE CASCADE,
  
  -- Transaction type
  type VARCHAR(10) NOT NULL, -- 837P, 999, 277CA, 835
  direction VARCHAR(10) NOT NULL, -- outbound, inbound
  
  -- File info
  file_name TEXT NOT NULL,
  file_location TEXT, -- S3/Storage bucket path
  
  -- Control info
  control_number VARCHAR(50),
  correlation_id VARCHAR(100),
  
  -- Processing
  processed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edi_transactions_org ON public.edi_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_edi_transactions_claim ON public.edi_transactions(claim_id);

ALTER TABLE public.edi_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.edi_transactions;
CREATE POLICY "tenant_isolation" ON public.edi_transactions
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id());


-- 7. ACKNOWLEDGEMENTS (999/277CA Results)
CREATE TABLE IF NOT EXISTS public.acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES billing_claims(id) ON DELETE CASCADE,
  edi_transaction_id UUID NOT NULL REFERENCES edi_transactions(id) ON DELETE CASCADE,
  
  ack_type VARCHAR(10) NOT NULL, -- 999, 277CA
  accepted BOOLEAN NOT NULL,
  errors JSONB, -- Detailed errors
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acknowledgements_claim ON public.acknowledgements(claim_id);

ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acknowledgements_select" ON public.acknowledgements;
CREATE POLICY "acknowledgements_select" ON public.acknowledgements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.billing_claims bc
      WHERE bc.id = acknowledgements.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "acknowledgements_manage" ON public.acknowledgements;
CREATE POLICY "acknowledgements_manage" ON public.acknowledgements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.billing_claims bc
      WHERE bc.id = acknowledgements.claim_id
        AND bc.organization_id = public.get_user_organization_id()
        AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.billing_claims bc
      WHERE bc.id = acknowledgements.claim_id
        AND bc.organization_id = public.get_user_organization_id()
        AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
