# SCHEMA-NOTES.md — Sprint 0 / Phase 1 (Structured, coded intake data layer)

Migrations:
- `20260706120000_sprint0_p1_intake_data_layer.sql` — tables, RLS, state machine, reconciled-row lock
- `20260706120001_sprint0_p1_intake_templates_seed.sql` — two seed templates
- `20260706120002_sprint0_p1_intake_fixes.sql` — **P1-FIXES**: state-machine INSERT
  governance (SM-1), server-derived signed snapshot (SM-2), `intake_templates`
  cross-org read scoping (RLS-1)
- `20260706120003_vitals_rls_org_scoping.sql` — **P1-FIXES**: org-scoped RLS on
  `vitals` + siblings (`screening_scores`, `smart_triage_results`,
  `medication_interaction_log`) — CODEX-REVIEW-P1 item 7

Plan: `planning/INTAKE-ERX-PROJECT-PLAN.md` v1.1.

---

## Guardrail 4 — Encounter linkage (vitals.encounter_id is NULLABLE at intake)

Intake happens **before** an encounter exists. Therefore `vitals.encounter_id`
is **nullable** at the intake stage. The encounter-time write path (later
phase) MUST populate `vitals.encounter_id` when the visit is created.

The existing `vitals` table (`20260218_vitals_triage_tables.sql`) already
declares `encounter_id UUID` with no NOT NULL constraint, so this guardrail is
already satisfied and **no schema change to `vitals` was made** (see below).

## Guardrail 5 — Source + verification semantics

`source` is `TEXT CHECK (source IN ('patient','provider','external_import'))` on
`problems`, `medications`, `allergies`, `family_history`, `social_history`,
`immunizations`.

- `patient` — entered by the patient during intake.
- `provider` — entered/verified by the clinician.
- `external_import` — **reserved for the incumbent-EHR import in Phase 1D.**
  Not written by any Phase 1 code path yet.

**Verification rule:** a row whose `source <> 'provider'` is considered
**unverified** until it has been reconciled (`reconciled = true`). The
`reconciled` boolean defaults to `false` on `problems`, `medications`, and
`allergies`. Reconciliation is a provider action (Phase 3) that also links the
row to the signing submission via `intake_submission_id` (see state machine).

## Coding systems (coded intake, not free text)

| Domain        | Table                         | Code column(s)                          | System |
| ------------- | ----------------------------- | --------------------------------------- | ------ |
| Problems      | `problems`                    | `code_system` in (`icd10`,`snomed`), `code` | ICD-10-CM / SNOMED CT |
| Medications   | `medications`                 | `rxnorm_code`, `name`                   | RxNorm |
| Allergies     | `allergies`                   | `allergen_code`, `allergen_display`     | coded allergen (RxNorm for drugs; SNOMED/UNII for food/environmental) |
| Family hx     | `family_history`              | `condition_code`, `condition_display`   | SNOMED CT (condition) |
| Immunizations | `immunizations`               | `vaccine_code`, `vaccine_display`       | CVX |
| Labs          | (future)                      | —                                       | **LOINC reserved for labs** (no labs table in Phase 1) |

LOINC is intentionally **reserved** for the future labs table and is not used
by any Phase 1 table.

---

## State machine (server-side, non-negotiable)

`intake_submissions.status` transitions are enforced by the
`enforce_intake_submission_state` **table trigger** (BEFORE **INSERT** OR UPDATE
OR DELETE — extended to INSERT in `20260706120002`), so the rule holds
regardless of entry path (RPC, direct SQL, or service role) — never
client-side only.

Allowed transitions (forward only, no skips):

```
patient_entered -> provider_review -> reconciled -> signed
```

- **INSERT is governed (SM-1).** New submissions may only be created at
  `patient_entered`; any other inserted status (including `signed`) raises.
  Transition-derived fields — `signed_snapshot`, `reviewed_by`, `reviewed_at` —
  may **not** be supplied at insert time (they are set only by later
  transitions). This closes the previous INSERT-to-`signed` bypass.
