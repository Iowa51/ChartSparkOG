-- ============================================================
-- Sprint 0 / Phase 1 -- Structured, coded intake data layer
-- Plan: planning/INTAKE-ERX-PROJECT-PLAN.md v1.1
--
-- Additive only. Every new PHI table is RLS-enabled and scoped to
-- organization_id exactly like the existing core clinical tables
-- (patients, encounters, notes, vitals-intent) via the SECURITY
-- DEFINER helpers public.get_user_organization_id() / get_user_role().
--
-- Conventions matched from the existing schema:
--   * tenant scope column: organization_id UUID NOT NULL -> organizations(id)
--   * coded value domains: TEXT + CHECK (...) (OG uses CHECK, not native ENUM)
--   * created_by UUID -> users(id); updated_at bumped by update_updated_at_column()
--
-- vitals: a vitals table already exists (20260218_vitals_triage_tables.sql)
-- and already carries every column this phase requires, including a
-- NULLABLE encounter_id (guardrail 4). It is therefore NOT recreated or
-- altered here. See SCHEMA-NOTES.md for the column-name mapping and for the
-- pre-existing RLS gap on that table (flagged, intentionally not changed).
--
-- This migration is idempotent: CREATE TABLE IF NOT EXISTS, CREATE OR
-- REPLACE FUNCTION, and DROP POLICY/TRIGGER IF EXISTS before create.
-- ============================================================

-- ============================================================
-- 1. intake_templates  (specialty-configurable template catalog)
--    Catalog table (not patient PHI). organization_id NULL = system template,
--    mirroring public.note_templates. Referenced by intake_submissions.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intake_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system/global
  specialty TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  definition JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT intake_templates_specialty_name_version_key UNIQUE (specialty, name, version)
);

CREATE INDEX IF NOT EXISTS idx_intake_templates_specialty ON public.intake_templates(specialty, active);

-- ============================================================
-- 2. intake_submissions  (one row per patient intake, drives state machine)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.intake_templates(id),
  status TEXT NOT NULL DEFAULT 'patient_entered'
    CHECK (status IN ('patient_entered', 'provider_review', 'reconciled', 'signed')),
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  signed_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_patient ON public.intake_submissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_org ON public.intake_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_status ON public.intake_submissions(organization_id, status);

-- ============================================================
-- 3. problems  (coded: ICD-10-CM / SNOMED CT)
--    intake_submission_id links a reconciled row to the submission that
--    signed it, enabling the signed-row immutability lock (see triggers).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  intake_submission_id UUID REFERENCES public.intake_submissions(id) ON DELETE SET NULL,
  code_system TEXT NOT NULL CHECK (code_system IN ('icd10', 'snomed')),
  code TEXT NOT NULL,
  display TEXT,
  onset_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'provider', 'external_import')),
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_problems_patient ON public.problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_problems_org ON public.problems(organization_id);
CREATE INDEX IF NOT EXISTS idx_problems_submission ON public.problems(intake_submission_id);

-- ============================================================
-- 4. medications  (coded: RxNorm)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  intake_submission_id UUID REFERENCES public.intake_submissions(id) ON DELETE SET NULL,
  rxnorm_code TEXT,
  name TEXT NOT NULL,
  strength TEXT,
  dose TEXT,
  route TEXT,
  frequency TEXT,
  indication TEXT,
  prescriber TEXT,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed')),
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'provider', 'external_import')),
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_org ON public.medications(organization_id);
CREATE INDEX IF NOT EXISTS idx_medications_submission ON public.medications(intake_submission_id);

-- ============================================================
-- 5. allergies  (coded allergen; nkda flag for "no known drug allergies")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  intake_submission_id UUID REFERENCES public.intake_submissions(id) ON DELETE SET NULL,
  allergen_type TEXT CHECK (allergen_type IN ('drug', 'food', 'environmental')),
  allergen_code TEXT,
  allergen_display TEXT,
  reaction TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  onset DATE,
  nkda BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'provider', 'external_import')),
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient ON public.allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_org ON public.allergies(organization_id);
CREATE INDEX IF NOT EXISTS idx_allergies_submission ON public.allergies(intake_submission_id);

