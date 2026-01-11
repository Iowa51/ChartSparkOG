-- CHARTSPARK DATABASE MIGRATION
-- Generated: 2026-01-05
-- Target: Supabase (PostgreSQL)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- ORGANIZATION TABLE
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('STARTER', 'PROFESSIONAL', 'COMPLETE')),
    platform_fee_percentage DECIMAL(5,2) DEFAULT 1.0,
    fee_collection_method TEXT NOT NULL CHECK (fee_collection_method IN ('DEDUCT', 'INVOICE')) DEFAULT 'DEDUCT',
    admin_id UUID, -- Will be linked after users table creation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS (PROFILES) TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER')) DEFAULT 'USER',
    subscription_tier TEXT CHECK (subscription_tier IN ('STARTER', 'PROFESSIONAL', 'COMPLETE')),
    specialty TEXT CHECK (specialty IN ('mental_health', 'geriatric', 'both')),
    custom_fee_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Complete circular reference for organizations
ALTER TABLE organizations ADD CONSTRAINT fk_org_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- AUDITOR_ORGANIZATIONS JUNCTION
CREATE TABLE IF NOT EXISTS auditor_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auditor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(auditor_id, organization_id)
);

-- PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    allergies TEXT,
    current_medications TEXT,
    medical_history TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENCOUNTERS TABLE
CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_type TEXT NOT NULL CHECK (encounter_type IN ('initial', 'follow_up', 'urgent', 'telehealth')),
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    chief_complaint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTES TABLE
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL CHECK (template_type IN ('soap', 'progress', 'cognitive_assessment', 'fall_risk', 'medication_reconciliation', 'functional_status', 'advance_care')),
    note_content JSONB NOT NULL,
    transcript TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'completed', 'signed', 'submitted')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cpt_code TEXT NOT NULL,
    icd10_codes TEXT[] NOT NULL DEFAULT '{}',
    billing_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    platform_fee_amount DECIMAL(10,2) DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('pending_audit', 'pending_approval', 'approved', 'submitted', 'paid', 'rejected')) DEFAULT 'pending_audit',
    auditor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    audited_at TIMESTAMP WITH TIME ZONE,
    auditor_status TEXT CHECK (auditor_status IN ('pass', 'flagged')),
    auditor_comments TEXT,
    admin_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    submission_date DATE,
    payment_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT FLAGS TABLE
CREATE TABLE IF NOT EXISTS audit_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    auditor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('missing_info', 'coding_error', 'documentation_gap', 'compliance_risk', 'other')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    comment TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'addressed', 'dismissed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- QUICK PHRASES TABLE
CREATE TABLE IF NOT EXISTS quick_phrases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for system-wide
    category TEXT NOT NULL CHECK (category IN ('MENTAL_HEALTH', 'GERIATRIC', 'GENERAL')),
    specialty TEXT NOT NULL CHECK (specialty IN ('mental_health', 'geriatric', 'both')),
    phrase TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTE TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS note_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL,
    specialty TEXT NOT NULL CHECK (specialty IN ('mental_health', 'geriatric', 'both')),
    structure JSONB NOT NULL,
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI USAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature TEXT NOT NULL CHECK (feature IN ('note_generation', 'diagnosis_suggestions', 'treatment_plan', 'compliance_check')),
    note_type TEXT,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_org ON patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_provider ON patients(provider_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_org ON encounters(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_encounter ON notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_org ON submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_submissions_auditor ON submissions(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage_logs(organization_id);

-- 4. FUNCTIONS & TRIGGERS

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'organizations', 'patients', 'encounters', 'notes', 'submissions', 'note_templates')) LOOP
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- Function to calculate platform fee
CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
DECLARE
    fee_pct DECIMAL;
BEGIN
    -- Get percentage from organization
    SELECT platform_fee_percentage INTO fee_pct FROM organizations WHERE id = NEW.organization_id;
    -- Set the fee amount
    NEW.platform_fee_amount = (NEW.billing_amount * (COALESCE(fee_pct, 1.0) / 100.0));
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_calculate_submission_fee
BEFORE INSERT OR UPDATE OF billing_amount ON submissions
FOR EACH ROW EXECUTE PROCEDURE calculate_platform_fee();

-- 5. ROW LEVEL SECURITY (RLS) policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- UNIVERSAL "SUPER_ADMIN" BYPASS (Simplified as per user requirement)
-- Note: In Supabase, typically policies check `role = 'SUPER_ADMIN'` in the users table.

-- USERS POLICIES
CREATE POLICY "super_admin_all_users" ON users FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "admin_org_users" ON users FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "user_self_access" ON users FOR ALL TO authenticated USING (id = auth.uid());

-- PATIENT POLICIES
CREATE POLICY "super_admin_all_patients" ON patients FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "org_member_patients" ON patients FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "auditor_assigned_patients" ON patients FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM auditor_organizations WHERE auditor_id = auth.uid() AND is_active = true));
CREATE POLICY "provider_full_patients" ON patients FOR ALL TO authenticated USING (provider_id = auth.uid());

