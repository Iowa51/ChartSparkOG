-- ============================================================
-- BILLING INFRASTRUCTURE: billing_claims + claim_lines
-- Created: 2026-03-19
-- Recreates tables to match production schema, using profiles
-- table instead of users for provider references.
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING TABLES (child first, then parent)
-- ============================================================

DROP TABLE IF EXISTS public.claim_lines CASCADE;
DROP TABLE IF EXISTS public.billing_claims CASCADE;

-- ============================================================
-- 2. BILLING_CLAIMS TABLE
-- ============================================================

CREATE TABLE public.billing_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES profiles(id),
  encounter_id UUID, -- no FK: encounters table may not exist

  -- Claim identification
  claim_number TEXT NOT NULL UNIQUE,

  -- Service details
  service_date TIMESTAMPTZ NOT NULL,
  diagnosis_codes TEXT[] DEFAULT '{}',
  procedure_codes TEXT[] DEFAULT '{}',

  -- Financial amounts (in cents)
  billed_amount INTEGER DEFAULT 0,
  allowed_amount INTEGER DEFAULT 0,
  paid_amount INTEGER DEFAULT 0,
  adjustment_amount INTEGER DEFAULT 0,
  patient_responsibility INTEGER DEFAULT 0,

  -- Facility
  place_of_service TEXT DEFAULT '11',

  -- Payer info
  payer_name TEXT,
  payer_id TEXT,
  payer_claim_number TEXT,

  -- Claim lifecycle
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- ERA (Electronic Remittance Advice)
  era_received BOOLEAN DEFAULT FALSE,
  era_received_at TIMESTAMPTZ,
  era_file_id UUID,
  payment_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. BILLING_CLAIMS INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_billing_claims_org ON public.billing_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_status ON public.billing_claims(status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_patient ON public.billing_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_service_date ON public.billing_claims(service_date);
CREATE INDEX IF NOT EXISTS idx_billing_claims_org_status ON public.billing_claims(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_encounter_id ON public.billing_claims(encounter_id);

-- ============================================================
-- 4. BILLING_CLAIMS RLS
-- ============================================================

ALTER TABLE public.billing_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_member_claims_view" ON billing_claims;
CREATE POLICY "org_member_claims_view" ON billing_claims
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_claims_manage" ON billing_claims;
CREATE POLICY "admin_claims_manage" ON billing_claims
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================
-- 5. CLAIM_LINES TABLE
-- ============================================================

CREATE TABLE public.claim_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES billing_claims(id) ON DELETE CASCADE,

  -- Line identification
  line_number INTEGER NOT NULL,

  -- Service details
  cpt_code VARCHAR(10) NOT NULL,
  modifiers JSONB,

  -- Diagnosis
  diagnosis_pointers JSONB NOT NULL,

  -- Quantity and charges
  units DECIMAL(10,2) NOT NULL DEFAULT 1,
  charge_amount INTEGER NOT NULL, -- in cents

  -- Service date
  service_date DATE NOT NULL,

  -- Rendering provider (can differ per line)
  rendering_npi VARCHAR(10),

  -- Payment details (from ERA)
  allowed_amount INTEGER,
  paid_amount INTEGER,
  patient_responsibility INTEGER,
  adjustment_amount INTEGER,
  line_status VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(claim_id, line_number)
);

-- ============================================================
-- 6. CLAIM_LINES INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON public.claim_lines(claim_id);

-- ============================================================
-- 7. CLAIM_LINES RLS
-- ============================================================

ALTER TABLE public.claim_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claim_lines_select" ON claim_lines;
CREATE POLICY "claim_lines_select" ON claim_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "claim_lines_insert" ON claim_lines;
CREATE POLICY "claim_lines_insert" ON claim_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "claim_lines_update" ON claim_lines;
CREATE POLICY "claim_lines_update" ON claim_lines
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM billing_claims bc
      WHERE bc.id = claim_lines.claim_id
        AND bc.organization_id = public.get_user_organization_id()
    )
  );
