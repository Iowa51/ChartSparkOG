-- ============================================================
-- Sprint 0 / Phase 1 -- FIX for CODEX-REVIEW-P1 item 7 (vitals RLS remediation)
--
-- Pre-existing condition (NOT introduced by Phase 1): vitals and its sibling
-- tables from 20260218_vitals_triage_tables.sql ship permissive RLS --
-- USING(true) / WITH CHECK(true) -- with zero tenant isolation. This is a live
-- cross-tenant PHI exposure (see item 7.4). This dedicated, separately-reviewed
-- migration tightens all four tables to the org-scoped pattern used by the new
-- intake tables (20260706120000), using the SECURITY DEFINER helpers
-- public.get_user_organization_id() / public.get_user_role().
--
-- Safe to ship: every app path is either already org-stamped in application
-- code (F-033, SEC-CODEX-2) or reads via the authenticated client where the
-- org-scoped SELECT auto-scopes it (full path enumeration in item 7.2). No
-- service-role/anon path depends on the permissive policy. The INSERT role
-- gate MUST include USER -- front-line clinicians enter vitals/screenings.
--
-- Additive & idempotent: DROP POLICY IF EXISTS before each CREATE. Tables and
-- RLS-enable already exist from the vitals migration.
-- ============================================================

-- ============================================================
-- vitals -- SELECT/INSERT/UPDATE/DELETE, org-scoped, DELETE role-gated.
-- ============================================================
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vitals_select" ON public.vitals;
CREATE POLICY vitals_select ON public.vitals FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
         OR public.get_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "vitals_insert" ON public.vitals;
CREATE POLICY vitals_insert ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "vitals_update" ON public.vitals;
CREATE POLICY vitals_update ON public.vitals FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id()
         AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "vitals_delete" ON public.vitals;
CREATE POLICY vitals_delete ON public.vitals FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id()
         AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- screening_scores -- SELECT/INSERT org-scoped + DELETE role-gated.
-- (No UPDATE policy: no app path updates screenings; deny-by-default.)
-- ============================================================
ALTER TABLE public.screening_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "screenings_select" ON public.screening_scores;
CREATE POLICY screenings_select ON public.screening_scores FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
         OR public.get_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "screenings_insert" ON public.screening_scores;
CREATE POLICY screenings_insert ON public.screening_scores FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "screenings_delete" ON public.screening_scores;
CREATE POLICY screenings_delete ON public.screening_scores FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id()
         AND public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- smart_triage_results -- SELECT/INSERT/UPDATE org-scoped (cache is written
-- and acknowledged/updated by clinicians). No DELETE: deny-by-default.
-- ============================================================
ALTER TABLE public.smart_triage_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "triage_select" ON public.smart_triage_results;
CREATE POLICY triage_select ON public.smart_triage_results FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
         OR public.get_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "triage_insert" ON public.smart_triage_results;
CREATE POLICY triage_insert ON public.smart_triage_results FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "triage_update" ON public.smart_triage_results;
CREATE POLICY triage_update ON public.smart_triage_results FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id()
         AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- medication_interaction_log -- immutable audit trail: org-scoped SELECT +
-- INSERT only, no UPDATE/DELETE (deny-by-default preserves the trail).
-- ============================================================
ALTER TABLE public.medication_interaction_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interaction_log_select" ON public.medication_interaction_log;
CREATE POLICY interaction_log_select ON public.medication_interaction_log FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
         OR public.get_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "interaction_log_insert" ON public.medication_interaction_log;
CREATE POLICY interaction_log_insert ON public.medication_interaction_log FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
