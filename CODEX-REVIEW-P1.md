# CODEX-REVIEW-P1 — Sprint 0 / Phase 1: Structured, coded intake data layer

**Reviewer:** Codex (independent; did not author this code)
**Base:** working tree at HEAD `fb9132b`
**Date:** 2026-07-06
**Scope reviewed:**
- `supabase/migrations/20260706120000_sprint0_p1_intake_data_layer.sql`
- `supabase/migrations/20260706120001_sprint0_p1_intake_templates_seed.sql`
- `supabase/SCHEMA-NOTES.md`
- `src/__tests__/db/intake-data-layer.test.ts`, `vitest.db.config.ts`, `scripts/db-local-verify.sh`
- Cross-referenced: `supabase/schema.sql`, `supabase/migrations/20260218_vitals_triage_tables.sql`, `supabase/MIGRATION_LEDGER.md`, `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`, and every `vitals` code path under `src/`.

**Reference caveat:** the plan cited by both migrations and SCHEMA-NOTES — `planning/INTAKE-ERX-PROJECT-PLAN.md` v1.1, the stated source of success criteria S1–S7 and risks R5/R6/R7 — **is not present in the repo** (there is no `planning/` directory). Claims that reduce to "the plan requires it" therefore could not be checked against source of truth; enum/CHECK completeness was verified only for internal self-consistency. (See DOC-1 / SM-9 / HYG-5.)

---

## Verdict: **APPROVE-WITH-FIXES**

The additive schema, tenant model, and RLS coverage are sound and, for the new PHI tables, **stricter than the existing OG clinical tables** (all four commands are policy-covered, `WITH CHECK` is present on both INSERT and UPDATE, DELETE is role-gated). There are no cross-tenant PHI read leaks in the eight new PHI tables. Nothing here needs to be thrown away.

However, two client-reachable defects break the phase's headline "server-side, non-negotiable state machine" and "immutable legal record" guarantees, and the verification harness that is supposed to prove the work **executes zero of its 35 tests via any wired command**. These must be fixed before this layer backs a real signed record.

### Blocking (must fix before any real `signed` intake data is created or the phase is called "verified")

1. **SM-1 — the state machine is INSERT-bypassable.** The enforcing trigger is `BEFORE UPDATE OR DELETE` only; a plain `INSERT ... status='signed'` (permitted by the CHECK and the INSERT RLS policy) lets any in-org `USER` mint a never-reviewed, `signed_snapshot`-NULL, permanently-immutable "signed" record. Fix: govern INSERT (a `BEFORE INSERT` trigger forcing/validating the initial state).
2. **SM-2 — the immutable snapshot is caller-forgeable.** On `reconciled -> signed`, the trigger builds the snapshot only when `NEW.signed_snapshot IS NULL`; a caller can supply an arbitrary/empty snapshot that becomes the frozen legal record. Fix: unconditionally overwrite `signed_snapshot` server-side (or reject if it differs from the freshly built one).
3. **HYG-1 / COV-19 — the DB suite runs in no automated path.** `test:db` = `vitest run src/__tests__/db` resolves against the root config, whose `exclude: ['src/__tests__/db/**']` shadows the filter → "No test files found"; the new `vitest.db.config.ts` is wired to no script; CI runs `npm test -- --passWithNoTests`. The "35 tests verified in isolation" claim is currently unsubstantiated. Fix: point `test:db` at `--config vitest.db.config.ts` and update the three documented commands.

### Strongly recommended before onboarding a second organization
- **RLS-1** — gate `intake_templates` global read on `organization_id IS NULL` (today an org's own *active* template is readable by every other org's users).
- **FK-1** — decide the erasure/retention policy: `ON DELETE CASCADE` from patients/orgs is silently defeated by the signed-guard trigger, so a patient or an entire org with any signed submission becomes undeletable.
- Close the highest-value **untested surfaces** (anon deny-by-default, AUDITOR write-deny, USER delete-deny, cross-tenant UPDATE relocation, `signed_snapshot` content, cross-org template leak) — see the item-6 list.
- Ship the separately-tracked **vitals RLS remediation** (item 7) — pre-existing, not introduced by this phase, but it is a live cross-tenant PHI exposure and should land before a second org.

