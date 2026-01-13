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

-- =============================================
-- FEATURES TABLE (Feature Assignment System)
-- =============================================
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier_required TEXT NOT NULL CHECK (tier_required IN ('STARTER', 'PROFESSIONAL', 'COMPLETE', 'ADMIN', 'SUPER_ADMIN')),
  category TEXT NOT NULL CHECK (category IN ('CORE', 'CLINICAL', 'AI', 'INTEGRATION', 'ADMIN', 'SUPER_ADMIN')),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER FEATURES JUNCTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  is_tier_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, feature_id)
);

-- Feature indexes
CREATE INDEX IF NOT EXISTS idx_features_tier ON features(tier_required);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(category);
CREATE INDEX IF NOT EXISTS idx_features_code ON features(code);
CREATE INDEX IF NOT EXISTS idx_user_features_user ON user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_enabled ON user_features(user_id, enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_features_feature ON user_features(feature_id);

-- Enable RLS on features tables
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FEATURES RLS POLICIES
-- =============================================

-- Everyone can view features (read-only catalog)
CREATE POLICY "Authenticated users can view features"
  ON features FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only SUPER_ADMIN can modify features table
CREATE POLICY "Super admins can manage features"
  ON features FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (get_user_role() = 'SUPER_ADMIN');

-- =============================================
-- USER_FEATURES RLS POLICIES
-- =============================================

-- Users can view their own features
CREATE POLICY "Users can view own features"
  ON user_features FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ADMINs can view features of users in their org
CREATE POLICY "Admins can view org user features"
  ON user_features FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_features.user_id 
      AND u.organization_id = get_user_organization_id()
    )
  );

-- ADMINs can update features of users in their org (within tier)
CREATE POLICY "Admins can update org user features"
  ON user_features FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_features.user_id 
      AND u.organization_id = get_user_organization_id()
    )
  );

-- ADMINs can insert features for users in their org
CREATE POLICY "Admins can insert org user features"
  ON user_features FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_features.user_id 
      AND u.organization_id = get_user_organization_id()
    )
  );

-- SUPER_ADMIN can view all user_features
CREATE POLICY "Super admins can view all user features"
  ON user_features FOR SELECT
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

-- SUPER_ADMIN can manage all user_features
CREATE POLICY "Super admins can manage all user features"
  ON user_features FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (get_user_role() = 'SUPER_ADMIN');

-- =============================================
-- SEED DATA: Features
-- =============================================
INSERT INTO features (code, name, description, tier_required, category, display_order) VALUES
-- STARTER TIER (CORE)
('DASHBOARD', 'Dashboard Access', 'Basic dashboard with stats', 'STARTER', 'CORE', 1),
('PATIENTS_VIEW', 'View Patients', 'View patient list and details', 'STARTER', 'CORE', 2),
('PATIENTS_CREATE', 'Create Patients', 'Add new patients', 'STARTER', 'CORE', 3),
('PATIENTS_EDIT', 'Edit Patients', 'Modify patient information', 'STARTER', 'CORE', 4),
('NOTES_VIEW', 'View Notes', 'View clinical notes', 'STARTER', 'CORE', 5),
('NOTES_CREATE', 'Create Notes', 'Create new clinical notes', 'STARTER', 'CORE', 6),
('TEMPLATES_BASIC', 'Basic Templates', 'Access to Progress Note template', 'STARTER', 'CORE', 7),
('QUICK_PHRASES', 'Quick Phrases', 'Basic quick phrase library', 'STARTER', 'CORE', 8),
('BILLING_VIEW', 'View Billing', 'See own billing information', 'STARTER', 'CORE', 9),
('ENCOUNTERS', 'Encounters', 'Create and manage encounters', 'STARTER', 'CORE', 10),
('REFERENCES_BASIC', 'Basic References', 'Basic clinical references', 'STARTER', 'CORE', 11),

-- PROFESSIONAL TIER (CLINICAL & AI)
('CALENDAR', 'Calendar/Scheduling', 'Appointment scheduling', 'PROFESSIONAL', 'CLINICAL', 20),
('TELEHEALTH', 'Telehealth', 'Video visits', 'PROFESSIONAL', 'CLINICAL', 21),
('AI_NOTE_GENERATION', 'AI Note Generation', 'AI-powered note writing', 'PROFESSIONAL', 'AI', 22),
('AI_DIAGNOSIS', 'AI Diagnostic Assistant', 'AI-powered diagnosis suggestions', 'PROFESSIONAL', 'AI', 23),
('AI_TREATMENT', 'AI Treatment Planner', 'AI-powered treatment recommendations', 'PROFESSIONAL', 'AI', 24),
('CUSTOM_TEMPLATES', 'Custom Templates', 'Create and edit custom templates', 'PROFESSIONAL', 'CLINICAL', 25),
('CUSTOM_PHRASES', 'Custom Phrases', 'Create custom quick phrases', 'PROFESSIONAL', 'CLINICAL', 26),
('ADVANCED_ANALYTICS', 'Advanced Analytics', 'Detailed reports and analytics', 'PROFESSIONAL', 'CLINICAL', 27),
('REFERENCES_FULL', 'Full References', 'All clinical references and calculators', 'PROFESSIONAL', 'CLINICAL', 28),
('EXPORT_DATA', 'Export Data', 'Export patient data and reports', 'PROFESSIONAL', 'CLINICAL', 29),

