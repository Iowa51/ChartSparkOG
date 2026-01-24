-- ============================================================
-- CHARTSPARK SUBSCRIPTION SYSTEM TABLES
-- Created: 2026-01-23
-- These are ALL NEW tables - no conflicts with existing schema
-- ============================================================

-- 1. Subscription Tiers (NEW TABLE)
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- in cents (9900 = $99.00)
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the two tiers
INSERT INTO subscription_tiers (code, name, description, price_monthly, display_order) VALUES
('STARTER', 'Starter', 'Everything you need to run your practice with AI assistance', 9900, 1),
('ELITE', 'Elite', 'Enterprise-grade clinical intelligence with advanced AI features', 19900, 2)
ON CONFLICT (code) DO NOTHING;

-- 2. Subscription Add-ons (NEW TABLE)
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  feature_code TEXT NOT NULL,
  compatible_tiers TEXT[] NOT NULL,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert AI Coding add-on
INSERT INTO subscription_addons (code, name, description, price_monthly, feature_code, compatible_tiers) VALUES
('AI_CODING_ADDON', 'AI Medical Coding', 'Add AI-powered CPT/ICD-10 coding to your Starter plan', 5000, 'AI_MEDICAL_CODING', ARRAY['STARTER'])
ON CONFLICT (code) DO NOTHING;

-- 3. Team Plans (NEW TABLE)
CREATE TABLE IF NOT EXISTS team_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  max_users INTEGER NOT NULL,
  price_monthly INTEGER NOT NULL,
  base_tier TEXT NOT NULL,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO team_plans (code, name, max_users, price_monthly, base_tier) VALUES
('TEAM_SMALL', 'Team (2-5 users)', 5, 39900, 'STARTER'),
('TEAM_MEDIUM', 'Team (6-10 users)', 10, 69900, 'STARTER'),
('TEAM_SMALL_ELITE', 'Team Elite (2-5 users)', 5, 79900, 'ELITE'),
('TEAM_MEDIUM_ELITE', 'Team Elite (6-10 users)', 10, 129900, 'ELITE')
ON CONFLICT (code) DO NOTHING;

-- 4. Organization Subscriptions (NEW TABLE)
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES subscription_tiers(id),
  team_plan_id UUID REFERENCES team_plans(id),
  
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled', 'expired', 'read_only'
  )),
  
  -- Trial tracking
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  
  -- Active subscription tracking
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Stripe references
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Cancellation tracking
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  
  -- Grace period tracking
  read_only_started_at TIMESTAMPTZ,
  deletion_scheduled_at TIMESTAMPTZ,
  
  -- Limits
  max_users INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- 5. Organization Add-ons (NEW TABLE)
CREATE TABLE IF NOT EXISTS organization_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES subscription_addons(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
  stripe_subscription_item_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, addon_id)
);

-- 6. Managed Billing Subscriptions (NEW TABLE - for future use)
CREATE TABLE IF NOT EXISTS managed_billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'canceled')),
  base_fee INTEGER NOT NULL DEFAULT 14900,
  percentage_fee DECIMAL(4,2) NOT NULL DEFAULT 3.00,
  stripe_subscription_id TEXT,
  billing_cycle_start INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- 7. Billing Claims (NEW TABLE - for future use)
CREATE TABLE IF NOT EXISTS billing_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID,
  note_id UUID,
  
  claim_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ready', 'submitted', 'accepted', 'rejected', 
    'paid', 'denied', 'appealed', 'written_off'
  )),
  
  cpt_codes JSONB,
  icd10_codes JSONB,
  modifiers JSONB,
  
  billed_amount INTEGER,
  allowed_amount INTEGER,
  paid_amount INTEGER,
  patient_responsibility INTEGER,
  adjustment_amount INTEGER,
  
  payer_id TEXT,
  payer_name TEXT,
  payer_claim_number TEXT,
  
  service_date DATE,
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  denial_reason TEXT,
  denial_code TEXT,
  
  payment_reported_by_client BOOLEAN DEFAULT FALSE,
  payment_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Collection Periods (NEW TABLE - for future use)
