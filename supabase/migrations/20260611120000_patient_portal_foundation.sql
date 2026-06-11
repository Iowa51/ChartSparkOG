-- ============================================================
-- GATED MANUAL APPLY — do not replay blindly.
--
-- PRD-02 — Patient Portal v1, Phase P0 (OG-side foundation).
-- DRAFT: apply manually via the gated prod path
-- (`supabase db query --linked --file`), NOT via `supabase db push`.
-- Substitute the CREATE ROLE password placeholder from the secrets
-- vault at apply time, then record the apply (with verification
-- evidence) in supabase/MIGRATION_LEDGER.md.
--
-- Contents:
--   1. patient_portal_users + patient_portal_invites tables
--      (PRD-02 data model, features/02-patient-portal.md:88-116)
--   2. RLS on both; clinician-side org-scoped policies (TO authenticated)
--   3. patient_portal Postgres role (NOINHERIT LOGIN, least privilege)
--   4. Patient-scoped SELECT policies TO patient_portal — additive only;
--      no existing RLS policy is modified
--
-- Invite tokens follow the telehealth_invite_tokens model: the invite
-- URL carries an opaque 32-byte token; only its SHA-256 hash is stored
-- and the plaintext is never persisted. TTL is 7 days (portal-
-- appropriate, vs telehealth's 15 minutes); single-use via claimed_at.
-- ============================================================

-- =========================================================================
-- 1. Tables
-- =========================================================================

-- Portal user accounts (separate from clinician users). No org column:
-- org scope derives from patients.organization_id via patient_id.
CREATE TABLE patient_portal_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE NOT NULL, -- Supabase Auth ID (separate auth namespace)
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  mfa_enrolled BOOLEAN DEFAULT FALSE,
  mfa_enforced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Invite tokens. org_id (not organization_id) per the PRD-02 data model
-- and master PRD §3.2 (portal-feature tables follow the sidecar
-- convention). claimed_at is the single-use marker.
CREATE TABLE patient_portal_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  token_hash TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES patient_portal_users(id)
);

-- =========================================================================
-- 2. Indexes
-- =========================================================================

CREATE INDEX idx_portal_invites_patient
  ON patient_portal_invites (patient_id, invited_at DESC);

CREATE INDEX idx_portal_invites_expires
  ON patient_portal_invites (expires_at);

-- =========================================================================
-- 3. RLS — clinician side (TO authenticated, org-scoped)
-- =========================================================================

ALTER TABLE patient_portal_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_portal_invites ENABLE ROW LEVEL SECURITY;

-- OG staff manage invites for their own org. No DELETE policy on
-- purpose: invites are expired (expires_at = NOW()), never deleted by
-- staff, so the invite trail stays auditable; default-deny covers the
-- rest.
CREATE POLICY patient_portal_invites_select ON patient_portal_invites
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- WITH CHECK also pins patient_id to the caller's org so a mismatched
-- (own org_id, foreign patient_id) row can never be inserted.
CREATE POLICY patient_portal_invites_insert ON patient_portal_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND patient_id IN (
      SELECT id FROM patients
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY patient_portal_invites_update ON patient_portal_invites
  FOR UPDATE TO authenticated
  USING      (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Clinicians view portal-account linkage for their org's patients.
-- Read-only: accounts are created by the portal claim flow (later
-- phase), never by OG staff.
CREATE POLICY patient_portal_users_clinician_select ON patient_portal_users
  FOR SELECT TO authenticated
  USING (patient_id IN (
    SELECT id FROM patients
    WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

-- =========================================================================
-- 4. patient_portal Postgres role — least privilege
-- =========================================================================

-- Substitute the password from the secrets vault at apply time.
-- NOINHERIT so the role never picks up privileges via group membership.
CREATE ROLE patient_portal NOINHERIT LOGIN PASSWORD '<rotated_via_vault>';

GRANT USAGE ON SCHEMA public TO patient_portal;

-- Minimal grants — exactly the v1 read slice. Later phases add their
-- own grants in their own migrations (e.g. EXECUTE on
-- public.write_audit_log when the portal app ships; INSERT/UPDATE for
-- the invite-claim flow).
GRANT SELECT ON patient_portal_users       TO patient_portal;
GRANT SELECT ON patients                   TO patient_portal;
GRANT SELECT ON assessment_assignments     TO patient_portal;
GRANT SELECT ON assessment_administrations TO patient_portal;
GRANT SELECT ON assessment_results         TO patient_portal;

-- =========================================================================
-- 5. RLS — patient side (TO patient_portal; additive, new policies only)
-- =========================================================================

-- Lesson from the sidecar RLS work (20260610230000): roles not named in
-- a policy are default-denied. Every table the portal reads needs an
-- explicit policy for patient_portal.

-- Self row only. This policy also powers the scalar subqueries in the
-- policies below — they evaluate under the querying role's RLS.
CREATE POLICY portal_users_self ON patient_portal_users
  FOR SELECT TO patient_portal
  USING (auth_user_id = auth.uid());

-- Patient sees only their own demographics row.
CREATE POLICY portal_patient_self ON patients
  FOR SELECT TO patient_portal
  USING (id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY portal_assignments_self ON assessment_assignments
  FOR SELECT TO patient_portal
  USING (patient_id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY portal_administrations_self ON assessment_administrations
  FOR SELECT TO patient_portal
  USING (patient_id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));

-- assessment_results carries patient_id directly (verified against the
-- sidecar migration 20260527130000_create_assessments_tables.sql), so
-- no administration join is needed.
CREATE POLICY portal_results_self ON assessment_results
  FOR SELECT TO patient_portal
  USING (patient_id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));
