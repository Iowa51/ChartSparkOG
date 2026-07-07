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