### Method & confidence
Each of the eight checklist dimensions was independently re-derived by reading the actual SQL (not the author's claims), and a dedicated agent enumerated every `vitals` code path. Every candidate finding was then **adversarially verified** against the actual SQL and Postgres semantics. 61 candidates were produced; **58 CONFIRMED, 3 REFUTED** (listed at the end). Severities below are the post-verification values.

### Severity counts (confirmed findings)

| Severity | Count | Findings |
| --- | --- | --- |
| HIGH | 3 | SM-1, SM-2, COV-13 |
| MED | 15 | FK-1, SM-3, SM-4, RLS/template & isolation coverage (COV-1, COV-2, COV-5, COV-6, COV-7, COV-8, COV-9, COV-11, COV-12, COV-16), HYG-1, COV-19 |
| LOW | 30 | RLS-1, RLS-3, RLS-5, RLS-6, SM-5, SM-6, SM-7, SM-8, INTEG-1, TRIG-1, FK-2, NULL-1, IDEMP-1, IDEMP-2, TPL-1..TPL-6, COV-3, COV-4, COV-10, COV-15, COV-17, COV-18, COV-20, HYG-2, HYG-3, HYG-4, HYG-5 |
| INFO | 10 | RLS-2, RLS-4, RLS-7, SM-9, CASCADE-1, DOC-1, IDEMP-4, COV-0, HYG-6 |
| REFUTED | 3 | ROS-1, IDEMP-3, COV-14 |

---

## Findings

File key: **A** = `supabase/migrations/20260706120000_sprint0_p1_intake_data_layer.sql`; **B** = `supabase/migrations/20260706120001_sprint0_p1_intake_templates_seed.sql`; **NOTES** = `supabase/SCHEMA-NOTES.md`; **TEST** = `src/__tests__/db/intake-data-layer.test.ts`; **HARNESS** = `scripts/db-local-verify.sh`.

### HIGH

| ID | File:line | Description (failure scenario) | Suggested remedy |
| --- | --- | --- | --- |
| SM-1 | A:328 (trigger), A:54-55 (CHECK), A:302-320 (snapshot) | State machine is enforced by a `BEFORE UPDATE OR DELETE` trigger only — it never fires on INSERT. The CHECK permits `status='signed'` and the INSERT policy admits any in-org `USER`, so `INSERT INTO intake_submissions(...,status) VALUES(...,'signed')` succeeds: it skips `patient_entered->provider_review->reconciled`, leaves `signed_snapshot` NULL (builder lives in the UPDATE branch), and is then permanently immutable/undeletable. Contradicts the header's "holds regardless of entry path" claim. Intra-org integrity breach, not a confidentiality breach. | Add a `BEFORE INSERT` trigger (or fold INSERT into the state trigger) forcing new rows to `patient_entered` / rejecting any non-initial inserted status. |
| SM-2 | A:302 | Snapshot falsification. On the legal `reconciled->signed` UPDATE, the snapshot is built only when `NEW.signed_snapshot IS NULL`. `UPDATE ... SET status='signed', signed_snapshot='{}'` (or any forged JSON) is accepted verbatim by an in-org `USER` and becomes the immutable legal record; nothing validates it against the actual reconciled rows. Amplified one-shot via SM-1. | On sign, unconditionally overwrite `signed_snapshot` from server-derived data (ignore client value), or reject the transition if it differs from the freshly built snapshot. |
| COV-13 | TEST:186 | The SM-1 INSERT-to-signed bypass is untested — the state-machine suite only mutates status via `setStatus()` (UPDATE) from a `patient_entered` seed. A regression that leaves INSERT ungoverned ships green. | Add tests inserting `status='signed'` (and `'reconciled'`/`'provider_review'`) asserting the guard fires. |

### MED

| ID | File:line | Description (failure scenario) | Suggested remedy |
| --- | --- | --- | --- |
| FK-1 | A:329, A:51-52 | `intake_submissions.patient_id`/`organization_id` are `ON DELETE CASCADE`. A cascade delete fires the child's `BEFORE DELETE` trigger, which raises on any `signed` row — so deleting a patient (or an entire organization) that owns even one signed submission aborts the whole delete. Once signed data exists, that patient and that org become permanently undeletable (right-to-erasure / org-offboarding). Fails loud; contradicts the migration's own "never deletable" intent vs `CASCADE`. | Decide/document the erasure policy; provide a controlled `SECURITY DEFINER` purge path, or exempt cascade-origin deletes, or move off `CASCADE`. |
| SM-3 | A:311 | "Fully immutable" is partial: `family_history`, `social_history`, `immunizations` are never snapshotted and (lacking `intake_submission_id`) never locked, so they stay UPDATE/DELETE-able after signing. Raw patient answers survive in `responses` (which is snapshotted), but the structured rows are not frozen. | Add submission linkage + block-mutation coverage + snapshot inclusion, or explicitly document these as out-of-model longitudinal data. |
| SM-4 | A:312 | Snapshot faithfulness is app-dependent: the aggregation filters `intake_submission_id = NEW.id AND reconciled`, but nothing forces a `reconciled=true` row to carry a non-null link (and `ON DELETE SET NULL` can strip it). A reconciled clinical fact with NULL link is silently omitted from the frozen record. | `CHECK`/trigger requiring `reconciled=true` ⇒ non-null `intake_submission_id`; reconsider `ON DELETE SET NULL` for legal-record rows. |
| COV-11 | TEST:202 | `signed_snapshot` **content** is untested: the legal-path test signs a submission with no child rows, so all four aggregation subqueries only ever hit the `COALESCE(...,'[]')` empty path. A bug capturing `[]`, filtering on the wrong flag, or dropping a table passes. | Insert reconciled problems/medications/allergies + ros linked to the submission, then assert `signed_snapshot.*` contain exactly those rows. |
| COV-12 | TEST:196 | The SM-2 caller-supplied/forged-snapshot path is untested (no test supplies a non-null `signed_snapshot` on sign). | Sign while supplying a hand-crafted snapshot; assert the intended behavior. |
| COV-5 | A:447, TEST:285 | `intake_templates_select` permits cross-org read of any **active** org-owned template (the `active=TRUE` disjunct is unconditional on org). Untested. Non-PHI catalog, but leaks another org's template `definition`. | Gate global read on `organization_id IS NULL`; add a cross-org active-template test. |
| COV-7 | A:205/79/103/132, TEST:175 | Children can be FK-linked to a **foreign** org's submission: the INSERT `WITH CHECK` validates only `organization_id`, and FK checks bypass RLS, so an ORG_A user can insert a child stamped `org=A` with `intake_submission_id = submissionB (ORG_B)`. Enables cross-tenant cascade-delete of ORG_A rows when ORG_B deletes its submission, and (for a SUPER_ADMIN signer) snapshot pollution. Untested. | Add a same-org FK/trigger check tying `intake_submission_id`'s org to the row; add the test. |
| COV-8 | A:424-429, TEST:153 | DELETE role-gating (ADMIN/SUPER_ADMIN in-org) is never tested at the RLS layer — the only DELETE assertions run as the superuser `admin` client (bypasses RLS) against the immutability triggers. A wrong role list in the DELETE policy ships green. | Add `asUser()` DELETE tests: USER blocked, ADMIN allowed, cross-tenant blocked. |
| COV-9 | A:419-421, TEST:166 | Cross-tenant UPDATE relocation (the `WITH CHECK` on UPDATE that SCHEMA-NOTES says "prevents relocating a row cross-tenant") and positive own-org UPDATE are untested — every write test is an INSERT; all UPDATEs run as superuser. | Add `asUser()` UPDATE tests (own-org allowed; `org->ORG_B` rejected by WITH CHECK; foreign-org UPDATE rejected by USING). |
| COV-1 | HARNESS:73, TEST:70 | anon-role access to PHI is never proven ("Ollie's Nest"). `asUser()` only ever sets `authenticated`; the harness even `GRANT SELECT ... TO anon`. Safety rests entirely on deny-by-default (policies are `TO authenticated`) with zero regression coverage. | Add `SET ROLE anon` tests asserting 0-row SELECT and rejected INSERT on every PHI table and on the active `intake_templates` row. |
| COV-2 | A:411, TEST:166 | The "auditors cannot write" guarantee (AUDITOR excluded from write role lists) is untested — the only fixture is a `USER`. A policy edit adding `AUDITOR` to the write list would pass. | Seed an AUDITOR in ORG_A; assert INSERT/UPDATE rejected while same-org SELECT succeeds. |
| COV-6 | A:452-468, TEST:306 | Template management authz matrix is entirely unexercised: no test that an ADMIN can manage own-org templates, cannot touch system (`org NULL`) or foreign-org templates, or that SUPER_ADMIN can manage system templates. Only "USER cannot write" is covered. | Add ADMIN + SUPER_ADMIN fixtures and test the full matrix. |
| COV-16 | A:404-405, TEST:153 | The `OR get_user_role()='SUPER_ADMIN'` cross-org branch of every policy — the highest-privilege PHI surface — is never exercised (no SUPER_ADMIN fixture). A miswired role check would leak all orgs' data undetected. | Add a SUPER_ADMIN fixture; assert cross-org read (positive) while USER cannot. |
| COV-19 / HYG-1 | `vitest.db.config.ts`:9, `package.json`:16 | `test:db` = `vitest run src/__tests__/db` loads the root config whose `exclude: ['src/__tests__/db/**']` (vitest.config.ts:15) shadows the positional filter → the documented commands (TEST header, NOTES:170, HARNESS:80) match **zero** files and `vitest run` exits non-zero. `vitest.db.config.ts` is referenced by no script; CI (`ci.yml`:48) runs `npm test -- --passWithNoTests` on the same excluding root config. No path — CI or documented-manual — runs the 35 tests. | Point `test:db` at `vitest run --config vitest.db.config.ts` (or add `test:db:integration`); fix NOTES:170, the TEST header, and HARNESS:80; verify a green run reports 35 passed. |

### LOW

| ID | File:line | Description | Suggested remedy |
| --- | --- | --- | --- |
| RLS-1 | A:444 | `intake_templates` global read is keyed on `active=TRUE` alone (not `organization_id IS NULL`), so an org's own active template is readable by every other org's users — diverges from the `note_templates` precedent (gated on `is_system`). Non-PHI catalog; no leaking instance today (both seeds are NULL-org system templates), which is why it is easy to miss. | Predicate `(organization_id IS NULL AND active=TRUE) OR organization_id = get_user_organization_id() OR get_user_role()='SUPER_ADMIN'`. |
| RLS-3 | `schema.sql`:179 | Pre-existing: `get_user_role()`/`get_user_organization_id()` are `SECURITY DEFINER` without `SET search_path` and reference `users` unqualified. This phase widens reliance (9 more tables). Not reachable by normal PostgREST clients (cannot `SET search_path`/create temp tables). The two new trigger fns in *this* migration do lock search_path, so the pattern is known. | Lock `search_path` on the helpers in a dedicated hardening migration. |
| RLS-5 | A:409 | INSERT/UPDATE `WITH CHECK` validates `organization_id` but not that `patient_id` belongs to that org; an in-org USER knowing a foreign patient UUID can stamp `org=own, patient=foreign` (cross-tenant linkage, not a read leak; matches OG behavior, acknowledged in NOTES). The mixed-org case is untested. | Enforce patient/org consistency in the write path or via trigger; add the mixed-org test. |
| RLS-6 | TEST:296 | The template RLS test only checks the inactive-template negative case, so the suite passes despite RLS-1's active cross-org leak — false assurance. | Seed an ACTIVE ORG_B template; assert an ORG_A clinician SELECT returns 0 rows. |
| SM-5 | A:357 | Reconciled-row lock has a narrow TOCTOU: the block trigger reads submission status **unlocked**, so under READ COMMITTED a concurrent sign + child mutation can interleave and drift the live child from the frozen snapshot. The authoritative `signed_snapshot` itself stays correct; only the mutable working row diverges. | `SELECT ... FOR SHARE` the submission in the block trigger and/or `FOR UPDATE`-lock reconciled children before freezing. |
| SM-6 | A:278 | Signed rows are undeletable even by ADMIN (trigger fires regardless of RLS); combined with SM-1, forged signed rows become undeletable garbage recoverable only via superuser/replica-mode. Immutability is likely intended. | Document retention/erasure; provide a controlled purge path. |
| SM-7 | A:328 | `TRUNCATE` bypasses both immutability triggers (no `BEFORE TRUNCATE` guard). Not reachable by `authenticated` (no TRUNCATE grant), but `service_role` holds `ALL` (HARNESS:74) and owner/superuser can — the one path escaping the migration's stated service-role-proof immutability. | Add a `BEFORE TRUNCATE` guard; ensure no writable app role holds TRUNCATE. |
| SM-8 | A:302 | The legally significant sign event writes no DB-layer audit, does not require `reviewed_by`/`reviewed_at`, and captures no signer identity (`auth.uid()`); a row can reach `signed` with `reviewed_by` NULL. No tamper-evident signer trail independent of the app. | Stamp `auth.uid()` + timestamp into the snapshot/an append-only audit; require reviewer fields on the sign transition. |
| INTEG-1 | A:154 | `family_history`/`social_history`/`immunizations` lack `reconciled` and `intake_submission_id`, so NOTES' "unverified until reconciled" rule is non-evaluable for them, they are not locked post-sign, and are omitted from the snapshot — a spec/schema inconsistency (plausibly intentional longitudinal-data design). | Add the columns + coverage, or amend NOTES to state these are outside the reconciliation/immutability model and why. |
| TRIG-1 | A:252 | `updated_at` triggers are silently skipped (no `ELSE`/`RAISE`) if `update_updated_at_column()` is absent, and the existence check is schema-unqualified. Benign today (function present in `schema.sql`) but fails-soft, contra "fail loud if missing". | Schema-qualify the check (`to_regprocedure('public.update_updated_at_column()')`) and `RAISE` if missing. |
| FK-2 | A:63 | `created_by`/`reviewed_by`/`template_id` default to `NO ACTION` (RESTRICT) — asymmetric with the `CASCADE` tenant columns on the same rows and undocumented; blocks deleting a referenced user, and compounds org-delete in the cross-org active-template case. | Document intended user/template retention; consider `SET NULL` for `created_by`/`reviewed_by`. |
| NULL-1 | A:133 | Under-constrained clinical fields: a non-NKDA allergy row can be saved with NULL `allergen_type`/`allergen_code`/`severity` (an allergy with no allergen); `pack_years`, `alcohol_audit_c`, `age_at_onset` have no range CHECK (negative pack-years, AUDIT-C=99 accepted) — inconsistent with the tightly CHECK-constrained enum columns nearby. | Add `CHECK (pack_years>=0)`, `CHECK (alcohol_audit_c BETWEEN 0 AND 12)`, `CHECK (age_at_onset>=0)`, and an allergen-presence-when-`nkda=false` constraint if desired. |
| IDEMP-1 | A:41 | The seed's `ON CONFLICT (specialty,name,version)` arbiter exists only inline in `CREATE TABLE IF NOT EXISTS`. A constraint-less pre-existing `intake_templates` (e.g. out-of-band DDL) makes Migration B error `42P10` on re-run. Low probability (brand-new table, constraint created atomically) but the repo has a documented manual-application culture. | Add the UNIQUE idempotently outside the table body (guarded `ALTER TABLE ... ADD CONSTRAINT` or `CREATE UNIQUE INDEX IF NOT EXISTS`). |
| IDEMP-2 | A:252 | Re-run outcome of the `updated_at` triggers depends on the runtime presence of `update_updated_at_column` (unqualified `proname` guard, silent skip). Same root as TRIG-1. | Qualify to `public` and fail loud rather than silently skip. |
| TPL-1 | B:187 | S2/R7 ("second specialty renders from data alone") is asserted structurally only — there is no engine/rendering logic in SQL and no test exercises data-driven rendering; and `_smoke_test` is seeded `active=FALSE, org NULL`, so no normal user can even read it (confirmed by TEST:296). | Add an app-side render test over both `definition`s; make the smoke template readable in a test scope; stop citing S2/R7 as satisfied until a test exercises rendering. |
| TPL-2 | B:87 | The allergies group hard-codes `code_binding="rxnorm"`, but the table supports `allergen_type` `food`/`environmental` and NOTES:44 requires SNOMED/UNII for those — RxNorm has no concepts for peanut/pollen. No consumer in this phase. | Make the allergen code system conditional on `allergen_type`, or resolve it at capture time. |
| TPL-3 | B:72 | The PSH section collects SNOMED-coded surgeries (`code_binding="snomed"`) but there is **no** procedures/surgeries table — coded data can only land in `responses` JSONB (captured in the snapshot, but unstructured and unreconcilable). Unique among the coded groups in having no landing table at all. | Add a `procedures` table mirroring the problems pattern (with linkage/lock/snapshot), or downgrade `psh.surgeries` to free-text until a destination exists. |
| TPL-4 | B:146 | The OB/GYN conditional fires only for `sex=="female"` (exact `equals`), excluding the offered `"intersex"` (and `"male"`) option. Editable template content. | Use an in-set conditional, or gate on a dedicated anatomy/organ-inventory field. |
| TPL-5 | A:36 | No CHECK validates the `definition` JSON shape — `{}` / `{"sections":[]}` are accepted; the seeded templates are the intake UI's correctness boundary, yet an ADMIN/SUPER_ADMIN can persist a structurally invalid template. | Add `CHECK (jsonb_typeof(definition->'sections')='array')` or a lightweight validation trigger; keep richer Zod validation in the app. |
| TPL-6 | B:158 | Template vitals keys (`systolic`/`diastolic`/`hr`/`temp`) diverge from the actual `vitals` columns (`bp_systolic`/`bp_diastolic`/`heart_rate`/`temperature`); the mapping lives only as NOTES prose. A naive key->column writer would silently drop those four fields. No writer exists in this phase. | Rename the template keys to the physical columns, or add an explicit, tested key->column mapping referenced from the template. |
| COV-3 | TEST:70 | Patient-portal principal write path is untested, and no RLS path for a patient principal exists at all (policies resolve via `public.users`). Consistent with a service-role-mediated design, but unproven. | Test whichever principal performs self-entry, or document service-role mediation and test that boundary. |
| COV-4 | TEST:296 | No positive test that a clinician CAN read the active `family_medicine` template (the global-read path that drives the portal). A regression narrowing global read would pass all three template tests. | Add: as CLINICIAN_ID, SELECT the active `family_medicine` template, assert exactly one row. |
| COV-10 | TEST:253 | The reconciled-row lock is tested only on `problems`; `medications`/`allergies`/`ros_responses` lock coverage is unproven (regression risk if a table drops out of the trigger loop). | Parameterize the lock test over all four child tables (UPDATE + DELETE rejected post-sign). |
| COV-15 | TEST:186 | `updated_at` auto-bump is never asserted on the new tables. | Read `updated_at`, UPDATE, assert it advanced on a representative table. |
| COV-17 | TEST:36 | Coded-domain CHECK rejection is never tested (all test rows valid); an accidental constraint widening would be invisible. | Parameterized insert of one out-of-domain value per constrained column, asserting `check_violation`. |
| COV-18 | TEST:253 | FK `ON DELETE SET NULL`/`CASCADE` behavior (deleting a non-signed submission -> SET NULL on problems/meds/allergies + CASCADE ros, with the child lock trigger firing) is untested; `cleanup()` runs in replica mode, skipping triggers. | Add a test deleting a non-signed submission asserting SET NULL + ros removal without spurious lock errors. |
| COV-20 | TEST:143 | Cross-org `template_id` linkage on `intake_submissions` is untested (FK bypasses RLS; fixtures leave `template_id` NULL). Minor — snapshot stores only the id, not template content. | Add a test linking an ORG_A submission to an ORG_B template; decide whether to constrain to system/same-org. |
| HYG-2 | `MIGRATION_LEDGER.md`:89 | Both new migrations are absent from the ledger (no applied/pending row), contra the stated convention (ledger:7, CLAUDE.md). Timestamps/ordering are otherwise correct (`20260706120000/…001` sort after the last entry `20260527120000` and match the `YYYYMMDDHHMMSS_desc.sql` convention). | Add both files (initially a "Pending application" entry); update once applied and verified via `supabase_migrations.schema_migrations`. |
| HYG-3 | HARNESS:60 | The harness applies only `schema.sql` + the vitals migration + the two new migrations, skipping ~40 intervening migrations — deliberate isolation (dependencies are satisfied by `schema.sql`) but non-representative of production; a latent dependency/conflict with an intervening object would pass locally. The vitals step is non-load-bearing (this phase doesn't touch vitals). | Document the isolation caveat (a production-representative run is still required), or run the full ordered stack; drop/justify the unused vitals step. |
| HYG-4 | HARNESS:26 | Hardcoded, non-overridable port `54322` collides with a running `supabase start`; `docker rm -f` only clears the script's own container, so the collision aborts via `pipefail`. Blanket `anon`/`authenticated` GRANTs are looser than prod (inert for these tests). Throwaway DB. | Preflight/override the port; note that grants here are test-only. |
| HYG-5 | NOTES:7 | The cited plan `planning/INTAKE-ERX-PROJECT-PLAN.md` v1.1 (authority for S1–S7, R5–R7, the guardrails, the coding-system table, and the S2/R7 rationale) is absent from the repo — broken traceability for a PHI layer. | Commit the plan, or repoint the three citations (A:3, B:3, NOTES:7) at the real in-repo authority. |

### INFO (confirmed, no action or documentation-only)

- **RLS-7 — PHI-table RLS coverage is complete and correct.** The DO loop (A:390-431) covers all 8 PHI tables × 4 commands, `WITH CHECK` on INSERT+UPDATE, DELETE gated to ADMIN/SUPER_ADMIN, AUDITOR excluded from writes, `intake_templates` correctly handled separately. Stricter than the OG clinical tables. No gap.
- **RLS-4 — no `FORCE ROW LEVEL SECURITY`** (consistent with repo-wide convention). `service_role`/owner bypass policies, but the integrity triggers (state machine, reconciled-row lock) are ordinary BEFORE triggers that still fire for `service_role`, so integrity is not bypassed.
- **RLS-2 — no anon/patient RLS principal.** Correctly fail-closed; the `patient_entered`/`patient portal` framing implies a principal that only a trusted service-role backend can satisfy. Documentation-clarity nit (state the mediation model).
- **CASCADE-1 — asymmetric submission FK actions** (`ros_responses` CASCADE vs problems/meds/allergies `SET NULL`, forced by `ros_responses.intake_submission_id NOT NULL`). No integrity violation; confirm the divergent data outcome is intended.
- **IDEMP-4 — the UNIQUE arbiter ignores `organization_id`.** Correct for the two NULL-org system seeds (does not affect idempotency); a latent collision surface for future per-org templates.
- **DOC-1 / SM-9 — missing plan file** (same root as HYG-5): internal enum/CHECK self-consistency verified (14 ROS systems match the seed template; statuses/sources complete incl. `external_import`), but completeness against S1–S7/R5–R7 is unauditable.
- **COV-0 — test-count baseline confirmed:** 35 tests (24 RLS = 8 tables × 3 + 7 state-machine + 1 reconciled-lock + 3 template).
- **HYG-6 — no regression to the default unit suite.** The standalone `vitest.db.config.ts` is never auto-loaded and the root config excludes the DB dir, so `npm test`/coverage/CI are unaffected — the same exclusion that is safe here is what causes HYG-1.

---

## Item 7 (MANDATORY) — `vitals` RLS: confirmation, dependency enumeration, recommended fix

### 7.1 Independent confirmation of the pre-existing permissive policies

Confirmed by reading `supabase/migrations/20260218_vitals_triage_tables.sql:180-190`. RLS is enabled but the policies carry **no org scoping and no role gating**:

```sql
-- line 181
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
-- lines 188-190
CREATE POLICY "vitals_select" ON vitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "vitals_insert" ON vitals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vitals_update" ON vitals FOR UPDATE TO authenticated USING (true);
```

- `USING(true)` on SELECT/UPDATE, `WITH CHECK(true)` on INSERT — any `authenticated` engine role passes regardless of `organization_id` or user role.
- **No DELETE policy** (deny-by-default blocks DELETE for `authenticated`; only owner/`service_role` could delete).
- No reference to `organization_id`, `get_user_organization_id()`, or `get_user_role()` anywhere — **zero tenant isolation at the RLS layer.** `vitals` relies entirely on application-code org filtering. The UPDATE policy also lacks a `WITH CHECK`, so a row could be relocated cross-org via UPDATE (no code does this today). This is materially looser than the new intake tables. This migration does **not** alter `vitals` — correct per the additive guardrail; SCHEMA-NOTES flags it. The same permissive pattern exists on the sibling tables `screening_scores`, `smart_triage_results`, `medication_interaction_log`.

### 7.2 Every `vitals` code path and its behavior under standard org-scoped RLS

Every touchpoint uses the **authenticated user client** (`@/lib/supabase/server createClient` — anon key + session cookie, RLS evaluated as `authenticated`/`auth.uid()`). A repo-wide grep for `service_role` clients (`createServiceRoleClient` / `SUPABASE_SERVICE_ROLE_KEY`) confirms **no** service-role or anon path touches `vitals`, `screening_scores`, `smart_triage_results`, or `medication_interaction_log` — so there is no BYPASSRLS path silently depending on the permissive policy, and tightening RLS is fully enforced on every path.

**Reads**

| File | Symbol | Client | App-code org-scoped? | Breaks under org-scoped RLS? | Why |
| --- | --- | --- | --- | --- | --- |
| `src/lib/data/vitals.ts` | `getPatientLatestVitals` (`.from('vitals')` @40,51) | authenticated user client | **No** — filters `patient_id`/`encounter_id` only | **No** | Today this is a latent cross-org read (see 7.4). Org-scoped SELECT does not break legitimate same-org reads and **closes** the leak (returns null cross-org). |
| `src/app/api/vitals/route.ts` | `handleGet` (`.select` @75) | authenticated user client (USER/ADMIN/SUPER_ADMIN + MFA) | **Yes** — `.eq('organization_id', context.user.organizationId)` @78 (F-033) | **No** | Already does exactly what an org-scoped SELECT policy would enforce. |
| `src/app/api/ai/smart-triage/chart-summary/route.ts` | vitals-trend read (`.from('vitals')` @88-94) | authenticated user client (+ requireOrganization + MFA) | **Yes** — `.eq('organization_id', context.user.organizationId)` @92 | **No** | Matches the org-scoped pattern; `Promise.allSettled` already tolerates errors. |

**Writes**

| File | Symbol | Client | Stamps org? | Breaks under org-scoped RLS? | Why |
| --- | --- | --- | --- | --- | --- |
| `src/app/api/vitals/route.ts` | `handlePost` (`.insert` @187-213) | authenticated user client (USER/ADMIN/SUPER_ADMIN + MFA; `canAccessPatient` @148) | **Yes** — `organization_id: context.user.organizationId` @190, `recorded_by: context.user.id` @191 | **No** | INSERT `WITH CHECK (org = get_user_organization_id() AND role IN ('USER','ADMIN','SUPER_ADMIN'))` passes. This is the **only** vitals write in the repo — there is no UPDATE or DELETE of vitals anywhere in `src/`, so adding an UPDATE `WITH CHECK` and a DELETE policy breaks nothing. |

**Indirect UI callers** (go through `/api/vitals`, not the DB — RLS-unaffected): `src/components/vitals/VitalsEntryPanel.tsx` (POST `/api/vitals`), `src/app/(app)/patients/[id]/page.tsx`, `src/app/(app)/encounters/[id]/page.tsx`, `src/components/notes/new-note-form.tsx` (triggers `/api/ai/generate-note` → `getPatientLatestVitals`).

**Conclusion:** **No app path breaks under standard org-scoped `vitals` policies.** Every read/write is either already org-stamped in application code (F-033, SEC-CODEX-2) or reads via the authenticated client where org-scoped RLS auto-scopes it. The role gate on INSERT **must** include `USER` (front-line clinicians enter vitals). The tightening is safe to ship.

### 7.3 Recommended policy set for the fix migration (DO NOT APPLY HERE — separate, separately-reviewed migration)

Modeled on the intake-table pattern (A:401-428), using the `SECURITY DEFINER` helpers. Repo convention: do **not** `FORCE` RLS. (Note the dependency on the search_path-unlocked helpers — see RLS-3.)

```sql
-- ===== vitals =====
DROP POLICY IF EXISTS "vitals_select" ON public.vitals;
CREATE POLICY vitals_select ON public.vitals FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
         OR public.get_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "vitals_insert" ON public.vitals;
CREATE POLICY vitals_insert ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER','ADMIN','SUPER_ADMIN'));

DROP POLICY IF EXISTS "vitals_update" ON public.vitals;
CREATE POLICY vitals_update ON public.vitals FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id()
         AND public.get_user_role() IN ('USER','ADMIN','SUPER_ADMIN'))
  WITH CHECK (organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN ('USER','ADMIN','SUPER_ADMIN'));

DROP POLICY IF EXISTS "vitals_delete" ON public.vitals;
CREATE POLICY vitals_delete ON public.vitals FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id()
         AND public.get_user_role() IN ('ADMIN','SUPER_ADMIN'));
```

Apply the same org-scoped pattern to the **sibling tables** carrying the identical permissive gap (all authenticated-client, all app-code org-stamped, so all safe to tighten):
- `screening_scores` — read/write in `src/app/api/screenings/route.ts` (GET org-scoped; POST stamps org, `canAccessPatient`-gated) and read in chart-summary; add SELECT/INSERT org-scoped + DELETE ADMIN/SUPER_ADMIN.
- `smart_triage_results` — written by chart-summary/medication-review/prescribing-check (all stamp org); **cache reads filter `patient_id`+`triage_type` but not org** (same latent cross-org read as `getPatientLatestVitals`; org-scoped SELECT closes it). Add SELECT/INSERT/UPDATE org-scoped.
- `medication_interaction_log` — no reads/writes found in `src/` (table currently unused by app code). Keep it **immutable**: org-scoped SELECT + INSERT only, no UPDATE/DELETE (it is an audit trail).

### 7.4 Bonus (pre-existing, out of this phase's scope, surfaced by the enumeration)

`src/lib/data/vitals.ts:getPatientLatestVitals` filters by `patient_id` only (no `organization_id`), and its caller `src/app/api/ai/generate-note/route.ts:120` invokes it with the **caller-supplied `patientId` and no `canAccessPatient()` gate** (contrast with `/api/vitals` GET, chart-summary, and the other smart-triage routes, which all org-scope). Under the current `USING(true)` vitals policy, supplying any foreign-org `patientId` returns that patient's latest vitals — a **live cross-org PHI read**. The recommended org-scoped SELECT policy is the correct and sufficient fix (RLS returns null cross-org); additionally add a `canAccessPatient()` gate in `generate-note` as defense-in-depth. The analogous `smart_triage_results` cache reads share this shape.

---

## Item 6 (MANDATORY) — Untested surfaces

The 35 tests cover, well: cross-tenant read+write isolation and an own-org positive control on all 8 PHI tables (as the `authenticated` `USER`), the forward-only status transitions and signed-row UPDATE/DELETE immutability (as superuser), the reconciled-row lock on `problems`, and three template catalog cases. **They do not cover:**

**Principal / role surfaces**
- **anon role** deny-by-default on every PHI table and on `intake_templates` (COV-1) — the "Ollie's Nest" case; the harness even grants anon table-level SELECT.
- **AUDITOR** write-deny (COV-2) — no AUDITOR fixture exists.
- **SUPER_ADMIN** cross-org read/write branch of every policy (COV-16).
- **Patient/portal principal** self-entry path (COV-3) — and there is no RLS path for a patient principal at all.
- **USER cannot DELETE** (COV-8) — DELETE role-gating is never exercised at the RLS layer.

**RLS command / predicate surfaces**
- **UPDATE** at the RLS layer entirely (COV-9): cross-tenant relocation blocked by `WITH CHECK`, and the positive own-org UPDATE.
- **Cross-org `intake_templates` ACTIVE-template read** (COV-5) — the RLS-1 leak; only the inactive negative case is tested (RLS-6).
- **Template management authz matrix** — org-admin/super-admin manage policies (COV-6).
- **Mixed org/patient INSERT** — `org=own, patient=foreign` (RLS-5).
- **Cross-org FK linkage** of children to a foreign submission (COV-7) and of `intake_submissions.template_id` to a foreign template (COV-20).

**State machine / snapshot surfaces**
- **Direct INSERT to a terminal status** (`signed`/`reconciled`) — the SM-1 bypass (COV-13). *(HIGH)*
- **Caller-supplied/forged `signed_snapshot`** — the SM-2 tamper path (COV-12).
- **`signed_snapshot` content correctness** — that it actually captures reconciled children (COV-11); today the aggregation only ever returns `[]`.
- **Reconciled-row lock on `medications`/`allergies`/`ros_responses`** (COV-10) — only `problems` is tested.
- **Concurrency** — not covered, and *not needed* (COV-14, refuted: engine guarantees make it safe).

**Data-layer surfaces**
- **`updated_at` auto-bump** advances on UPDATE (COV-15).
- **Coded-domain CHECK rejection** of out-of-domain values (COV-17).
- **FK `ON DELETE SET NULL`/`CASCADE`** behavior on non-signed submission delete, incl. the child lock-trigger interaction (COV-18).

**Harness**
- The suite itself is **not executed by any wired command** (COV-19/HYG-1) — fixing that is a precondition for any of the above coverage to matter.

---

## Refuted / dismissed candidates (transparency)

These were raised during review and **rejected** on verification — recorded so they are not re-litigated:

- **ROS-1** — "add `UNIQUE(intake_submission_id, system)` on `ros_responses`." **Refuted:** multiple rows per (submission, system) are the documented versioning model (NOTES:74-79 — corrections are made by inserting a new row; the snapshot intentionally captures *all* ros rows unfiltered). A unique constraint would break the designed correction path.
- **IDEMP-3** — "headers overstate 're-runnable in any state'." **Refuted:** the headers claim only DDL-level idempotency (A:21-22) and seed idempotency via `ON CONFLICT` (B:16); neither claims order-independence. Both narrow claims hold; a seed migration depending on its immediately-preceding DDL migration is standard, correct behavior.
- **COV-14** — "concurrent transitions untested." **Refuted:** the state trigger is `BEFORE UPDATE FOR EACH ROW` firing after the exclusive row lock; under READ COMMITTED the second `reconciled->signed` re-evaluates `OLD.status='signed'` (EvalPlanQual) and raises — exactly one succeeds by construction. The four snapshot subqueries share one statement snapshot (no torn read). A test would only re-confirm guaranteed engine behavior. *(The distinct cross-table TOCTOU in **SM-5** is a separate, real, low-severity nit.)*

---

## Appendix — checklist coverage map

| Checklist item | Where addressed |
| --- | --- |
| 1. RLS on the 9 tables | RLS-1..RLS-7 (coverage complete & stricter than OG; template global-read leak is the one real predicate issue) |
| 2. State machine (break it) | SM-1..SM-9 (INSERT bypass + snapshot forgery are the material breaks; concurrency is safe) |
| 3. Data integrity (FK/CHECK/NULL/updated_at) | FK-1, FK-2, INTEG-1, CASCADE-1, NULL-1, TRIG-1, DOC-1 (14 ROS systems + enums self-consistent; `updated_at` wired on all 9) |
| 4. Idempotency | IDEMP-1..IDEMP-4 (both migrations re-runnable on the happy path; one low-probability arbiter edge) |
| 5. Template engine (S2/R7) | TPL-1..TPL-6 (no FM logic in SQL — trivially, since there is no engine in SQL; JSON valid; allergies/PSH bindings and vitals-key mapping are the gaps; OB/GYN conditional is in data) |
| 6. Test gaps | COV-0..COV-20 + the item-6 list above |
| 7. Vitals RLS (mandatory) | item-7 section (confirmed `USING(true)`; full path enumeration; recommended policy set; pre-existing `generate-note` cross-org read) |
| 8. Repo hygiene / harness / CI | HYG-1..HYG-6 (the test-wiring break is the material one) |

*No files were modified in the course of this review. This document is the only artifact produced.*

---

## REMEDIATION — Sprint 0 / P1-FIXES (`_cc-prompts/sprint0-p1-fixes.txt`)

**Date:** 2026-07-06 · **Author:** Claude Code (independent of Codex) · **Scope:**
the four mandated fixes (SM-1, SM-2, HYG-1/COV-19, vitals RLS) plus the item-6
quick-win test coverage and the RLS-1 template scoping. **Additive only:** the
two already-reviewed P1 migrations were not rewritten; two new migrations amend
them. Nothing committed/pushed — this is staged for the Codex delta review.

### New / changed artifacts

| Artifact | Change |
| --- | --- |
| `supabase/migrations/20260706120002_sprint0_p1_intake_fixes.sql` | **NEW.** SM-1 + SM-2 + RLS-1. |
| `supabase/migrations/20260706120003_vitals_rls_org_scoping.sql` | **NEW.** Item 7 vitals + siblings org-scoped RLS. |
| `src/lib/data/vitals.ts` | `getPatientLatestVitals` gains an `organizationId` filter param. |
| `src/app/api/ai/generate-note/route.ts` | `canAccessPatient()` gate before PHI enrichment; passes `orgId` to `getPatientLatestVitals`. |
| `package.json` | `test:db` → `vitest run --config vitest.db.config.ts`. |
| `vitest.db.config.ts` | Excludes `write-audit-log.test.ts` (different baseline). |
| `.github/workflows/ci.yml` | New `test-db` job (Docker harness + `test:db`, no `--passWithNoTests`); `build` now needs it. |
| `scripts/db-local-verify.sh` | Applies the two new migrations; command hints updated. |
| `src/__tests__/db/intake-data-layer.test.ts` | +SM-1, +SM-2, +vitals/siblings, +anon, +template-scoping tests; cleanup extended. |
| `supabase/SCHEMA-NOTES.md` | Trigger semantics, snapshot decision, template scoping, vitals-fixed, test commands. |

### Finding → fix map

| Finding | Severity | Fix location |
| --- | --- | --- |
| **SM-1** (INSERT bypass) | HIGH | `…120002`: trigger re-created `BEFORE INSERT OR UPDATE OR DELETE`; INSERT branch forces `status='patient_entered'` and rejects any pre-supplied `signed_snapshot`/`reviewed_by`/`reviewed_at`. |
| **SM-2** (forged snapshot) | HIGH | `…120002`: sign transition **unconditionally** rebuilds `signed_snapshot` server-side (removed the `IS NULL` guard); caller value discarded → no forged/NULL-at-sign path. |
| **COV-13** (SM-1 untested) | HIGH | TEST `State machine: INSERT is governed (SM-1)` — rejects `provider_review`/`reconciled`/`signed` inserts + pre-supplied `signed_snapshot`/`reviewed_by`; positive control. |
| **COV-19 / HYG-1** (unwired suite) | MED | `package.json` `test:db` → config; `vitest.db.config.ts` runs without `--passWithNoTests` (fails on 0 collected); CI `test-db` job; harness + docs updated. |
| **RLS-1** (template global-read leak) | LOW | `…120002`: `intake_templates_select` global read gated on `organization_id IS NULL AND active`. |
| **COV-5 / RLS-6 / COV-4** (template scoping tests) | MED/LOW | TEST `intake_templates cross-org scoping (RLS-1 fix)` — active system template readable; another org's active template blocked; own-org inactive readable. |
| **Item 7** (vitals + siblings RLS) | — | `…120003`: org-scoped policies on `vitals` (4 cmds), `screening_scores` (SELECT/INSERT/DELETE), `smart_triage_results` (SELECT/INSERT/UPDATE), `medication_interaction_log` (SELECT/INSERT, immutable). |
| **Item 7.4** (`generate-note` cross-org read) | — | `getPatientLatestVitals(patientId, organizationId, …)` org filter + `canAccessPatient()` gate in `generate-note` (RLS is the primary block; app code is defense-in-depth). *(org param made required/fail-closed — see delta APP-1 below.)* |
| **COV-1** (anon deny untested) | MED | TEST `anon role: deny-by-default` — anon SELECT returns 0 on all 9 new tables + `vitals`; anon INSERT rejected. |
| **COV-2 / COV-9** (vitals cross-tenant) | — | TEST `Vitals RLS remediation: cross-tenant isolation` — read + write blocked, own-org positive control, on all four tables. |
| **COV-11 / COV-12** (snapshot content/forgery) | MED | TEST `signed_snapshot is server-derived (SM-2)` — reconciled child captured; forged value discarded; empty-arrays non-null path. |

### Explicitly NOT addressed here (out of this fix set's scope)

Deferred (tracked, not regressions introduced by this work): FK-1 (erasure
policy), SM-3/SM-4/INTEG-1 (longitudinal-table linkage), SM-5 (TOCTOU),
SM-7 (`TRUNCATE` guard), SM-8 (signer audit), RLS-3 (helper `search_path`),
NULL-1 (range CHECKs), TPL-1..TPL-6 (template-content nits), IDEMP-1, TRIG-1,
HYG-2 (ledger), HYG-3/HYG-4 (harness caveats), and the remaining COV-* coverage
items (COV-6/7/8/10/15/16/17/18/20). SM-6 (signed rows undeletable) is intended
immutability. `write-audit-log.test.ts` remains on its own `supabase start`
harness (excluded from `test:db`).

### Delta review follow-ups (`CODEX-REVIEW-P1-DELTA.md`, 2026-07-07)

All three delta LOW findings were small and contained, so all were fixed (none deferred):

| Delta ID | Severity | Fix location |
| --- | --- | --- |
| **APP-1** (optional org param bypassable) | LOW | `src/lib/data/vitals.ts`: `getPatientLatestVitals(patientId, organizationId: string \| null, encounterId?)` — org arg is now **required** (fail-closed against accidental omission); `null` is an explicit, RLS-enforced cross-org read for an org-less `SUPER_ADMIN`. Caller passes `orgId ?? null`. |
| **TEST-1** (app gate untested) | LOW | `src/__tests__/api/generate-note.test.ts`: added `canAccessPatient=false` → 403 with `getPatientLatestVitals`/`getPatientContextForAI` **not called**, plus a positive control asserting vitals are fetched with the caller's org id. (Unit suite, not `test:db`.) |
| **DOC-1** (over-broad sibling policy summary) | LOW | `supabase/SCHEMA-NOTES.md` decision #2: replaced the prose with an explicit per-table SELECT/INSERT/UPDATE/DELETE matrix (`vitals` all four; `screening_scores` no UPDATE; `smart_triage_results` no DELETE; `medication_interaction_log` SELECT/INSERT only). |
