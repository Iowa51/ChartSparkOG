-- Migration: entitlements (features + user_features) + ASSESSMENTS_V1 seed/grant
-- Date: 2026-06-02
-- Purpose: Create the entitlement tables the gate (useFeature/FeatureGate) needs,
--          seed ONLY the ASSESSMENTS_V1 feature, and grant it to jomanwa@gmail.com
--          so the AssessmentsTab "Feature Locked" gate unlocks for that user.
--
-- Shape mirrors supabase/schema.sql:458-577 (incl. the feature_id -> features(id)
-- FK that the PostgREST `features!inner(code)` embedded join in useFeature requires).
--
-- Idempotent and safe to re-run: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS
-- before CREATE POLICY; INSERT ... ON CONFLICT DO NOTHING.
--
-- IMPORTANT: This file was applied directly via `supabase db query --linked`
-- (Management API), NOT via migration replay. It is recorded here for version
-- control only. Do NOT `supabase db push`/replay it (prod migration history is
-- inconsistent and would hit the known public.users gap).

BEGIN;

-- ============================================================================
-- 1. features catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier_required TEXT NOT NULL CHECK (tier_required IN ('STARTER','PROFESSIONAL','COMPLETE','ADMIN','SUPER_ADMIN')),
  category TEXT NOT NULL CHECK (category IN ('CORE','CLINICAL','AI','INTEGRATION','ADMIN','SUPER_ADMIN')),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. user_features junction (FK feature_id -> features(id) is load-bearing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_by UUID REFERENCES public.users(id),
  revoked_at TIMESTAMPTZ,
  is_tier_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, feature_id)
);

-- ============================================================================
-- 3. indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_features_tier         ON public.features(tier_required);
CREATE INDEX IF NOT EXISTS idx_features_category     ON public.features(category);
CREATE INDEX IF NOT EXISTS idx_features_code         ON public.features(code);
CREATE INDEX IF NOT EXISTS idx_user_features_user    ON public.user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_enabled ON public.user_features(user_id, enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_features_feature ON public.user_features(feature_id);

-- ============================================================================
-- 4. RLS + policies (helpers public.get_user_role / public.get_user_organization_id
--    and role `authenticated` were confirmed present in prod during pre-flight)
-- ============================================================================
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;

-- features: read-only catalog for any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view features" ON public.features;
CREATE POLICY "Authenticated users can view features"
  ON public.features FOR SELECT TO authenticated USING (TRUE);

-- features: only SUPER_ADMIN can modify
DROP POLICY IF EXISTS "Super admins can manage features" ON public.features;
CREATE POLICY "Super admins can manage features"
  ON public.features FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.get_user_role() = 'SUPER_ADMIN');

-- user_features: users can view their own
DROP POLICY IF EXISTS "Users can view own features" ON public.user_features;
CREATE POLICY "Users can view own features"
  ON public.user_features FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- user_features: admins can view features of users in their org
DROP POLICY IF EXISTS "Admins can view org user features" ON public.user_features;
CREATE POLICY "Admins can view org user features"
  ON public.user_features FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('ADMIN','SUPER_ADMIN')
    AND EXISTS (SELECT 1 FROM public.users u
                 WHERE u.id = user_features.user_id
                   AND u.organization_id = public.get_user_organization_id())
  );

-- user_features: admins can update features of users in their org
DROP POLICY IF EXISTS "Admins can update org user features" ON public.user_features;
CREATE POLICY "Admins can update org user features"
  ON public.user_features FOR UPDATE TO authenticated
  USING (
    public.get_user_role() IN ('ADMIN','SUPER_ADMIN')
    AND EXISTS (SELECT 1 FROM public.users u
                 WHERE u.id = user_features.user_id
                   AND u.organization_id = public.get_user_organization_id())
  );

-- user_features: admins can insert features for users in their org
DROP POLICY IF EXISTS "Admins can insert org user features" ON public.user_features;
CREATE POLICY "Admins can insert org user features"
  ON public.user_features FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('ADMIN','SUPER_ADMIN')
    AND EXISTS (SELECT 1 FROM public.users u
                 WHERE u.id = user_features.user_id
                   AND u.organization_id = public.get_user_organization_id())
  );

-- user_features: SUPER_ADMIN can view all
DROP POLICY IF EXISTS "Super admins can view all user features" ON public.user_features;
CREATE POLICY "Super admins can view all user features"
  ON public.user_features FOR SELECT TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN');

-- user_features: SUPER_ADMIN can manage all
DROP POLICY IF EXISTS "Super admins can manage all user features" ON public.user_features;
CREATE POLICY "Super admins can manage all user features"
  ON public.user_features FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.get_user_role() = 'SUPER_ADMIN');

-- ============================================================================
-- 5. Seed ONLY the ASSESSMENTS_V1 feature (no other catalog codes)
-- ============================================================================
INSERT INTO public.features (code, name, description, tier_required, category, display_order)
VALUES (
  'ASSESSMENTS_V1',
  'Rating Scales (Assessments)',
  'Behavioral-health rating scales tab (PHQ-9, GAD-7, C-SSRS, and more)',
  'PROFESSIONAL',
  'CLINICAL',
  30
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. Grant ASSESSMENTS_V1 to jomanwa@gmail.com (enabled, no expiry)
--    (resolves to public.users id 170db033-5710-443a-903f-799b6d9ef1ca)
-- ============================================================================
INSERT INTO public.user_features (user_id, feature_id, enabled)
SELECT u.id, f.id, TRUE
FROM public.users u
JOIN public.features f ON f.code = 'ASSESSMENTS_V1'
WHERE u.email = 'jomanwa@gmail.com'
ON CONFLICT (user_id, feature_id) DO NOTHING;

COMMIT;
