-- =============================================================================
-- CLEARINGHOUSE INTEGRATION - Database Schema
-- ChartSpark Managed Billing Add-On
-- =============================================================================
-- Version: 1.0.0
-- Date: 2026-01-23
-- Description: Adds clearinghouse connectivity for electronic claim submission
--              and ERA processing.
-- NOTE: This is INFRASTRUCTURE - inactive until clearinghouse account is set up.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CLEARINGHOUSE CONFIGURATION (per organization)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clearinghouse_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Which clearinghouse
  clearinghouse TEXT NOT NULL CHECK (clearinghouse IN (
    'office_ally', 'claim_md', 'availity', 'waystar', 'trizetto', 'other'
  )),
  
  -- Credentials (encrypted)
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  username_encrypted TEXT,
  password_encrypted TEXT,
  
  -- Connection settings
  submitter_id TEXT,
  sftp_host TEXT,
  sftp_username TEXT,
  sftp_password_encrypted TEXT,
  sftp_path TEXT DEFAULT '/claims',
  
  -- ERA settings
  era_enabled BOOLEAN DEFAULT FALSE,
  era_sftp_path TEXT DEFAULT '/era',
  era_auto_post BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_connection_test TIMESTAMPTZ,
  last_connection_status TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, clearinghouse)
);

-- -----------------------------------------------------------------------------
-- GLOBAL CLEARINGHOUSE CONFIG (ChartSpark's credentials)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_clearinghouse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clearinghouse TEXT UNIQUE NOT NULL,
  
  -- API credentials
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  
  -- SFTP credentials
  sftp_host TEXT,
  sftp_port INTEGER DEFAULT 22,
  sftp_username TEXT,
  sftp_password_encrypted TEXT,
  
  -- Submitter info
  submitter_id TEXT,
  submitter_name TEXT DEFAULT 'ChartSpark Health',
  submitter_npi TEXT,
  submitter_tax_id TEXT,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  supports_era BOOLEAN DEFAULT TRUE,
  supports_eligibility BOOLEAN DEFAULT TRUE,
  supports_claim_status BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- CLAIM SUBMISSIONS TRACKING
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES billing_claims(id) ON DELETE CASCADE,
  
  -- Submission details
  clearinghouse TEXT NOT NULL,
  submission_method TEXT CHECK (submission_method IN ('api', 'sftp', 'manual')),
  
  -- File info
  edi_file_name TEXT,
  edi_file_content TEXT,
  
  -- Tracking
  clearinghouse_claim_id TEXT,
  clearinghouse_batch_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'acknowledged', 'accepted', 'rejected', 'error'
  )),
  
  -- Response data
  response_code TEXT,
  response_message TEXT,
  rejection_reasons JSONB,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ERA (Electronic Remittance Advice) FILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS era_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- File info
  file_name TEXT NOT NULL,
  file_content TEXT,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'processing', 'processed', 'error', 'partial'
  )),
  
  -- Summary
  total_claims INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  claims_matched INTEGER DEFAULT 0,
  claims_unmatched INTEGER DEFAULT 0,
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ERA PAYMENTS (individual payments from ERA)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS era_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_file_id UUID REFERENCES era_files(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES billing_claims(id),
  
  -- From ERA
  payer_claim_number TEXT,
  patient_control_number TEXT,
  service_date DATE,
  
  -- Amounts (in cents)
  billed_amount INTEGER,
  allowed_amount INTEGER,
  paid_amount INTEGER,
  patient_responsibility INTEGER,
  adjustment_amount INTEGER,
  
  -- Adjustment details
  adjustment_reason_codes JSONB,
  remark_codes JSONB,
  
  -- Matching
  matched_at TIMESTAMPTZ,
  auto_posted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clearinghouse_configs_org ON clearinghouse_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_claim_submissions_claim ON claim_submissions(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_submissions_status ON claim_submissions(status);
CREATE INDEX IF NOT EXISTS idx_era_files_org ON era_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_era_files_status ON era_files(status);
CREATE INDEX IF NOT EXISTS idx_era_payments_claim ON era_payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_era_payments_era_file ON era_payments(era_file_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE clearinghouse_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_payments ENABLE ROW LEVEL SECURITY;

-- Clearinghouse configs - Admins only
CREATE POLICY "clearinghouse_configs_admin_access" ON clearinghouse_configs
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Claim submissions - same org can view
CREATE POLICY "claim_submissions_org_select" ON claim_submissions
  FOR SELECT TO authenticated
  USING (
    claim_id IN (
      SELECT id FROM billing_claims 
      WHERE organization_id = public.get_user_organization_id()
    )
  );

-- ERA files - same org can view
CREATE POLICY "era_files_org_select" ON era_files
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- ERA payments - same org can view
CREATE POLICY "era_payments_org_select" ON era_payments
  FOR SELECT TO authenticated
  USING (
    era_file_id IN (
      SELECT id FROM era_files 
      WHERE organization_id = public.get_user_organization_id()
    )
  );

-- Super admin full access policies
CREATE POLICY "clearinghouse_configs_super_admin" ON clearinghouse_configs
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "claim_submissions_super_admin" ON claim_submissions
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "era_files_super_admin" ON era_files
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "era_payments_super_admin" ON era_payments
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- Global clearinghouse config - super admin only
ALTER TABLE global_clearinghouse_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_clearinghouse_super_admin" ON global_clearinghouse_config
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- -----------------------------------------------------------------------------
-- ADD COLUMNS TO BILLING_CLAIMS (if not exists)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE billing_claims ADD COLUMN IF NOT EXISTS era_received BOOLEAN DEFAULT FALSE;
  ALTER TABLE billing_claims ADD COLUMN IF NOT EXISTS era_received_at TIMESTAMPTZ;
  ALTER TABLE billing_claims ADD COLUMN IF NOT EXISTS era_file_id UUID REFERENCES era_files(id);
  ALTER TABLE billing_claims ADD COLUMN IF NOT EXISTS payer_claim_number TEXT;
  ALTER TABLE billing_claims ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE;
EXCEPTION
  WHEN undefined_table THEN
    -- billing_claims table doesn't exist yet, skip
    NULL;
END $$;
