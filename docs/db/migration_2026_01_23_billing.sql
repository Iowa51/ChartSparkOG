-- CHARTSPARK BILLING SYSTEM MIGRATION
-- Generated: 2026-01-23
-- Purpose: Add tables for subscription and managed billing system

-- ============================================
-- PART A: SUBSCRIPTION TABLES
-- ============================================

-- Subscription Tiers (STARTER, ELITE)
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL CHECK (code IN ('STARTER', 'ELITE')),
    name TEXT NOT NULL,
    description TEXT,
    monthly_price INTEGER NOT NULL, -- in cents
    annual_price INTEGER, -- in cents (optional discount)
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Add-ons
CREATE TABLE IF NOT EXISTS subscription_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    monthly_price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Plans
CREATE TABLE IF NOT EXISTS team_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_id UUID REFERENCES subscription_tiers(id),
    min_seats INTEGER NOT NULL DEFAULT 1,
    max_seats INTEGER,
    price_per_seat INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES subscription_tiers(id),
    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired', 'read_only')) DEFAULT 'trialing',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    read_only_started_at TIMESTAMP WITH TIME ZONE,
    deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Organization Add-ons
CREATE TABLE IF NOT EXISTS organization_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES subscription_addons(id),
    quantity INTEGER DEFAULT 1,
    stripe_subscription_item_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART B: MANAGED BILLING TABLES
-- ============================================

-- Managed Billing Subscriptions (organizations using our billing service)
CREATE TABLE IF NOT EXISTS managed_billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'suspended', 'canceled')) DEFAULT 'pending',
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    fee_percentage DECIMAL(5,2) DEFAULT 5.0,
    payer_credentials JSONB DEFAULT '{}', -- Encrypted
    practice_npi TEXT,
    practice_tax_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Billing Claims
CREATE TABLE IF NOT EXISTS billing_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    claim_number TEXT UNIQUE NOT NULL,
    service_date TIMESTAMP WITH TIME ZONE NOT NULL,
    diagnosis_codes TEXT[] DEFAULT '{}',
    procedure_codes TEXT[] DEFAULT '{}',
    billed_amount INTEGER DEFAULT 0, -- in cents
    allowed_amount INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    adjustment_amount INTEGER DEFAULT 0,
    patient_responsibility INTEGER DEFAULT 0,
    place_of_service TEXT DEFAULT '11',
    payer_name TEXT,
    payer_id TEXT,
    payer_claim_number TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'submitted', 'accepted', 'rejected', 'paid', 'denied', 'appealed')) DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    era_received BOOLEAN DEFAULT false,
    era_received_at TIMESTAMP WITH TIME ZONE,
    era_file_id UUID,
    payment_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection Periods
CREATE TABLE IF NOT EXISTS collection_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'invoiced', 'paid')) DEFAULT 'open',
    total_claims INTEGER DEFAULT 0,
    total_billed INTEGER DEFAULT 0,
    total_collected INTEGER DEFAULT 0,
    management_fee INTEGER DEFAULT 0,
    net_to_client INTEGER DEFAULT 0,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claim Status History