-- COMPLETE TIER (INTEGRATION)
('E_PRESCRIBE', 'E-Prescribe', 'Electronic prescribing', 'COMPLETE', 'INTEGRATION', 40),
('EHR_INTEGRATION', 'EHR Integration', 'Connect to external EHR systems', 'COMPLETE', 'INTEGRATION', 41),
('RELAPSE_PREVENTION', 'Relapse Prevention', 'Predictive analytics for relapse', 'COMPLETE', 'AI', 42),
('SUBMISSIONS_CREATE', 'Create Submissions', 'Submit notes to insurance', 'COMPLETE', 'INTEGRATION', 43),
('AUDIT_REPORTS', 'Audit Reports', 'Generate compliance reports', 'COMPLETE', 'INTEGRATION', 44),
('API_ACCESS', 'API Access', 'Access to ChartSpark API', 'COMPLETE', 'INTEGRATION', 45),
('PRIORITY_SUPPORT', 'Priority Support', 'Priority customer support', 'COMPLETE', 'INTEGRATION', 46),
('WHITE_LABEL', 'White Label', 'Custom branding options', 'COMPLETE', 'INTEGRATION', 47),

-- ADMIN FEATURES
('USER_MANAGEMENT', 'User Management', 'Create/edit users in organization', 'ADMIN', 'ADMIN', 60),
('FEATURE_ASSIGNMENT', 'Feature Assignment', 'Assign features to users', 'ADMIN', 'ADMIN', 61),
('SUBMISSIONS_REVIEW', 'Review Submissions', 'Review insurance submissions', 'ADMIN', 'ADMIN', 62),
('SUBMISSIONS_APPROVE', 'Approve Submissions', 'Approve/reject submissions', 'ADMIN', 'ADMIN', 63),
('ORG_SETTINGS', 'Organization Settings', 'Edit organization settings', 'ADMIN', 'ADMIN', 64),
('ORG_REPORTS', 'Organization Reports', 'View organization-wide reports', 'ADMIN', 'ADMIN', 65),

-- SUPER ADMIN FEATURES
('ALL_ORGS_ACCESS', 'All Organizations', 'Access all organizations', 'SUPER_ADMIN', 'SUPER_ADMIN', 80),
('CREATE_ORGS', 'Create Organizations', 'Create new organizations', 'SUPER_ADMIN', 'SUPER_ADMIN', 81),
('CREATE_ADMINS', 'Create Admins', 'Create admin users', 'SUPER_ADMIN', 'SUPER_ADMIN', 82),
('CREATE_AUDITORS', 'Create Auditors', 'Create auditor users', 'SUPER_ADMIN', 'SUPER_ADMIN', 83),
('FINANCIALS', 'Financial Dashboard', 'View revenue and platform fees', 'SUPER_ADMIN', 'SUPER_ADMIN', 84),
('PLATFORM_FEES', 'Platform Fee Config', 'Set and modify platform fees', 'SUPER_ADMIN', 'SUPER_ADMIN', 85),
('TIER_OVERRIDE', 'Tier Override', 'Grant features above user tier', 'SUPER_ADMIN', 'SUPER_ADMIN', 86),
('GLOBAL_SETTINGS', 'Global Settings', 'Platform-wide settings', 'SUPER_ADMIN', 'SUPER_ADMIN', 87),
('AUDIT_LOGS', 'Audit Logs', 'View security audit logs', 'SUPER_ADMIN', 'SUPER_ADMIN', 88)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- LOGIN ATTEMPTS TABLE (Security)
-- =============================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login attempts indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_success ON login_attempts(email, success);

-- RLS for login_attempts (only super admin can view)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view login attempts"
  ON login_attempts FOR SELECT
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "System can insert login attempts"
  ON login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- =============================================
-- AUDIT LOGS TABLE (HIPAA Compliance)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  user_role TEXT,
  organization_id UUID REFERENCES organizations(id),
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  phi_accessed BOOLEAN DEFAULT FALSE,
  risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_phi ON audit_logs(phi_accessed) WHERE phi_accessed = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_risk ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admins and Auditors can view audit logs
CREATE POLICY "Super admins and auditors can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('SUPER_ADMIN', 'AUDITOR'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Super Admin can manage audit logs
CREATE POLICY "Super admins can manage audit logs"
  ON audit_logs FOR ALL
  TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (get_user_role() = 'SUPER_ADMIN');

