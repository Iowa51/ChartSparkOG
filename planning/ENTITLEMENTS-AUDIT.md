# ENTITLEMENTS AUDIT — AssessmentsTab "Feature Locked" gate

**Date:** 2026-06-02
**Mode:** READ-ONLY audit. Nothing was created, altered, seeded, or migrated in any database. The proposed migration at the end was **NOT run**.
**Prod DB inspected:** `eepwbtdqtdnqxeznykbh` (confirmed against `.env.local` → `NEXT_PUBLIC_SUPABASE_URL=https://eepwbtdqtdnqxeznykbh.supabase.co`; matches `docs/STATE-OF-TRUTH.md` + Decision #11). The deprecated project `locfqctrmbfwsfmcmhbc` was **not** touched.
**Inspection method:** PostgREST REST API (`/rest/v1/`) with the service-role key from `.env.local`, GET/SELECT only (`Prefer: count=exact`). The service-role key was loaded into a shell variable and never printed. No SQL DDL/DML was possible or attempted over this channel.

---

## TL;DR

- The gate is the **`features` / `user_features`** entitlement system, queried client-side by `useFeature()` and rendered by `FeatureGate` (its `LockedFeature` fallback is the literal "Feature Locked" UI).
- The exact feature key AssessmentsTab requires is **`ASSESSMENTS_V1`**.
- **In prod, all of `public.features`, `public.user_features`, and `public.feature_flags` are MISSING** (live `404 / PGRST205`). Therefore `useFeature('ASSESSMENTS_V1')` errors → fails closed → "Feature Locked", exactly as `planning/FEATURE-STATUS.md` describes.
- These tables exist only in `supabase/schema.sql` (a baseline dump). **No file in `supabase/migrations/` ever creates them**, so a migration-built prod never got them.
- Even if `features` existed and were seeded from `schema.sql`, **`ASSESSMENTS_V1` is not in that seed** — so a second gap (missing catalog row) would still block the gate.

---

## STEP 1 — The gate logic (code trace, read-only)

### Where "Feature Locked" comes from
`src/components/FeatureGate.tsx`
- `FeatureGate` (line 18) calls `useFeature(feature)` (line 24). When `!hasFeature` and no `fallback` is provided, it renders `LockedFeature` (line 34).
- `LockedFeature` (line 48) renders the heading **"Feature Locked"** (line 64) and the copy *"This feature is not included in your current plan or has not been enabled for your account."* (line 67). This is the exact screen the user sees.

### The entitlement check
`src/hooks/useFeature.ts` → `useFeature(featureCode)` (line 22):
- Uses the **browser/anon** Supabase client (`createClient()` from `@/lib/supabase/client`, line 30) → **runs client-side, under RLS** as the logged-in (`authenticated`) user.
- If there is no client (demo mode), it returns `hasFeature = true` (line 33). `.env.local` has `NEXT_PUBLIC_DEMO_MODE=false`, so this bypass is **not** active in prod.
- If no logged-in user → `hasFeature = false` (line 41).
- The query (lines 47–57):
  ```ts
  supabase
    .from('user_features')
    .select(`enabled, expires_at, features!inner(code)`)
    .eq('user_id', user.id)
    .eq('features.code', featureCode)   // featureCode === 'ASSESSMENTS_V1'
    .eq('enabled', true)
    .maybeSingle()
  ```
- **Fail-closed everywhere:** query error → `hasFeature = false` (lines 59–66); no row → `false` (lines 68–70); expired (`expires_at < now`) → `false` (lines 73–74); otherwise `hasFeature = data.enabled` (line 76). Exceptions also deny (lines 81–87).

**Load-bearing detail:** `features!inner(code)` is a PostgREST **embedded resource** join. It only resolves if a foreign key `user_features.feature_id → features.id` exists. The proposed schema includes that FK; without it the gate query errors → fail-closed even if both tables exist.

### Tables/columns the gate touches
- `user_features` — columns read: `user_id`, `feature_id` (implicit, for the join), `enabled`, `expires_at`.
- `features` — column read: `code` (and `id` for the FK join).
- **Feature key:** `'ASSESSMENTS_V1'`.

### The feature key, and where AssessmentsTab lives
- `ASSESSMENTS_V1` is **not** in `main`'s `FeatureCode` union (`src/lib/types/database.ts:31-80`). It is added by the WIP stash:
  - `git stash@{0}` ("On feature/assessments-tab: tier6-assessmentstab-wip-against-main-branch") changes `src/lib/types/database.ts` to add `| 'ASSESSMENTS_V1'` to the **PROFESSIONAL (CLINICAL & AI)** block, right after `EXPORT_DATA`.
  - The same stash edits `src/app/(app)/patients/[id]/page.tsx` to add an `"assessments"` tab that lazy-loads `@/components/patients/AssessmentsTab` and renders `<AssessmentsTab patientId={patientId} />`.
- The legacy `src/components/vitals/ScreeningPanel.tsx` carries a `@deprecated` banner: *"will be replaced by AssessmentsTab once ASSESSMENTS_V1 reaches GA … see src/components/patients/AssessmentsTab.tsx as the canonical replacement."*
- **`src/components/patients/AssessmentsTab.tsx` is not present in any branch or the working tree** — it survives only as a build artifact (`.next/dev/.../src_components_patients_AssessmentsTab_tsx_*`). The exact in-component gate line could not be read from source. Given the "Feature Locked" copy is produced solely by `FeatureGate`/`LockedFeature`, the gate is `FeatureGate feature="ASSESSMENTS_V1"` (equivalently `useFeature('ASSESSMENTS_V1')`); the underlying query is identical either way.

### The entitlement system is otherwise dormant on `main`
- `useFeature(...)` is invoked **only inside `FeatureGate.tsx`**, and `<FeatureGate>` is **not rendered anywhere** in the current `main` tree (admin pages import only the presentational `FeatureBadge`). So nothing on `main` reads `features`/`user_features` at runtime today — which is why prod functions despite the tables being absent. **AssessmentsTab is the first real consumer.**
- Note: `SubscriptionFeatureGate` in `src/components/subscriptions/upgrade-prompt.tsx` is a **separate** mechanism (calls `/api/subscriptions/check-feature`) and is unrelated to this gate.

---

## STEP 2 — Prod schema state (live, read-only against `eepwbtdqtdnqxeznykbh`)

### Method validation
Known tables responded correctly, proving "404 = missing" vs "200/206 = exists":

| Probe table | HTTP | Content-Range |
|---|---|---|
| `fee_schedules` | 200 | `*/0` (exists, empty) |
| `note_templates` | 200 | `*/0` (exists, empty) |
| `organizations` | 206 | `0-0/7` (exists, 7 rows) |

### Target tables — all MISSING

| Table | HTTP | Result |
|---|---|---|
| `public.features` | **404** | `PGRST205 — Could not find the table 'public.features' in the schema cache` (hint: "Perhaps you meant 'public.fee_schedules'") |
| `public.user_features` | **404** | `PGRST205 — Could not find the table 'public.user_features'` (hint: "public.user_recovery_codes") |
| `public.feature_flags` | **404** | `PGRST205 — Could not find the table 'public.feature_flags'` (hint: "public.audit_flags") |
| `features?code=eq.ASSESSMENTS_V1` | **404** | same PGRST205 (table itself absent) |

The PGRST205 hints point at real `public.*` tables, confirming PostgREST exposes the `public` schema and these three tables genuinely do not exist (not merely hidden). For tables that don't exist, **columns/types, PK/FK, RLS state, row counts, and samples are all N/A.**

> Limitation: the service-role REST channel cannot read `information_schema`/`pg_catalog`, cannot observe `relrowsecurity` (RLS on/off), and service-role bypasses RLS anyway. Table **existence** and **row counts**, however, are unambiguous from the responses above. RLS/policy state can only be confirmed with SQL access (see open questions).

### Why they're missing (root cause)
- `features` + `user_features` are defined **only** in `supabase/schema.sql` (lines **458–577**: tables, indexes, `ENABLE ROW LEVEL SECURITY`, 7 policies, plus a seed block at 582–636).
- A grep of `supabase/migrations/*.sql` finds **no `CREATE TABLE` for `features`, `user_features`, or `feature_flags`**. `schema.sql` is a baseline/reference dump that was never converted into an applied migration, so a prod built from the migration ledger never received these tables.
- `feature_flags` (and the key `rating_scales_enabled` from `chartspark-prd/features/01-rating-scales.md` "OG-edit 1") exists in **no** schema file. That flag-based design was **superseded** by the `FeatureCode` / `ASSESSMENTS_V1` entitlement approach actually implemented. Do not build against `feature_flags`.

---

## Expected shape the code requires (from `supabase/schema.sql:458-577`)

`features`
| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK, default `uuid_generate_v4()` |
| `code` | `text` | **UNIQUE NOT NULL** — the gate filters on this |
| `name` | `text` | NOT NULL |
| `description` | `text` | |
| `tier_required` | `text` | NOT NULL, CHECK in (STARTER, PROFESSIONAL, COMPLETE, ADMIN, SUPER_ADMIN) |
| `category` | `text` | NOT NULL, CHECK in (CORE, CLINICAL, AI, INTEGRATION, ADMIN, SUPER_ADMIN) |
| `is_active` | `boolean` | default TRUE |
| `display_order` | `integer` | default 0 |
| `created_at` | `timestamptz` | default NOW() |

`user_features`
| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users(id)` ON DELETE CASCADE |
| `feature_id` | `uuid` | **FK → `features(id)`** ON DELETE CASCADE — required for the `features!inner` join |
| `enabled` | `boolean` | default TRUE — gate filters `enabled = true` |
| `granted_by` | `uuid` | FK → `users(id)` |
| `granted_at` | `timestamptz` | default NOW() |
| `revoked_by` | `uuid` | FK → `users(id)` |
| `revoked_at` | `timestamptz` | |
| `is_tier_override` | `boolean` | default FALSE |
| `override_reason` | `text` | |
| `expires_at` | `timestamptz` | gate denies if `< now()` |
| — | — | **UNIQUE(user_id, feature_id)** |

RLS policies in `schema.sql` rely on helper functions `get_user_role()` and `get_user_organization_id()`, which are already used by existing prod tables' policies (organizations/users/etc.) and so are expected to exist in prod — **verify before relying on them.** The two policies that make the gate work for an end user are:
- `features`: *"Authenticated users can view features"* — `FOR SELECT TO authenticated USING (TRUE)`.
- `user_features`: *"Users can view own features"* — `FOR SELECT TO authenticated USING (user_id = auth.uid())`.

---

## STEP 3 — PROPOSED migration (DO NOT RUN — for the next pack to apply after approval)

Idempotent, mirrors `schema.sql` exactly, adds the `ASSESSMENTS_V1` catalog row, and shows the per-user grant. **Not executed by this pack.**

```sql
-- supabase/migrations/<ts>_create_entitlements_and_seed_assessments.sql
-- Creates the dormant entitlement system in prod and unlocks AssessmentsTab.
-- Matches supabase/schema.sql:458-577 verbatim in shape.

BEGIN;

-- 1. features catalog ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS features (
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

-- 2. user_features junction ---------------------------------------------------
CREATE TABLE IF NOT EXISTS user_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,   -- load-bearing for features!inner join
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

-- 3. indexes ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_features_tier        ON features(tier_required);
CREATE INDEX IF NOT EXISTS idx_features_category    ON features(category);
CREATE INDEX IF NOT EXISTS idx_features_code        ON features(code);
CREATE INDEX IF NOT EXISTS idx_user_features_user   ON user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_enabled ON user_features(user_id, enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_features_feature ON user_features(feature_id);

-- 4. RLS ----------------------------------------------------------------------
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;

-- features: read-only catalog for any authenticated user; only SUPER_ADMIN writes
CREATE POLICY "Authenticated users can view features"
  ON features FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Super admins can manage features"
  ON features FOR ALL TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN') WITH CHECK (get_user_role() = 'SUPER_ADMIN');

-- user_features: user sees own; admins manage their org; super_admin all
CREATE POLICY "Users can view own features"
  ON user_features FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view org user features"
  ON user_features FOR SELECT TO authenticated
  USING (get_user_role() IN ('ADMIN','SUPER_ADMIN')
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = user_features.user_id
                AND u.organization_id = get_user_organization_id()));
CREATE POLICY "Admins can update org user features"
  ON user_features FOR UPDATE TO authenticated
  USING (get_user_role() IN ('ADMIN','SUPER_ADMIN')
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = user_features.user_id
                AND u.organization_id = get_user_organization_id()));
CREATE POLICY "Admins can insert org user features"
  ON user_features FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('ADMIN','SUPER_ADMIN')
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = user_features.user_id
                AND u.organization_id = get_user_organization_id()));
