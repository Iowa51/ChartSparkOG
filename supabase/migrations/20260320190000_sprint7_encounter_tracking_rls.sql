-- ============================================================
-- Sprint 7: encounter_tracking table + RLS policies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.encounter_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS encounter_id UUID;

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS event_type TEXT;

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.encounter_tracking
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.encounter_tracking
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE public.encounter_tracking
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'encounter_tracking_pkey'
  ) THEN
    ALTER TABLE public.encounter_tracking
      ADD CONSTRAINT encounter_tracking_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'encounter_tracking_encounter_id_fkey'
  ) THEN
    ALTER TABLE public.encounter_tracking
      ADD CONSTRAINT encounter_tracking_encounter_id_fkey
      FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'encounter_tracking_organization_id_fkey'
  ) THEN
    ALTER TABLE public.encounter_tracking
      ADD CONSTRAINT encounter_tracking_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'encounter_tracking_user_id_fkey'
  ) THEN
    ALTER TABLE public.encounter_tracking
      ADD CONSTRAINT encounter_tracking_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_encounter_tracking_encounter_id
  ON public.encounter_tracking (encounter_id);

CREATE INDEX IF NOT EXISTS idx_encounter_tracking_organization_id
  ON public.encounter_tracking (organization_id);

CREATE INDEX IF NOT EXISTS idx_encounter_tracking_created_at
  ON public.encounter_tracking (created_at DESC);

ALTER TABLE public.encounter_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org encounter tracking" ON public.encounter_tracking;
DROP POLICY IF EXISTS "Users can insert org encounter tracking" ON public.encounter_tracking;
DROP POLICY IF EXISTS "Users can update org encounter tracking" ON public.encounter_tracking;
DROP POLICY IF EXISTS "Users can delete org encounter tracking" ON public.encounter_tracking;

CREATE POLICY "Users can view org encounter tracking" ON public.encounter_tracking
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() = 'SUPER_ADMIN'
  );

CREATE POLICY "Users can insert org encounter tracking" ON public.encounter_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "Users can update org encounter tracking" ON public.encounter_tracking
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "Users can delete org encounter tracking" ON public.encounter_tracking
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
  );