- Any other status change (skip, or backward) raises `illegal ... transition`.
- **`created_by` is IMMUTABLE post-creation (DELTA2-RLS-1, `…150000`).** On UPDATE
  the trigger enforces `NEW.created_by IS NOT DISTINCT FROM OLD.created_by` for
  every role — provider provenance (who authored the submission: NULL for a
  patient-initiated one, the provider's id for a provider-initiated one) is set
  once at INSERT and never changes. This is what lets the portal UPDATE policy drop
  its `created_by IS NULL` WITH CHECK pin (see "P2-FIXES-3" below).
- **On entering `signed`, `signed_snapshot` is ALWAYS rebuilt server-side
  (SM-2).** Decision: the trigger **discards any caller-supplied
  `signed_snapshot`** on the sign transition and overwrites it with a value
  derived from the current reconciled state (submission responses + reconciled
  `problems` / `medications` / `allergies` + all `ros_responses` linked to the
  submission). There is therefore no forged-snapshot path and no NULL-at-sign
  path — a signed record always carries a server-derived snapshot.
- A `signed` submission is **fully immutable**: any UPDATE or DELETE raises.

**Reconciled-row lock** (`block_mutation_when_intake_signed` trigger on
`problems`, `medications`, `allergies`, `ros_responses`): once the linked
submission is `signed`, those rows cannot be UPDATEd or DELETEd — a correction
is made by **inserting a new row (new version)**. INSERT is intentionally not
blocked. Rows link to the submission via `intake_submission_id` (added to
`problems`/`medications`/`allergies`; `ros_responses` requires it).

---

## Tenancy + RLS

Every new PHI table carries `organization_id UUID NOT NULL REFERENCES
organizations(id)` and is RLS-enabled, matching the existing core clinical
tables (`patients`, `encounters`, `notes`). Policies use the existing
`SECURITY DEFINER` helpers `public.get_user_organization_id()` and
`public.get_user_role()`:

- **SELECT**: `organization_id = get_user_organization_id()` OR `SUPER_ADMIN`.
- **INSERT / UPDATE**: `WITH CHECK (organization_id = get_user_organization_id()
  AND get_user_role() IN ('USER','ADMIN','SUPER_ADMIN'))` — auditors cannot
  write; the WITH CHECK on UPDATE prevents relocating a row cross-tenant.
- **DELETE**: `ADMIN` / `SUPER_ADMIN` only.

`intake_templates` is a catalog (not patient PHI): `organization_id NULL` = a
system/global template (mirrors `note_templates`). **Read scoping (RLS-1 fix,
`20260706120002`):** global (cross-org) read is limited to **active SYSTEM
templates** (`organization_id IS NULL AND active = TRUE`); an org additionally
reads **its own** templates (active or not); `SUPER_ADMIN` reads all. The
select predicate is:

```
(organization_id IS NULL AND active = TRUE)
OR organization_id = get_user_organization_id()
OR get_user_role() = 'SUPER_ADMIN'
```

This closes the previous leak where the bare `active = TRUE` disjunct exposed an
org's active templates to every other org's users. System templates are managed
by `SUPER_ADMIN`; org templates by that org's `ADMIN`.

**Residual (matches OG behavior):** like `encounters`/`notes`/`vitals`, RLS keys
on the `organization_id` column, not on the patient's org. A caller stamping
their own `organization_id` while referencing a foreign `patient_id` is not
blocked at the RLS layer; the write path is responsible for org/patient
consistency (same as existing OG tables). Cross-tenant reads and
foreign-org-stamped writes ARE blocked (see tests).

---

## Decisions / mismatches found during schema inspection (flagged for review)

1. **`vitals` already exists — not recreated, not altered.** The existing
   `vitals` table already carries every column this phase requires, under OG's
   names. No columns were missing, so per the guardrail ("ALTER to add what's
   missing instead of duplicating") **nothing was added** — adding `systolic`
   next to the existing `bp_systolic` would have duplicated data. Column mapping:

   | Spec (this phase) | Existing `vitals` column |
   | ----------------- | ------------------------ |
   | height            | `height` (+ `height_unit`) |
   | weight            | `weight` (+ `weight_unit`) |
   | bmi               | `bmi` |
   | systolic          | `bp_systolic` |
   | diastolic         | `bp_diastolic` |
   | hr                | `heart_rate` |
   | rr                | `respiratory_rate` |
   | temp              | `temperature` (+ `temperature_unit`) |
   | spo2              | `spo2` |
   | pain              | `pain_scale` |
   | encounter_id      | `encounter_id` (nullable — guardrail 4 satisfied) |

2. **Pre-existing RLS gap on `vitals` — NOW FIXED (`20260706120003`).**
   The original `vitals` policies were permissive: `USING (true)` /
   `WITH CHECK (true)` — not org-scoped, a live cross-tenant PHI exposure
   (CODEX-REVIEW-P1 item 7). The `20260218` migration itself was left untouched
   (additive guardrail); the dedicated, separately-reviewed migration
   `20260706120003_vitals_rls_org_scoping.sql` replaces the permissive policies
   with the org-scoped pattern used by the intake tables. **The command set
   differs per table by design** — do NOT infer UPDATE/DELETE policies that are
   not listed:

   | Table | SELECT | INSERT | UPDATE | DELETE |
   | ----- | :----: | :----: | :----: | :----: |
   | `vitals`                     | ✅ | ✅ | ✅ | ✅ |
   | `screening_scores`           | ✅ | ✅ | ❌ | ✅ |
   | `smart_triage_results`       | ✅ | ✅ | ✅ | ❌ |
   | `medication_interaction_log` | ✅ | ✅ | ❌ | ❌ (immutable audit trail) |

   Where a command has no policy, RLS deny-by-default blocks it for
   `authenticated`. Shape of the policies that DO exist: SELECT = own-org or
   `SUPER_ADMIN`; INSERT/UPDATE `WITH CHECK` org + role in
   `USER`/`ADMIN`/`SUPER_ADMIN`; DELETE = org + `ADMIN`/`SUPER_ADMIN`. The
   app-side companion fix scopes `getPatientLatestVitals` by `organization_id`
   (a required, fail-closed argument) and adds a `canAccessPatient()` gate in
   `generate-note` (item 7.4).

3. **Legacy free-text tables coexist with the new coded tables.** The existing
   `patient_problems`, `patient_medications`, `patient_allergies`
   (`20260203120001_patient_extended_schema.sql`) are **free-text** and are left
   untouched. The new `problems`, `medications`, `allergies` are the **coded**
   intake layer (distinct table names). Migration/backfill between the two is
   out of scope for Phase 1 and should be planned explicitly.

---

## Local verification (this repo has no clean `supabase db reset`)

`supabase db reset` cannot build a working DB here: the base tables
(`organizations`, `users`, `patients`, `encounters`, the RLS helpers) are
defined in `supabase/schema.sql`, which is **not** a timestamped migration, and
several migrations were applied manually out of band (see `MIGRATION_LEDGER.md`).
A from-scratch reset therefore fails on unrelated pre-existing history.

To verify **this phase** in isolation, `scripts/db-local-verify.sh` stands up a
throwaway Postgres 16 container, applies the Supabase primitives + `schema.sql`
(base) + the vitals migration + this phase's four migrations (the two original
P1 migrations **and** the two P1-FIXES migrations `…120002`/`…120003`), then the
DB tests run against it:

```bash
bash scripts/db-local-verify.sh         # boots DB + applies schema (requires Docker)
npm run test:db                         # vitest run --config vitest.db.config.ts
```

`npm run test:db` is now wired to `vitest run --config vitest.db.config.ts`
(CODEX-REVIEW-P1 COV-19/HYG-1 fix). It runs **without** `--passWithNoTests`, so a
zero-tests-collected result fails — preventing the suite from being silently
green-washed. CI runs the same via the `test-db` job (`.github/workflows/ci.yml`),
which builds the harness with Docker and runs `test:db`.

The sibling `write-audit-log.test.ts` requires the fuller reshaped `audit_logs`
baseline (`action`/`entity_type`/`entity_id` columns) + the `write_audit_log`
helper — a different harness (`supabase start`) than this isolation harness. It
is **excluded** from `vitest.db.config.ts` (see the exclude comment there) so
`npm run test:db` runs green here; run it separately against a Supabase stack.

---

## COLLISION-CHECK — Sprint 0 intake migrations vs. draft patient-portal migration (2026-07-07)

**Context.** Sprint 0 / P1 landed four migrations (`20260706120000`–`120003`,
commit `dc72c46`); commit `d3d275f` separately added the DRAFT
`20260611120000_patient_portal_foundation.sql` (PRD-02). Both are **unapplied to
production** and both are gated manual applies. This section records whether the
two overlap. The verdict was cross-checked by a four-lens adversarial review
(named-object enumeration; shared-table RLS + cross-grant audit;
apply-order/dependency; portal-role reachability of locked PHI) — **all four
independently returned NO-COLLISION.**

### Verdict: **NO-COLLISION**

The two workstreams operate on disjoint namespaces:

| Dimension | Sprint 0 (`20260706120000`–`03`) | Portal (`20260611120000`) | Overlap |
| --- | --- | --- | :---: |
| Tables created | `intake_templates` + 8 PHI (`intake_submissions`, `problems`, `medications`, `allergies`, `family_history`, `social_history`, `ros_responses`, `immunizations`) | `patient_portal_users`, `patient_portal_invites` | none |
| Tables ALTERed (RLS/policies) | `vitals`, `screening_scores`, `smart_triage_results`, `medication_interaction_log` (+ the 8 new PHI tables) | `patients`, `assessment_assignments`, `assessment_administrations`, `assessment_results` (+ its own two) | none |
| Functions | `enforce_intake_submission_state()`, `block_mutation_when_intake_signed()` | (none) | none |
| Triggers | on intake_submissions/problems/medications/allergies/ros_responses | (none) | none |
| Indexes | `idx_intake_*`, `idx_problems_*`, `idx_medications_*`, … | `idx_portal_invites_patient`, `idx_portal_invites_expires` | none |
| Roles created | (none) | `CREATE ROLE patient_portal` | none |
| Policy names | `<table>_{select,insert,update,delete}`, `intake_templates_*`, `vitals_*`, `screenings_*`, `triage_*`, `interaction_log_*` | `patient_portal_invites_*`, `patient_portal_users_clinician_select`, `portal_*_self` | none |

- **No shared mutated table.** The only tables both sides reference (`patients`,
  `users`, `organizations`) are merely **FK-referenced** by Sprint 0 — it adds
  **no** policy, trigger, or GRANT on any of them. The portal's one policy on
  `patients` (`portal_patient_self`) and its `GRANT SELECT ON patients TO
  patient_portal` are additive and land on a table Sprint 0 never touches, so a
  same-table policy clash is impossible.
- **No function / trigger / role name collision.** The portal creates zero
  functions and zero triggers; Sprint 0 creates zero roles. Both sides only
  *reference* the pre-existing helpers (`get_user_organization_id()`,
  `get_user_role()`, `update_updated_at_column()`); neither redefines them.
- **Ordering is immaterial.** Filename order sorts the portal (`20260611`)
  **before** Sprint 0 (`20260706`), but both are gated manual applies
  (`supabase db query --linked --file`, never `db push`), and the two sets are
  DDL-order-independent — every FK / function call / policy subquery / GRANT
  target in each set resolves against the **pre-existing** production schema, not
  against the other set. Either apply order succeeds.
- **The `patient_portal` role gets no access to any Sprint 0-locked table**, at
  three independent fail-closed layers: (1) it receives **no table-level GRANT**
  on any intake / vitals / sibling table — and in Postgres the privilege check
  precedes RLS, so the read stops with `permission denied` before a policy is
  even evaluated; (2) every Sprint 0 policy is `TO authenticated`, and
  `patient_portal` is a separate `NOINHERIT LOGIN` role that is **not** a member
  of `authenticated`, so those policies never apply to it (RLS default-deny);
  (3) even a hypothetically-applicable policy would fail closed because the
  org helpers resolve to **NULL** for a portal identity (portal users live in
  `patient_portal_users`, not `public.users`).

### Portal-access implications for Sprint 1 / P2 design

Portal patients may legitimately need to see their own vitals / problems /
medications / allergies. Sprint 0's org-scoped `TO authenticated` policies
**deliberately do not anticipate the portal role** — that is correct
deny-by-default, not a gap. Surfacing that data later is a **separate, additive,
separately-reviewed** migration that must:

1. **Add a per-table `GRANT SELECT ON public.<table> TO patient_portal`** for
   each surfaced table (`vitals`, `problems`, `medications`, `allergies`, …).
   Without the GRANT the read fails regardless of any policy — the privilege
   check runs before RLS.
2. **Add new patient-scoped `CREATE POLICY … FOR SELECT TO patient_portal`**
   keyed on `patient_id` via the portal identity, mirroring the foundation
   migration's existing pattern:
   `USING (patient_id = (SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()))`.
   These **must not** call `get_user_organization_id()` / `get_user_role()` —
   those return NULL for a portal session and would deny every row (and EXECUTE
   on them is granted only to `authenticated`). All target tables carry
   `patient_id` directly, so no join is needed.
3. **Leave the existing `TO authenticated` org-scoped policies untouched** — they
   correctly ignore `patient_portal`; portal exposure is purely additive (no
   `ALTER`/`DROP` of Sprint 0 policies, preserving clinician-side isolation).
4. **Encode clinical-safety scoping**: restrict portal visibility to finalized
   data — e.g. `reconciled = TRUE` on problems/medications/allergies and/or gate
   on the parent `intake_submissions.status = 'signed'` — and keep it
   SELECT-only. A future patient self-entry phase would need a **distinct**
   additive INSERT grant + INSERT policy scoped to `status = 'patient_entered'`
   (the role-agnostic `enforce_intake_submission_state` trigger already blocks
   any other insert status, so it continues to protect signed records).

Before the portal role goes live, an RLS test should assert `patient_portal`
still reads **zero** rows from every Sprint 0-locked table.

### Orthogonal caveats (NOT collisions with Sprint 0 — flagged for the portal apply)

- The portal has its **own** external prerequisite: `assessment_assignments` /
  `assessment_administrations` / `assessment_results` (per its comment, from
  `20260527130000_create_assessments_tables.sql`), which is **not** present in
  `supabase/migrations/` or the ledger — confirm those tables exist in
  production before applying the portal migration.
- The portal's `CREATE ROLE patient_portal` has no `IF NOT EXISTS` guard (a
  replay errors on an already-existing role), carries a `<rotated_via_vault>`
  password placeholder to substitute at apply time, and uses `uuid_generate_v4()`
  (requires the `uuid-ossp` extension). All intra-portal concerns, independent of
  Sprint 0.

