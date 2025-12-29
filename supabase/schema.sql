-- ChartSpark Database Schema
-- Execute this SQL in the Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ORGANIZATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro', 'complete')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  platform_fee_percentage DECIMAL(5,2) DEFAULT 1.00,
  fee_collection_method TEXT DEFAULT 'charge_separately' CHECK (fee_collection_method IN ('charge_separately', 'deduct_from_billing')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  specialty TEXT,
  custom_fee_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- =============================================
-- ENCOUNTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id),
  encounter_type TEXT NOT NULL,
  encounter_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  chief_complaint TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id),
  template_id UUID,
  
  -- SOAP Sections
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  
  -- Billing Codes
  cpt_codes TEXT[] DEFAULT '{}',
  icd10_codes TEXT[] DEFAULT '{}',
  
  -- Billing Amounts
  billing_amount DECIMAL(10,2) DEFAULT 0,
  platform_fee_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Audio/Transcript
  audio_url TEXT,
  transcript TEXT,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'signed', 'amended')),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTE TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS note_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system template
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- SOAP Structure with placeholders
  structure JSONB NOT NULL DEFAULT '{
    "subjective": {"label": "Subjective", "placeholder": ""},
    "objective": {"label": "Objective", "placeholder": ""},
    "assessment": {"label": "Assessment", "placeholder": ""},
    "plan": {"label": "Plan", "placeholder": ""}
  }',
  
  cpt_suggestions TEXT[] DEFAULT '{}',
  icd10_suggestions TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PLATFORM FEES TABLE (for tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  fee_percentage DECIMAL(5,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  billing_amount DECIMAL(10,2) NOT NULL,
  collection_method TEXT NOT NULL,
  collected_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'waived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_organization ON patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_provider ON encounters(provider_id);
CREATE INDEX IF NOT EXISTS idx_encounters_organization ON encounters(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_encounter ON notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_notes_provider ON notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_notes_organization ON notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_organization ON platform_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_note_templates_organization ON note_templates(organization_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================
-- ORGANIZATIONS POLICIES
-- =============================================

-- SUPER_ADMIN can view all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = get_user_organization_id());

-- Only SUPER_ADMIN can insert organizations
CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'SUPER_ADMIN');

-- SUPER_ADMIN can update any organization
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- =============================================
-- USERS POLICIES
-- =============================================

-- Users can view themselves
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ADMIN can view users in their organization
CREATE POLICY "Admins can view org users"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND organization_id = get_user_organization_id()
  );

-- SUPER_ADMIN can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- =============================================
-- PATIENTS POLICIES
-- =============================================

-- Users can view patients in their organization
CREATE POLICY "Users can view org patients"
  ON patients FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Users can create patients in their organization
CREATE POLICY "Users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Users can update patients in their organization
CREATE POLICY "Users can update org patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- =============================================
-- ENCOUNTERS POLICIES
-- =============================================

-- Users can view encounters they created or in their org
CREATE POLICY "Users can view org encounters"
  ON encounters FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Users can create encounters
CREATE POLICY "Users can create encounters"
  ON encounters FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND provider_id = auth.uid()
  );

-- Users can update their own encounters
CREATE POLICY "Users can update own encounters"
  ON encounters FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid());

-- =============================================
-- NOTES POLICIES
-- =============================================

-- Users can view their own notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- ADMINs can view all notes in their org
CREATE POLICY "Admins can view org notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND organization_id = get_user_organization_id()
  );

-- SUPER_ADMIN can view all notes
CREATE POLICY "Super admins can view all notes"
  ON notes FOR SELECT
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- Users can create notes
CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid());

-- =============================================
-- NOTE TEMPLATES POLICIES
-- =============================================

-- Everyone can view system templates
CREATE POLICY "Everyone can view system templates"
  ON note_templates FOR SELECT
  TO authenticated
  USING (is_system = TRUE);

-- Users can view org templates
CREATE POLICY "Users can view org templates"
  ON note_templates FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- ADMINs can create org templates
CREATE POLICY "Admins can create org templates"
  ON note_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND (organization_id = get_user_organization_id() OR is_system = TRUE)
  );

-- SUPER_ADMINs can manage system templates
CREATE POLICY "Super admins can manage system templates"
  ON note_templates FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- =============================================
-- PLATFORM FEES POLICIES
-- =============================================

-- Only SUPER_ADMIN can view platform fees
CREATE POLICY "Super admins can view all fees"
  ON platform_fees FOR SELECT
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- ADMINs can view their org's fees
CREATE POLICY "Admins can view org fees"
  ON platform_fees FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'ADMIN'
    AND organization_id = get_user_organization_id()
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_templates_updated_at
  BEFORE UPDATE ON note_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA: System Templates
-- =============================================
INSERT INTO note_templates (id, name, description, is_system, is_default, cpt_suggestions, structure)
VALUES 
  (
    uuid_generate_v4(),
    'Progress Note',
    'Primary SOAP template optimized for insurance billing',
    TRUE,
    TRUE,
    ARRAY['99213', '99214', '99215'],
    '{"subjective": {"label": "Subjective", "placeholder": "Chief complaint, HPI, current medications, allergies..."}, "objective": {"label": "Objective", "placeholder": "Vitals, physical exam findings, mental status..."}, "assessment": {"label": "Assessment", "placeholder": "Diagnoses with ICD-10 codes, clinical reasoning..."}, "plan": {"label": "Plan", "placeholder": "Treatment plan, medications, follow-up..."}}'::jsonb
  ),
  (
    uuid_generate_v4(),
    'Initial Evaluation',
    'Comprehensive template for new patient assessments',
    TRUE,
    FALSE,
    ARRAY['99204', '99205', '90791'],
    '{"subjective": {"label": "Subjective", "placeholder": "Chief complaint, detailed history..."}, "objective": {"label": "Objective", "placeholder": "Comprehensive exam findings..."}, "assessment": {"label": "Assessment", "placeholder": "Initial diagnoses and formulation..."}, "plan": {"label": "Plan", "placeholder": "Initial treatment plan..."}}'::jsonb
  ),
  (
    uuid_generate_v4(),
    'Medication Management',
    'Focused template for medication follow-ups',
    TRUE,
    FALSE,
    ARRAY['99213', '99214'],
    '{"subjective": {"label": "Subjective", "placeholder": "Medication response, side effects..."}, "objective": {"label": "Objective", "placeholder": "Vitals, relevant exam..."}, "assessment": {"label": "Assessment", "placeholder": "Response to treatment..."}, "plan": {"label": "Plan", "placeholder": "Medication adjustments, next visit..."}}'::jsonb
  )
ON CONFLICT DO NOTHING;