-- ============================================================
-- 6. family_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relative TEXT,
  condition_code TEXT,
  condition_display TEXT,
  age_at_onset INTEGER,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'provider', 'external_import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_family_history_patient ON public.family_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_history_org ON public.family_history(organization_id);

-- ============================================================
-- 7. social_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tobacco_status TEXT,
  pack_years NUMERIC,
  alcohol_audit_c INTEGER,
  substances JSONB,
  occupation TEXT,
  exercise TEXT,
  diet TEXT,
  sexual_history JSONB,
  living_situation TEXT,
  safety_screen JSONB,
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'provider', 'external_import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_social_history_patient ON public.social_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_social_history_org ON public.social_history(organization_id);

-- ============================================================
-- 8. ros_responses  (14-system review of systems, tied to a submission)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ros_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  intake_submission_id UUID NOT NULL REFERENCES public.intake_submissions(id) ON DELETE CASCADE,
  system TEXT NOT NULL CHECK (system IN (
    'constitutional', 'eyes', 'ent', 'cardiovascular', 'respiratory', 'gi', 'gu',
    'musculoskeletal', 'integumentary', 'neurological', 'psychiatric', 'endocrine',
    'heme_lymphatic', 'allergic_immunologic'
  )),
  finding TEXT NOT NULL CHECK (finding IN ('positive', 'negative')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ros_responses_patient ON public.ros_responses(patient_id);
CREATE INDEX IF NOT EXISTS idx_ros_responses_org ON public.ros_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_ros_responses_submission ON public.ros_responses(intake_submission_id);

-- ============================================================
-- 9. immunizations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.immunizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_code TEXT,
  vaccine_display TEXT,
  date DATE,
  source TEXT NOT NULL DEFAULT 'patient' CHECK (source IN ('patient', 'provider', 'external_import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_immunizations_patient ON public.immunizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_org ON public.immunizations(organization_id);

-- ============================================================
-- 10. updated_at triggers (reuse existing public.update_updated_at_column)
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'intake_templates', 'intake_submissions', 'problems', 'medications',
    'allergies', 'family_history', 'social_history', 'ros_responses', 'immunizations'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    FOREACH t IN ARRAY tables LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I '
        || 'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- 11. STATE MACHINE (server-side, non-negotiable)
--     Enforced by a table trigger so it holds regardless of entry path
--     (RPC, direct SQL, service role) -- never client-side only.
--
--     Allowed transitions (forward only, no skips):
--       patient_entered -> provider_review -> reconciled -> signed
--     On entering 'signed': capture immutable signed_snapshot if not supplied.
--     A signed submission is fully immutable (no UPDATE, no DELETE).
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_intake_submission_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'signed' THEN
      RAISE EXCEPTION 'intake_submission % is signed and cannot be deleted', OLD.id
        USING ERRCODE = 'raise_exception';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'intake_submission % is signed and immutable', OLD.id
      USING ERRCODE = 'raise_exception';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'patient_entered' AND NEW.status = 'provider_review') OR
      (OLD.status = 'provider_review' AND NEW.status = 'reconciled')      OR
      (OLD.status = 'reconciled'      AND NEW.status = 'signed')
    ) THEN
      RAISE EXCEPTION 'illegal intake_submission status transition: % -> %',
        OLD.status, NEW.status USING ERRCODE = 'raise_exception';
    END IF;

    IF NEW.status = 'signed' AND NEW.signed_snapshot IS NULL THEN
      NEW.signed_snapshot := jsonb_build_object(
        'submission_id',   NEW.id,
        'patient_id',      NEW.patient_id,
        'organization_id', NEW.organization_id,
        'template_id',     NEW.template_id,
        'responses',       NEW.responses,
        'reviewed_by',     NEW.reviewed_by,
        'signed_at',       NOW(),
        'problems',    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.problems p
                                 WHERE p.intake_submission_id = NEW.id AND p.reconciled), '[]'::jsonb),
        'medications', COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.medications m
                                 WHERE m.intake_submission_id = NEW.id AND m.reconciled), '[]'::jsonb),
        'allergies',   COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.allergies a
                                 WHERE a.intake_submission_id = NEW.id AND a.reconciled), '[]'::jsonb),
        'ros',         COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.ros_responses r
                                 WHERE r.intake_submission_id = NEW.id), '[]'::jsonb)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_intake_submission_state ON public.intake_submissions;