---

## Sprint 1 / P2 — Patient Portal intake (portal RLS + template-driven renderer)

Migrations:
- `20260707120000_sprint1_p2_portal_intake_rls.sql` (additive, idempotent, gated
  manual apply). Depends on the portal foundation (`20260611120000`) + the
  Sprint 0 intake migrations. Adds the `patient_portal` write+read slice on the 8
  INTAKE-WRITE tables + `intake_templates` SELECT (active only). No existing
  `TO authenticated` policy is modified.
- `20260707130000_sprint1_p2_portal_intake_fixes.sql` — **P2-FIXES** (CODEX-REVIEW-P2
  HIGH-1/HIGH-2). Additive amendment to `…120000` (that migration is NOT rewritten,
  mirroring the P1-FIXES `…120002` pattern). See "P2-FIXES" below.

### Submit-transition design decision (chosen)

**Final submit keeps `status='patient_entered'` and sets `submitted_at = NOW()`.
`submitted_at IS NOT NULL` is the lock.** No new column, no schema change; the
role-agnostic state-machine trigger is respected because the patient never
changes `status` (the provider does `patient_entered -> provider_review` in P3).

The lock falls out of the RLS `UPDATE` policy on `intake_submissions`:
`USING (patient_id = <self> AND status='patient_entered' AND submitted_at IS NULL)`
admits the submit write itself (OLD row still unsubmitted) but excludes every
write after it (an RLS `USING` exclusion yields **0 rows, not an error**). The
`WITH CHECK` pins `status='patient_entered'` and forbids the patient setting
`reviewed_*` / `signed_snapshot`. **`created_by` is no longer a WITH CHECK clause
(P2-FIXES-3, `…150000`)** — it is enforced immutable by the state-machine trigger
instead, so a patient can complete a provider-initiated submission (created_by
preserved) yet cannot null or alter it; see "P2-FIXES-3" below. Child-row policies
gate on the linked parent submission being `patient_entered` AND `submitted_at IS
NULL`, so the lock propagates to `problems`/`medications`/`allergies`/`ros_responses`.