-- ENCOUNTER POLICIES
CREATE POLICY "super_admin_all_encounters" ON encounters FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "org_member_encounters" ON encounters FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "auditor_assigned_encounters" ON encounters FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM auditor_organizations WHERE auditor_id = auth.uid() AND is_active = true));
CREATE POLICY "provider_full_encounters" ON encounters FOR ALL TO authenticated USING (provider_id = auth.uid());

-- NOTE POLICIES
CREATE POLICY "super_admin_all_notes" ON notes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "org_member_notes" ON notes FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "auditor_assigned_notes" ON notes FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM auditor_organizations WHERE auditor_id = auth.uid() AND is_active = true));
CREATE POLICY "provider_full_notes" ON notes FOR ALL TO authenticated USING (provider_id = auth.uid());

-- SUBMISSION POLICIES
CREATE POLICY "super_admin_all_submissions" ON submissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "admin_org_submissions" ON submissions FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "auditor_assigned_submissions" ON submissions FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM auditor_organizations WHERE auditor_id = auth.uid() AND is_active = true));
CREATE POLICY "provider_own_submissions" ON submissions FOR SELECT TO authenticated USING (provider_id = auth.uid());

-- QUICK PHRASES POLICIES
CREATE POLICY "view_system_phrases" ON quick_phrases FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "manage_org_phrases" ON quick_phrases FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

-- 6. SEED DATA (UUIDs are static for demo consistency)
-- Note: In actual Supabase, you'd link these to actual auth.users IDs.

-- SEED ORGANIZATIONS
INSERT INTO organizations (id, name, slug, subscription_tier, platform_fee_percentage, fee_collection_method)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Demo Clinic', 'demo-clinic', 'PROFESSIONAL', 1.0, 'DEDUCT'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Test Practice', 'test-practice', 'COMPLETE', 0.8, 'INVOICE')
ON CONFLICT (id) DO NOTHING;

-- SEED SYSTEM QUICK PHRASES (Partial list for brevity)
INSERT INTO quick_phrases (category, specialty, phrase, sort_order) VALUES
('MENTAL_HEALTH', 'mental_health', 'Patient reports feeling "depressed and hopeless" most of the day.', 1),
('MENTAL_HEALTH', 'mental_health', 'Affect is restricted and congruent with depressed mood.', 2),
('MENTAL_HEALTH', 'mental_health', 'Thought process is linear and goal-directed.', 3),
('MENTAL_HEALTH', 'mental_health', 'No suicidal or homicidal ideation reported.', 4),
('MENTAL_HEALTH', 'mental_health', 'Insight and judgment appear fair.', 5),
('GERIATRIC', 'geriatric', 'Alert and oriented to person, place, time, and situation.', 1),
('GERIATRIC', 'geriatric', 'MMSE score indicates mild cognitive impairment.', 2),
('GERIATRIC', 'geriatric', 'Gait steady and stable without assistive device.', 3),
('GERIATRIC', 'geriatric', 'Medication reconciliation completed and reviewed.', 4),
('GERIATRIC', 'geriatric', 'Independent in all ADLs but requires assistance with IADLs.', 5),
('GERIATRIC', 'geriatric', 'High fall risk identified based on Morse Fall Scale.', 6),
('GERIATRIC', 'geriatric', 'Advance directives discussed and healthcare proxy confirmed.', 7),
('GERIATRIC', 'geriatric', 'Patient demonstrates word-finding difficulties during exam.', 8),
('GERIATRIC', 'geriatric', 'Uses rolling walker for community ambulation.', 9),
('GERIATRIC', 'geriatric', 'Living will on file with primary caregiver.', 10)
ON CONFLICT DO NOTHING;

-- Verification Queries
-- SELECT count(*) FROM organizations;
-- SELECT count(*) FROM users;
-- SELECT count(*) FROM quick_phrases;
