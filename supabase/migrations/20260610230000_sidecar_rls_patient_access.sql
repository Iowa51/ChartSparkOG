-- Migration: sidecar RLS read policies on public.users + public.patients
-- Date: 2026-06-10 (applied manually to prod 2026-06-09)
-- Purpose: The sidecar_assessments role is NOT a member of authenticated, so
--          OG's existing `TO authenticated` policies exclude it entirely
--          (default-deny: RLS enabled + no matching policy = zero rows).
--          These two policies mirror OG's users_select_own and
--          org_member_patients policies, scoped to the sidecar role, so the
--          assessments sidecar can resolve the requesting user's org and read
--          that org's patients under its per-transaction request.jwt.claims.
--
-- IMPORTANT: RECORD ONLY. These policies are ALREADY LIVE in production
-- (applied manually 2026-06-09). This file exists for rebuild/history --
-- do NOT `supabase db push`/replay it against prod.
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.

drop policy if exists sidecar_self_user on public.users;
create policy sidecar_self_user on public.users for select to sidecar_assessments using (id = auth.uid());

drop policy if exists sidecar_org_patients on public.patients;
create policy sidecar_org_patients on public.patients for select to sidecar_assessments using (organization_id in (select organization_id from public.users where id = auth.uid()));
