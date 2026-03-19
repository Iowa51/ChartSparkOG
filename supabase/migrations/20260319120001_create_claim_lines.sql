-- ============================================================
-- CREATE CLAIM_LINES TABLE
-- Standalone migration for claim_lines with all columns,
-- constraints, indexes, and RLS policies.
-- Created: 2026-03-19
-- ============================================================

-- 1. CREATE TABLE
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

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON public.claim_lines(claim_id);

-- 3. ROW LEVEL SECURITY
ALTER TABLE claim_lines ENABLE ROW LEVEL SECURITY;

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