CREATE TABLE IF NOT EXISTS claim_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES billing_claims(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing Audit Log
CREATE TABLE IF NOT EXISTS billing_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Schedules
CREATE TABLE IF NOT EXISTS fee_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    payer_name TEXT,
    effective_date DATE NOT NULL,
    end_date DATE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Schedule Items
CREATE TABLE IF NOT EXISTS fee_schedule_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_schedule_id UUID NOT NULL REFERENCES fee_schedules(id) ON DELETE CASCADE,
    cpt_code TEXT NOT NULL,
    description TEXT,
    allowed_amount INTEGER NOT NULL, -- in cents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claim Denials
CREATE TABLE IF NOT EXISTS claim_denials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES billing_claims(id) ON DELETE CASCADE,
    denial_code TEXT NOT NULL,
    denial_reason TEXT,
    denial_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    appeal_deadline TIMESTAMP WITH TIME ZONE,
    appeal_status TEXT CHECK (appeal_status IN ('pending', 'submitted', 'approved', 'denied')),
    appeal_submitted_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    period_id UUID REFERENCES collection_periods(id),
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    total_claims INTEGER DEFAULT 0,
    total_billed INTEGER DEFAULT 0,
    total_collected INTEGER DEFAULT 0,
    management_fee INTEGER DEFAULT 0,
    net_to_client INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue')) DEFAULT 'draft',
    due_date TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES billing_claims(id) ON DELETE SET NULL,
    patient_name TEXT,
    service_date TIMESTAMP WITH TIME ZONE,
    procedure_codes TEXT[] DEFAULT '{}',
    billed_amount INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    adjustment_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART C: CLEARINGHOUSE TABLES
-- ============================================

-- Global Clearinghouse Config (Super Admin manages)
CREATE TABLE IF NOT EXISTS global_clearinghouse_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clearinghouse TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    sftp_host TEXT,
    sftp_port INTEGER DEFAULT 22,
    sftp_username TEXT,
    sftp_password_encrypted TEXT,
    submitter_id TEXT,
    submitter_name TEXT NOT NULL DEFAULT 'ChartSpark',
    submitter_npi TEXT,
    submitter_tax_id TEXT,
    supports_era BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claim Submissions
CREATE TABLE IF NOT EXISTS claim_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES billing_claims(id) ON DELETE CASCADE,
    clearinghouse TEXT NOT NULL,
    submission_method TEXT CHECK (submission_method IN ('api', 'sftp', 'manual', 'error')),
    edi_file_content TEXT,
    clearinghouse_claim_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'error')) DEFAULT 'pending',
    response_message TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ERA Files
CREATE TABLE IF NOT EXISTS era_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_content TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'processed', 'error')) DEFAULT 'pending',
    total_claims INTEGER DEFAULT 0,
    claims_matched INTEGER DEFAULT 0,
    claims_unmatched INTEGER DEFAULT 0,
    total_paid INTEGER DEFAULT 0,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ERA Payments
CREATE TABLE IF NOT EXISTS era_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    era_file_id UUID NOT NULL REFERENCES era_files(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES billing_claims(id) ON DELETE SET NULL,
    payer_claim_number TEXT,
    patient_control_number TEXT,
    service_date DATE,
    billed_amount INTEGER DEFAULT 0,
    allowed_amount INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    patient_responsibility INTEGER DEFAULT 0,
    adjustment_reason_codes JSONB DEFAULT '[]',
    matched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_org ON billing_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_status ON billing_claims(status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_patient ON billing_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_service_date ON billing_claims(service_date);
CREATE INDEX IF NOT EXISTS idx_collection_periods_org ON collection_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_claim_status_history_claim ON claim_status_history(claim_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_log_org ON billing_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_log_entity ON billing_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_era_files_org ON era_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_era_payments_claim ON era_payments(claim_id);

-- ============================================
-- SEED DATA
-- ============================================

-- Seed subscription tiers
INSERT INTO subscription_tiers (code, name, description, monthly_price, annual_price, features) VALUES
('STARTER', 'Starter', 'Essential features for solo practitioners', 9900, 95000, '["Basic AI notes", "Up to 50 patients", "Email support"]'),
('ELITE', 'Elite', 'Full-featured for growing practices', 19900, 191000, '["Advanced AI notes", "Unlimited patients", "Priority support", "Custom templates", "Analytics dashboard", "Managed billing option"]')
ON CONFLICT (code) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    features = EXCLUDED.features;

-- Seed clearinghouse configs (inactive by default)
INSERT INTO global_clearinghouse_config (clearinghouse, display_name, is_active) VALUES
('office_ally', 'Office Ally', false),
('claim_md', 'Claim.MD', false),
('availity', 'Availity', false)
ON CONFLICT (clearinghouse) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Everyone can read tiers
CREATE POLICY "anyone_read_tiers" ON subscription_tiers FOR SELECT TO authenticated USING (true);

-- Organization members can see their subscription
CREATE POLICY "org_member_subscription" ON organization_subscriptions FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Super admin full access
CREATE POLICY "super_admin_all_subscriptions" ON organization_subscriptions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));

-- Billing claims: org members can view, admins can manage
CREATE POLICY "org_member_claims_view" ON billing_claims FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "admin_claims_manage" ON billing_claims FOR ALL TO authenticated
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

-- Collection periods: org admins only
CREATE POLICY "admin_periods" ON collection_periods FOR ALL TO authenticated
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

-- ERA files: org admins only
CREATE POLICY "admin_era_files" ON era_files FOR ALL TO authenticated
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