CREATE TRIGGER enforce_intake_submission_state
  BEFORE UPDATE OR DELETE ON public.intake_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_intake_submission_state();

-- ============================================================
-- 12. Reconciled-row immutability lock.
--     Once a submission is signed, the reconciled clinical rows and ROS
--     responses captured in its snapshot cannot be mutated in place --
--     changes must be made by inserting new rows (new versions). INSERT is
--     intentionally not blocked. Keyed on intake_submission_id.
--
--     SECURITY INVOKER: the SELECT below is RLS-scoped, but any user able to
--     UPDATE/DELETE a child row is in the same org as its submission and can
--     therefore SELECT it, so the signed check cannot be RLS-bypassed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_mutation_when_intake_signed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_submission_id UUID;
  v_signed BOOLEAN;
BEGIN
  v_submission_id := COALESCE(NEW.intake_submission_id, OLD.intake_submission_id);
  IF v_submission_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT (status = 'signed') INTO v_signed
  FROM public.intake_submissions WHERE id = v_submission_id;

  IF v_signed THEN
    RAISE EXCEPTION
      'row is locked: intake_submission % is signed; insert a new version instead',
      v_submission_id USING ERRCODE = 'raise_exception';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['problems', 'medications', 'allergies', 'ros_responses'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS block_mutation_when_signed ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER block_mutation_when_signed BEFORE UPDATE OR DELETE ON public.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.block_mutation_when_intake_signed()', t);
  END LOOP;
END $$;

-- ============================================================
-- 13. Row Level Security -- PHI intake tables.
--     Matches OG's org-scoped pattern exactly: SELECT within org (or
--     SUPER_ADMIN); INSERT/UPDATE gated to non-auditor roles and stamped
--     with the caller's org (WITH CHECK on both INSERT and UPDATE prevents
--     moving a row cross-tenant); DELETE limited to ADMIN/SUPER_ADMIN.
-- ============================================================
DO $$
DECLARE
  t TEXT;
  phi_tables TEXT[] := ARRAY[
    'intake_submissions', 'problems', 'medications', 'allergies',
    'family_history', 'social_history', 'ros_responses', 'immunizations'
  ];
BEGIN
  FOREACH t IN ARRAY phi_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ('
      || 'organization_id = public.get_user_organization_id() '
      || 'OR public.get_user_role() = ''SUPER_ADMIN'')', t || '_select', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ('
      || 'organization_id = public.get_user_organization_id() '
      || 'AND public.get_user_role() IN (''USER'', ''ADMIN'', ''SUPER_ADMIN''))',
      t || '_insert', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ('
      || 'organization_id = public.get_user_organization_id() '
      || 'AND public.get_user_role() IN (''USER'', ''ADMIN'', ''SUPER_ADMIN'')) '
      || 'WITH CHECK ('
      || 'organization_id = public.get_user_organization_id() '
      || 'AND public.get_user_role() IN (''USER'', ''ADMIN'', ''SUPER_ADMIN''))',
      t || '_update', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ('
      || 'organization_id = public.get_user_organization_id() '
      || 'AND public.get_user_role() IN (''ADMIN'', ''SUPER_ADMIN''))',
      t || '_delete', t);
  END LOOP;
END $$;

-- ============================================================
-- 14. Row Level Security -- intake_templates catalog.
--     Active templates are readable by any authenticated user (they drive
--     the patient portal + provider views). Inactive templates are visible
--     only to their owning org or a SUPER_ADMIN. System templates
--     (organization_id IS NULL) are managed by SUPER_ADMIN; org templates
--     by that org's ADMIN.
-- ============================================================
ALTER TABLE public.intake_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intake_templates_select ON public.intake_templates;
CREATE POLICY intake_templates_select ON public.intake_templates
  FOR SELECT TO authenticated
  USING (
    active = TRUE
    OR public.get_user_role() = 'SUPER_ADMIN'
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS intake_templates_superadmin_manage ON public.intake_templates;
CREATE POLICY intake_templates_superadmin_manage ON public.intake_templates
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.get_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS intake_templates_org_admin_manage ON public.intake_templates;
CREATE POLICY intake_templates_org_admin_manage ON public.intake_templates
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'ADMIN'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'ADMIN'
  );

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