Rejected alternative: transitioning to `provider_review` on submit would require a
`SECURITY DEFINER` RPC (the portal RLS forbids patients changing `status`), adding
moving parts + the Supabase default-EXECUTE-grant footgun. The chosen design needs
neither.

### Persistence model (P2 app vs. the DB capability)

The P2 renderer persists the entire patient payload to
**`intake_submissions.responses` JSONB**, keyed `responses[sectionKey][fieldKey]`
(scalars, repeating coded groups as arrays, ROS as a per-system map, consents as
`{value, at, template_version}`). The coded pickers still capture fully-coded
values (rxnorm_code / icd10 / allergen) at entry; **normalization of those into the
`problems`/`medications`/`allergies`/`ros_responses` child tables is a PROVIDER
action deferred to P3 reconciliation** (where each patient item becomes a reviewed
row). This keeps the renderer 100% specialty-agnostic (S2) — no field→table
routing in code, which the seed's table-less groups (`surgeries`,
`health_maintenance`) would otherwise force — and it is the simplest correct model.

Part A's child-table write RLS is nonetheless built and DB-tested **exactly to
spec** (patients CAN INSERT/UPDATE `source='patient'`, `reconciled=false`,
submission-linked rows while unsubmitted; CANNOT after submit, cross-patient, or
with forbidden fields). It is the latent capability a later phase (or a direct
structured-write path) uses without another migration.

### Spec-vs-schema tailoring (per-table)

- **`encounter_id must be NULL` is vacuous** — none of the 8 INTAKE-WRITE tables
  carry an `encounter_id` column (only `vitals` does, which the portal cannot
  touch). No clause is emitted; the requirement is satisfied by absence.
- **Forced-field checks are applied only where the column exists**: `source='patient'`
  on the 6 tables that have `source` (not `ros_responses`/`intake_submissions`);
  `reconciled=false` only on `problems`/`medications`/`allergies`.
- **Link-less tables** (`family_history`, `social_history`, `immunizations`)
  originally had no `intake_submission_id`, so their portal write lock was scoped to
  "the patient has an open (`patient_entered`, unsubmitted) intake". **P2-FIXES
  (`…130000`) changed this**: those three tables now carry a nullable
  `intake_submission_id` FK and their portal writes are gated on THEIR OWN parent
  submission (same as `problems`/`medications`/`allergies`). See "P2-FIXES" below.
  In P2 the app still routes these sections to `responses` JSONB, so the direct-write
  policies remain latent (built + DB-tested, not exercised by the P2 UI).
- **`intake_templates` portal SELECT** is `active = TRUE AND (organization_id IS NULL
  OR organization_id = <patient's org>)` — active system + own-org only; the
  inactive `_smoke_test` and other orgs' templates are not readable.

### Feature flag + write-path seam

The patient page (`src/app/(portal)/intake/[token]`) and the terminology proxies are
gated behind the server flag **`INTAKE_V1`** (default off, `isIntakeV1Enabled()`;
`notFound()` / `404` when off). The persistence route (`/api/portal/intake`)
validates at the boundary and **fails closed (401)** until the portal
authentication session (Supabase Auth for patients → the `patient_portal` DB role)
lands with the portal-claim/auth phase — writes never bypass per-patient RLS via
the service role (S4).

### External terminology dependency (P2 → replaced in P4)

The coded pickers proxy a **sanitized search string only** (no PHI, no patient
identifiers) through `GET /api/terminology/[system]` (IP-rate-limited, `INTAKE_V1`
-gated) to free public NLM services (see also the boundary-hardening note in
P2-FIXES below):

| System | Upstream | Host |
| ------ | -------- | ---- |
| `rxnorm` (medications) | RxNav `REST/drugs.json` | `rxnav.nlm.nih.gov` |
| `icd10` (problems)     | Clinical Tables `icd10cm/v3/search` | `clinicaltables.nlm.nih.gov` |
| `allergen`             | curated in-app list (no external call) | — |

On upstream failure the proxy returns `200 {results:[], degraded:true}` so the
picker degrades to free text (patients are never blocked; code-less rows are
flagged for P3 reconciliation). **P4 replaces these public sources with Weno
data** (see the project plan); the proxy is the single swap point.

### Local verification harness

`scripts/db-local-verify.sh` now also applies the portal foundation
(`20260611120000`) + both P2 migrations (`…120000` then the `…130000` fixes).
Because the foundation references the out-of-repo `assessment_*` tables, the
harness creates **minimal harness-only stubs** for them before applying the
foundation (never applied to production), and grants `patient_portal`
`USAGE ON SCHEMA auth` + `EXECUTE ON auth.uid()` (Supabase provides these in prod).
It applies all four P2 migrations in order (`…120000` → `…130000` → `…140000` →
`…150000`). 76 portal RLS tests live in `src/__tests__/db/portal-intake-rls.test.ts`
(**147 DB tests total** with the 71 Sprint 0 intake data-layer tests).