CREATE TABLE IF NOT EXISTS collection_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_billed INTEGER DEFAULT 0,
  total_collected INTEGER DEFAULT 0,
  claims_submitted INTEGER DEFAULT 0,
  claims_paid INTEGER DEFAULT 0,
  claims_denied INTEGER DEFAULT 0,
  base_fee INTEGER NOT NULL,
  percentage_fee DECIMAL(4,2) NOT NULL,
  calculated_percentage_amount INTEGER,
  total_invoice_amount INTEGER,
  invoice_generated_at TIMESTAMPTZ,
  invoice_paid_at TIMESTAMPTZ,
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_org_status ON billing_claims(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_org_date ON billing_claims(organization_id, service_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_tiers (public read for active)
CREATE POLICY "Anyone can view active tiers" ON subscription_tiers
  FOR SELECT USING (is_active = TRUE);

-- RLS Policies for subscription_addons (public read for active)
CREATE POLICY "Anyone can view active addons" ON subscription_addons
  FOR SELECT USING (is_active = TRUE);

-- RLS Policies for team_plans (public read for active)
CREATE POLICY "Anyone can view active team plans" ON team_plans
  FOR SELECT USING (is_active = TRUE);

-- RLS Policies for organization_subscriptions
CREATE POLICY "Users can view own org subscription" ON organization_subscriptions
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Super admin full access subscriptions" ON organization_subscriptions
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- RLS Policies for organization_addons
CREATE POLICY "Users can view own org addons" ON organization_addons
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Super admin full access org addons" ON organization_addons
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- RLS Policies for managed_billing_subscriptions
CREATE POLICY "Users can view own org managed billing" ON managed_billing_subscriptions
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Super admin full access managed billing" ON managed_billing_subscriptions
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- RLS Policies for billing_claims
CREATE POLICY "Users can view org billing claims" ON billing_claims
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

CREATE POLICY "Users can manage org billing claims" ON billing_claims
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

-- RLS Policies for collection_periods
CREATE POLICY "Users can view org collection periods" ON collection_periods
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

CREATE POLICY "Admins can manage org collection periods" ON collection_periods
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- ============================================================
-- UPDATE EXISTING FEATURES TABLE
-- Add tier_required column if it doesn't exist
-- ============================================================

ALTER TABLE features ADD COLUMN IF NOT EXISTS tier_required TEXT;

-- Update existing features with their tier requirements
-- This does NOT delete or replace features, just adds tier info

UPDATE features SET tier_required = 'STARTER' WHERE code IN (
  'DASHBOARD', 'PATIENTS', 'PATIENTS_VIEW', 'PATIENTS_CREATE', 'PATIENTS_EDIT',
  'ENCOUNTERS', 'TEMPLATES', 'BASIC_TEMPLATES', 'CUSTOM_TEMPLATES',
  'REFERENCES', 'BASIC_REFERENCES', 'FULL_REFERENCES',
  'GERIATRIC_GUIDE',
  'NOTES_VIEW', 'NOTES_CREATE', 'AI_NOTE_GENERATION',
  'AI_SCRIBE',
  'CALENDAR',
  'TELEHEALTH',
  'BILLING', 'BILLING_VIEW',
  'QUICK_PHRASES'
) AND tier_required IS NULL;

UPDATE features SET tier_required = 'ELITE' WHERE code IN (
  'AI_MEDICAL_CODING', 'AI_CODING',
  'AI_TREATMENT', 'AI_TREATMENT_PLAN',
  'AI_DIAGNOSIS', 'AI_DIAGNOSTICS',
  'ADVANCED_ANALYTICS', 'ANALYTICS',
  'E_PRESCRIBE', 'EPRESCRIBE',
  'EHR_INTEGRATION',
  'API_ACCESS',
  'PRIORITY_SUPPORT'
) AND tier_required IS NULL;
