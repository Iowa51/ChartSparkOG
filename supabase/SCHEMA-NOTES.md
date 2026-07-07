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