### P2-FIXES (CODEX-REVIEW-P2 remediation) — migration `…130000`

**HIGH-1 (portal SELECT over-broad).** `…120000` scoped every portal SELECT to
`patient_id = <self>`, which also exposed same-patient rows written by later
provider / P1D-import / P3-reconciliation workflows (general chart read is out of
scope for P2). `…130000` re-scopes each child-table SELECT to rows that belong to
the patient's OWN intake submissions AND are still patient-entered:
`source='patient'` (where the column exists), `reconciled=false` (on
`problems`/`medications`/`allergies`), and an `EXISTS` on an own `intake_submissions`
row linked via `intake_submission_id`. `intake_submissions` SELECT is left as
`patient_id = <self>` — the row IS the submission, i.e. already exactly "own
submissions". `ros_responses` scopes on the own-submission link only (no
source/reconciled columns).

**HIGH-2 (link-less children reopenable).** `family_history`, `social_history`,
`immunizations` gained a nullable `intake_submission_id UUID REFERENCES
intake_submissions(id) ON DELETE SET NULL` (+ `idx_<t>_submission`). Their portal
INSERT/UPDATE policies now gate on THEIR OWN parent submission being
`patient_entered` AND `submitted_at IS NULL`, and require `intake_submission_id IS
NOT NULL` (portal writes must link). This removes the coarse "patient has ANY open
intake" predicate, so a second open submission can no longer reopen writes to rows
linked to an already-submitted one.

**P3 / P1D implications of the new column.** The FK is **nullable on purpose**:
non-portal write paths may leave it NULL. P1D incumbent-EHR **imports** insert
`source='external_import'` rows with `intake_submission_id = NULL` (they are not
tied to a patient intake submission); a provider may likewise author
`source='provider'` rows with a NULL link. Both remain **invisible to the portal**
(the tightened SELECT requires an own-submission link + `source='patient'`), and
are forced through P3 reconciliation. P3 reconciliation may set the link when a
patient-entered row is reconciled into a signing submission — but the signed
snapshot itself is still built only from `problems`/`medications`/`allergies`/
`ros_responses` (these three link-less tables are **not** part of the snapshot, so
no signed-row immutability trigger was added to them).

**P2-API-1 (write boundary hardening).** `/api/portal/intake` replaced its
shape-only `responses` validator with `IntakeWriteSchema`
(`src/lib/intake/responses-schema.ts`): strict/bounded section+field key format,
caps on section/field counts, string length, array length, nesting depth, and total
node count, plus a raw body-size guard — all TEMPLATE-INDEPENDENT so the boundary is
safe before any write. On final `submit`, every affirmatively-given consent must
carry `{ value, at, template_version }`. TEMPLATE-AWARE validation (allowlisting
response keys against the SELECTED template + per-field-type coercion) runs at the
write path once the portal session loads the template from the DB — that path is
still the fail-closed 401/501 stub, so no service-role read was introduced here.

### P2-FIXES-2 (CODEX-REVIEW-P2-DELTA remediation) — migration `…140000`

**DELTA-RLS-1 (clinician-authored linked child rows).** HIGH-1 (`…130000`) still
left two gaps for CLINICIAN-authored rows. Portal-authored child rows ALWAYS carry
`created_by IS NULL` (the INSERT policies force it); a clinician / P1D-import row
carries a non-null `created_by`. `…140000` adds the OLD-row ownership predicate
`created_by IS NULL` (plus `source='patient'` / `reconciled=false` where those
columns exist) to BOTH the child-table SELECT USING and the UPDATE USING of all
seven child tables:

- **`ros_responses` was the sharp edge** — it has NO `source`/`reconciled` column,
  so `…130000`'s own-submission SELECT admitted a clinician-authored ROS row linked
  to the patient's submission, and the UPDATE USING (patient + open-parent only)
  let the portal target it. `created_by IS NULL` is the ONLY discriminator here.
- **UPDATE hijack (all child tables).** The ownership predicates lived only in
  `WITH CHECK` (new-row), not `USING` (old-row), so a clinician row that looked
  patient-authored (`source='patient'`, `reconciled=false`) but carried a
  `created_by` could be UPDATE-targeted and rewritten with `created_by=NULL` —
  laundering it into a portal-owned row. Adding the predicates to `USING` closes
  this. (Note: PostgreSQL applies the SELECT policy to an `UPDATE … WHERE` that
  reads the row, so the tightened SELECT and UPDATE USING now reinforce each other;
  the UPDATE USING is still required to defend an `UPDATE` with no row-reading
  `WHERE`.) `INSERT`/`UPDATE` WITH CHECK were already correct and are unchanged.
- **`intake_submissions` provenance (corrected by P2-FIXES-3).** Its row IS the
  submission (`patient_id = <self>` already means "own"), and a provider-INITIATED
  submission (`created_by` set, still `patient_entered`) is a legitimate row the
  patient must be able to complete. P2-FIXES-2 argued the `status` + `submitted_at`
  gate was the correct lock and left the base policy untouched — **but CODEX-REVIEW-P2-DELTA2
  (DELTA2-RLS-1) refuted that**: the base UPDATE `WITH CHECK` still pinned
  `created_by IS NULL`, which a patient could satisfy by NULLing the provider's
  `created_by`, erasing provenance. The corrected form (`…150000`): make `created_by`
  immutable in the trigger and drop the WITH CHECK pin. See "P2-FIXES-3" below.

Adversarial DB coverage (`src/__tests__/db/portal-intake-rls.test.ts`) extends the
matrix across EVERY child table: patient-authored linked rows readable; clinician
`created_by`-stamped linked rows invisible; and the launder-via-UPDATE attempt
returns 0 rows. Verified non-vacuous by reverting the policies to their pre-`…140000`
form (the read + launder tests then fail: the clinician row is visible / rewritable).

**DELTA-API-1 (consent record on submit).** `IntakeWriteSchema` now requires
`template_version` (a number) on EVERY consent-shaped value on final submit —
affirmed OR declined — so a declined consent is version-stamped, not silently
accepted (it is part of the medico-legal record). `at` (the agreement timestamp) is
required only for an AFFIRMED consent; a decline has no agreement instant (the
client stamps `at:null` by design, and `intake_submissions.submitted_at` records
when the decline was finalized). **Product decision: declines are version-stamped,
not time-stamped.**