CREATE POLICY "Super admins can view all user features"
  ON user_features FOR SELECT TO authenticated USING (get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Super admins can manage all user features"
  ON user_features FOR ALL TO authenticated
  USING (get_user_role() = 'SUPER_ADMIN') WITH CHECK (get_user_role() = 'SUPER_ADMIN');

-- 5. SEED the catalog row the gate looks for ---------------------------------
-- (Optionally also re-seed the full standard catalog from schema.sql:582-636;
--  harmless because nothing else on main reads this table yet.)
INSERT INTO features (code, name, description, tier_required, category, display_order) VALUES
  ('ASSESSMENTS_V1', 'Rating Scales (Assessments)',
   'Behavioral-health rating scales tab (PHQ-9, GAD-7, C-SSRS, …)',
   'PROFESSIONAL', 'CLINICAL', 30)
ON CONFLICT (code) DO NOTHING;

-- 6. GRANT to the target user(s) so AssessmentsTab unlocks --------------------
--    Replace the WHERE with the actual user(s) to grant (see open questions).
INSERT INTO user_features (user_id, feature_id, enabled, granted_at)
SELECT u.id, f.id, TRUE, NOW()
FROM users u
CROSS JOIN features f
WHERE f.code = 'ASSESSMENTS_V1'
  AND u.email = 'jomanwa@gmail.com'        -- <-- decide the grant set
ON CONFLICT (user_id, feature_id) DO UPDATE
  SET enabled = TRUE, revoked_at = NULL, revoked_by = NULL;

COMMIT;
```

**Verification after applying (next pack, read-only):**
- `GET /rest/v1/features?code=eq.ASSESSMENTS_V1` returns one row.
- `GET /rest/v1/user_features?select=enabled,features(code)&features.code=eq.ASSESSMENTS_V1` (as the target user, anon client) returns `enabled=true`.
- Add a `features` + `user_features` row to `supabase/MIGRATION_LEDGER.md` and re-run `npx tsx scripts/check-migration-drift.ts`.

---

## Open questions (need a decision before the apply pack)

1. **Who gets the grant?** Just the owner (`jomanwa@gmail.com`), a specific test org, or all active clinicians? `user_features` is **per-user**, not global — there is no "enable for everyone" row. The migration above grants a single user; broaden the `WHERE` deliberately.
2. **Global vs per-user model.** The gate is strictly per-user via `user_features`. If the intent is "on for an entire org/tier," that's a product change (tier-based resolution) not modeled by the current code — confirm scope before widening.
3. **Tier/category for `ASSESSMENTS_V1`.** Proposed `PROFESSIONAL` / `CLINICAL` / `display_order 30` (matches where the stash put it in the `FeatureCode` union). Confirm the tier so it aligns with pricing.
4. **Re-seed the full catalog?** Recommended while creating the table (harmless today, future-proofs the admin feature-management screens at `/admin/features` and `/super-admin/users/[id]/features`, which also read these tables). Confirm yes/no.
5. **RLS helper functions.** `get_user_role()` / `get_user_organization_id()` are assumed present in prod (used by existing tables' policies). Verify with SQL access before the apply pack relies on the `user_features` admin policies.
6. **Type union on `main`.** `ASSESSMENTS_V1` is missing from `main`'s `FeatureCode` (`src/lib/types/database.ts`); it only lives in the stash. Landing AssessmentsTab must also add that union member (and the component file, which is currently only a build artifact), or the TS build/gate won't compile/typecheck.
7. **Ignore `feature_flags` / `rating_scales_enabled`.** That PRD design was superseded; don't create it.

---

*End of audit. No database or source file other than this document was modified. Awaiting approval before any apply pack runs the migration above.*