**DELTA-API-2 (raw body cap).** `/api/portal/intake` no longer trusts
`Content-Length` alone for the 256 KB cap. It reads the body through a streaming
reader that aborts once the byte ceiling is crossed (413), so a `Content-Length`-less
or `Content-Length`-lying body cannot force a large allocation before the structural
`IntakeWriteSchema` bounds run. The schema bounds remain the second layer.

### P2-FIXES-3 (CODEX-REVIEW-P2-DELTA2 remediation) — migration `…150000`

**DELTA2-RLS-1 (provider provenance on `intake_submissions`).** A provider-INITIATED
submission (`created_by` = the provider, still `patient_entered` + unsubmitted) is a
legitimate row the patient must be able to complete. The base portal UPDATE policy
(`…120000`) tried to protect that provenance by pinning `created_by IS NULL` in
`WITH CHECK` — but that pin is **satisfiable by NULLing `created_by`**: a normal save
that preserved the provider's `created_by` was rejected, yet a save that CLEARED it
succeeded (rowcount 1), letting the `patient_portal` role erase provider-set
provenance. (This is the judgment call P2-FIXES-2 recorded as "safe under status +
`submitted_at`" and DELTA2 refuted.)

The fix splits the invariant to its correct home, in two parts:

- **Trigger (immutability, all roles).** `enforce_intake_submission_state()` is
  `CREATE OR REPLACE`d (re-derived verbatim from `…120002`, preserving SM-1 INSERT
  governance and the SM-2 snapshot rebuild) with ONE added UPDATE-path invariant:
  `NEW.created_by IS NOT DISTINCT FROM OLD.created_by`. Provider provenance is set
  once at INSERT and can never change afterward, regardless of entry path (portal,
  clinician, RPC, service role). The trigger events are unchanged (BEFORE INSERT OR
  UPDATE OR DELETE).
- **Portal policy (drop the redundant pin).** `portal_intake_submissions_update`
  drops `created_by IS NULL` from `WITH CHECK`. The trigger now guarantees
  immutability, so the WITH CHECK no longer needs — and must not have — a clause a
  patient can satisfy by nulling the field. `USING` is unchanged (the submit lock:
  own + `patient_entered` + `submitted_at IS NULL`); the other WITH CHECK guards
  (own patient/org, `status='patient_entered'`, `reviewed_*`/`signed_snapshot` NULL)
  are kept; INSERT policies are unchanged (a portal INSERT still forces
  `created_by IS NULL`).

Net behavior: a patient CAN save-and-complete a provider-initiated open submission
with `created_by` preserved intact; a patient CANNOT null or alter `created_by` (the
trigger raises `… created_by is immutable …`); clinician/state-machine paths are
unaffected (a transition never touches `created_by`); and the post-submit lock still
holds (0 rows after `submitted_at` is set).

**Other columns verified.** `reviewed_by`/`reviewed_at`/`signed_snapshot` stay
forbidden on a patient write by WITH CHECK (must be NULL) and are transition-derived
by the trigger, so they need no created_by-style clause; `organization_id`/`patient_id`
are pinned to self in WITH CHECK; `status` is pinned to `patient_entered`;
`submitted_at` is the patient's own one-way submit lock by design. No other
`intake_submissions` column is provider provenance the patient can tamper with.

Adversarial DB coverage (`src/__tests__/db/portal-intake-rls.test.ts`, "provider-initiated
submission provenance (DELTA2-RLS-1)") proves all four behaviors. **Verified
non-vacuous:** reverting to the pre-`…150000` trigger + policy fails 5 of the 6 new
tests (the save/submit is blocked, the null/stamp attempts are no longer caught, and
the all-roles null succeeds with rowcount 1 — the exact vulnerability). 147 DB tests
total; unit suite 367 green; `tsc --noEmit` clean.

---

## Sprint 2 / P3 — Provider reconciliation + child-row materialization + portal auth

Migration: `20260708120000_sprint2_p3_reconciliation.sql` (additive, idempotent,
gated manual apply). Depends on the full Sprint 0/1 chain (`…120000`–`…150000`).
**Applied & verified in the local isolation harness ONLY** (`scripts/db-local-verify.sh`
now applies it last; 16 new DB tests in `src/__tests__/db/reconciliation.test.ts`,
**163 DB tests total**); **NOT applied to production.**

### Portal auth session model (Part A) — decision

Patient identity is a **Supabase Auth (GoTrue) session** (httpOnly `sb-*` cookies via
`@supabase/ssr`, the repo convention). A patient's auth user has **no `public.users`
row and no org**, so `get_user_organization_id()`/`get_user_role()` resolve to NULL and
the clinician `TO authenticated` policies fail closed for them by construction.

**DB writes run as the `patient_portal` Postgres role, not a Supabase client.** Supabase
JS clients only bind `anon`/`authenticated`/`service_role`, so the write path
(`src/lib/portal/portal-db.ts`) opens a `pg` connection as `patient_portal`
(`PORTAL_DATABASE_URL`, per PRD-02 "the portal uses the patient_portal role's connection
string"), injects the authenticated patient's `auth_user_id` as
`request.jwt.claims.sub` (+ `SET LOCAL ROLE patient_portal`), and lets the proven
`TO patient_portal` RLS scope every row. This is the exact mechanism the DB tests
exercise (`SET LOCAL ROLE patient_portal` + `set_config('request.jwt.claims', {sub})`).
The GoTrue cookie only authenticates **identity** (`resolvePortalPatient` →
`getPortalPatientMapping`); the write executes over the portal connection. **Never the
service role for patient writes (S4).**

*Rejected alternative:* a GoTrue **custom access-token hook** stamping
`role: patient_portal` (so a normal Supabase client would role-switch). It requires
`GRANT patient_portal TO authenticator` + a prod-only auth hook (untestable in the
isolation harness) and couples identity to DB-role at the token layer. The
connection-string design keeps the concerns separate, is PRD-mandated, and is the
already-proven test path.

Flows: `POST /api/portal/claim` (validate SHA-256 token → `admin.createUser`
(`email_confirm:true`) → link `patient_portal_users` → mark invite claimed →
`signInWithPassword` + `applyCookies`); `POST /api/portal/login`; the `[token]` page
authenticates (session+patient → intake; no session + valid token → accept form; used →
sign-in; expired/invalid → clear error). CSRF (`validateOrigin`), fail-closed rate
limits (`invitationAccept`/`login`), `INTAKE_V1`-gated (404).

**Template-aware validation (deferred from P2, now live):** at write time the route loads
the SELECTED template through the `patient_portal` role (active system/own-org catalog
read — no service role), then `validateResponsesAgainstTemplate` allowlists response keys
against the template's sections/fields and coerces per field type, layered on the
template-independent `IntakeWriteSchema`. What is persisted is the coerced, allowlisted
`responses`.

### Child-row materialization (Part B) — decision: SECURITY DEFINER RPC

`public.portal_submit_intake(p_submission_id uuid)` — SECURITY DEFINER, owned by the
system (postgres). Chosen over patient-role INSERTs because the whole
materialize-then-submit is **one server-enforced, atomic, idempotent unit**: it is immune
to app-layer partial failure and to the submit-lock timing (`submitted_at IS NOT NULL`
closes patient child writes), and it mirrors the existing SM-2 pattern where
`signed_snapshot` is already built in SQL. It materializes 7 domains from
`responses` JSONB (problems, medications, allergies, family_history, social_history,
ros_responses, immunizations) with `source='patient'`, `reconciled=false`,
`intake_submission_id` set, `created_by=NULL`; **NKDA** materializes one `nkda=true`
allergy row and suppresses allergen rows; **code-less rows** are flagged `needs_coding`
(problems/medications/allergies) or carry a NULL code (family/immunizations); then it sets
`submitted_at` + `materialized_at`. `psh.surgeries`, `vitals`, `demographics`, `consents`
have no target table and stay in `responses`.

- **Idempotency:** guarded by `materialized_at` — a re-submit returns existing counts and
  inserts nothing (proven).
- **Rollback:** a malformed clinical value (e.g. an out-of-range ROS finding) RAISEs and
  the whole call rolls back — no partial child rows, `submitted_at` stays NULL (proven).
- **Safety (B0 lesson):** `REVOKE ALL … FROM PUBLIC` + explicit
  `REVOKE EXECUTE … FROM anon, authenticated, service_role`; `EXECUTE` granted **only** to
  `patient_portal`; `search_path` pinned to `public`; and — because DEFINER bypasses RLS —
  an explicit `auth.uid()` **ownership guard** in the body (a caller can only materialize
  their own submission). Role-escape DB tests confirm `authenticated`/`anon` get
  `permission denied`.

### Reconciliation attribution / reject design (Part C) — decision

Additive columns on the three first-class coded tables (`problems`, `medications`,
`allergies`): `reconciled_by UUID REFERENCES users(id)`, `reconciled_at TIMESTAMPTZ`,
`rejected BOOLEAN NOT NULL DEFAULT FALSE`, `needs_coding BOOLEAN NOT NULL DEFAULT FALSE`.

- **Accept/edit** flips `reconciled=true`, records `reconciled_by`/`reconciled_at`, and
  keeps `source='patient'` (Guardrail 5 — reconciliation verifies, it does not re-author).
  A `needs_coding` row must be coded (via the reuse of the coded-search terminology path)
  before it can be accepted.
- **Reject** is a **boolean soft-flag** (`rejected=true`), NOT a status column: the row is
  retained for audit. Since P3-CRIT-2 the signed snapshot records ALL first-class rows via
  `to_jsonb(row)` — accepted AND rejected — each carrying its `reconciled`/`rejected`
  disposition flags, so the frozen record shows disposition, not omission; a rejected row is
  excluded only from the drafted clinical note (`buildIntakeNoteDraft`). See "Signed snapshot
  records ALL first-class rows WITH disposition" below.
  (Chosen over a status column: a boolean is the minimal change and preserves the row's
  provenance/audit trail.)
- The other domains (family_history, social_history, immunizations, ros_responses) are
  **listable** — materialized and shown, advanced with the submission; no per-row
  attribution columns in v1.

Transitions (`patient_entered → provider_review → reconciled → signed`) go through the
authenticated org-scoped RLS + the role-agnostic state-machine trigger; the RECONCILE_V1
API (`/api/reconcile/[submissionId]/{status,row}`) is the write surface.

### Note auto-population (Part C) — note-model finding (reported, not forced)

`clinical_notes` is **SOAP-only** (`subjective`/`objective`/`assessment`/`plan` + a single
`content` TEXT blob) — it has **no discrete structured-section columns and no JSONB
sections**. Rather than add a column nothing renders, on sign the structured sections
(PMH/PSH/meds/allergies/FH/SH/ROS, built from the signed snapshot by
`buildIntakeNoteDraft`) render as markdown into `content`, with `subjective` (history) and
`assessment` (reconciled problem list) pre-filled. The note is created as a **DRAFT**
(`status='draft'`) and is **never auto-finalized**. Best-effort: a note-insert failure does
not fail the (already-committed) sign.

### Encounter-time vitals (Part C) — Guardrail 4 closure

`vitals.encounter_id` is nullable (intake precedes an encounter). The single vitals INSERT
site (`/api/vitals`) already accepted an explicit `encounter_id` (the encounter page passes
it), but the patient-chart entry omitted it. Fix: when `encounter_id` is absent, the route
resolves the patient's currently-open (`status='in_progress'`) encounter (org-scoped) and
links it — so **encounter-time vitals populate `encounter_id` from any entry point**.
Explicit `encounter_id` is respected unchanged.

163 DB tests total; unit+route suite 408 green; `tsc --noEmit` clean.

---

## Sprint 2 / P3-FIXES — CODEX-REVIEW-P3 remediation

Migration: `20260709120000_sprint2_p3_fixes.sql` (additive, idempotent, gated
manual apply). Depends on the full Sprint 0/1/2 chain (`…120000`–`20260708120000`)
+ the portal foundation (`20260611120000`). `CREATE OR REPLACE`s two functions and
adds two SECURITY DEFINER functions; NO committed migration file is rewritten.
**Applied & verified in the local isolation harness ONLY** (`scripts/db-local-verify.sh`
applies it last; **176 DB tests total**, unit+route **428** green, `tsc` clean);
**NOT applied to production.**

### Sign-readiness gate (P3-CRIT-2) — DB is the enforcement point

`enforce_intake_submission_state` is `CREATE OR REPLACE`d — re-derived VERBATIM
from `…150000` (SM-1 INSERT governance, SM-2 snapshot rebuild, `created_by`
immutability all preserved) — with three UPDATE-path additions:

- **provider_review requires `submitted_at IS NOT NULL`.** A submission cannot
  enter provider review before the patient has submitted it. (The portal never
  changes `status`; a provider does — so this is a provider-transition guard.)
- **reconciled/signed require every first-class row RESOLVED.** A row on
  `problems`/`medications`/`allergies` linked to the submission is *unresolved*
  when `rejected = false AND (reconciled = false OR needs_coding = true)`. Any
  unresolved row blocks the transition (`RAISE`), so patient-entered clinical data
  can never be silently dropped from a signed record. **Operator policy:** signing
  is blocked until every problem/medication/allergy is either **rejected** or
  **accepted-and-coded** (`reconciled = true AND needs_coding = false`).
- **Signed snapshot records ALL first-class rows WITH disposition.** The SM-2
  snapshot now aggregates every linked `problems`/`medications`/`allergies` row
  (not just `reconciled` ones) via `to_jsonb(row)`; each row carries its
  `reconciled`/`rejected` booleans. The legal record shows **disposition, not
  omission** — a rejected row appears, marked rejected. The readiness gate
  guarantees no *unresolved* row reaches the snapshot. `ros_responses` is captured
  in full as before; `family_history`/`social_history`/`immunizations` remain
  outside the snapshot (unchanged).

**Route mirror + note draft.** `/api/reconcile/[submissionId]/status` mirrors the
gate (`assertReconcileReady` in `src/lib/reconcile/data.ts`) for precise 409s; the
DB trigger is the true gate. `buildIntakeNoteDraft` **excludes rejected rows** from
the drafted note so the clinical note reflects only the accepted picture, while the
snapshot retains the full disposition record.

### portal_submit_intake concurrency (P3-CRIT-1)

`portal_submit_intake` is `CREATE OR REPLACE`d — re-derived VERBATIM from
`20260708120000` — with two additions: (1) `SELECT ... FOR UPDATE` locks the parent
`intake_submissions` row **before** the idempotency check, serializing concurrent
`patient_portal` submits (the loser blocks, then re-reads the claimed sentinel and
returns `already_submitted:true`); (2) a conditional `UPDATE ... SET
materialized_at = NOW() WHERE materialized_at IS NULL` (row-count checked) claims
the row **before** any child insert — the structural single-materialization
backstop, so a double-submit is structurally impossible even absent the lock. The
whole call remains one transaction: a later `RAISE` rolls back the claim too.

### Portal invite validate/claim off the service role (P3-HIGH-4 / P3-MED-6)

Two SECURITY DEFINER functions (owner postgres, `search_path=public`, `REVOKE ALL
FROM PUBLIC` + `REVOKE EXECUTE FROM anon/authenticated/service_role`, `GRANT
EXECUTE ... TO patient_portal` — the Supabase default-EXECUTE-grant footgun, see
MIGRATION_LEDGER "Supabase default function privileges"):

- `validate_portal_invite(token_hash TEXT)` → `{status, invite?}` (valid / invalid
  / expired / claimed). Read-only; powers the accept page for unauthenticated
  visitors and the pre-claim check.
- `claim_portal_invite(token_hash TEXT, auth_user_id UUID, email TEXT)` → single-use
  atomic claim: `SELECT ... FOR UPDATE` on the invite (serializes concurrent
  claims), `INSERT patient_portal_users` (unique_violation → `account_exists`),
  then `UPDATE ... SET claimed_at = NOW(), claimed_by = <ppu> WHERE id = <invite>
  AND claimed_at IS NULL` with a **checked row-count** (0 rows → `RAISE`, rolling
  back the link). One transactional unit: there is never a linked account with an
  unclaimed invite.

Portal DB access for these runs over the `patient_portal` role (a role-only
connection with no `auth.uid()` — the definer functions take explicit args and
never read it). **No portal path uses the service role**; the intake page reads the
active template via the patient's own `patient_portal` connection
(`getActivePortalTemplate`, RLS `portal_intake_templates_select`). The only
remaining service-role use in the claim flow is the Supabase **Auth Admin** API
(`createUser`/`deleteUser`), isolated in `src/lib/auth/portal-auth-admin.ts` — an
Auth-API necessity, not a DB write, and deliberately outside `src/lib/portal/**`
(asserted service-role-free by `src/lib/portal/__tests__/no-service-role.test.ts`).

**Claim recovery path (P3-MED-6).** `claimPortalInvite` creates the Auth account
before calling `claim_portal_invite`. If the DB claim returns non-ok or throws
(after the Auth account was created), the Auth user is compensated (deleted). If
that delete ALSO fails, a compensable state is logged
(`PORTAL_CLAIM_ORPHAN_AUTH_USER`) and success is **not** reported. Recovery: an
orphan is a Supabase Auth user with **no `patient_portal_users` row**; a
reconciliation job enumerates Auth users lacking a `patient_portal_users` link and
deletes them (the invite stays unclaimed and re-usable, since the claim was rolled
back at the DB boundary).

### Effective-template rule (P3-HIGH-3)

`/api/portal/intake` resolves an **effective template** before template-aware
validation: on an update it loads the owned submission's stored `template_id` and
validates against it whenever the request omits/nulls `template_id`
(`effectiveTemplateId = body.template_id ?? owned.templateId ?? null`); an attempt
to CHANGE a bound template (`body.template_id` differs from a non-null stored one)
is rejected (409). This closes the `template_id:null` bypass where a client could
skip the allowlist while the DB's `COALESCE($3, template_id)` retained the old
template.

### Local verification harness

`scripts/db-local-verify.sh` now applies `20260709120000_sprint2_p3_fixes.sql`
last. New DB tests: `src/__tests__/db/portal-claim.test.ts` (validate/claim states,
privilege probes, single-use concurrency) + additions to
`src/__tests__/db/reconciliation.test.ts` (submit concurrency, readiness gate,
full-disposition snapshot). **176 DB tests total; unit+route 428 green; `tsc
--noEmit` clean.** The required CRIT-2 gate invalidated the *setup* of a few
committed state-machine tests (they advanced without submitting/resolving); their
setup was corrected minimally (stamp `submitted_at`; resolve rows) — assertions
unchanged, no committed migration rewritten.
