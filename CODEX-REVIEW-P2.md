# CODEX-REVIEW-P2

Verdict: **APPROVE-WITH-FIXES**

Do not apply `20260707120000_sprint1_p2_portal_intake_rls.sql` to production or enable `INTAKE_V1` for real patients until the two HIGH RLS findings below are fixed and covered. The implementation is directionally sound: feature flag default-off, no service-role portal write path, terminology proxy is thin/fail-soft, and renderer logic is data-driven. The blocker is that the portal RLS grants more own-patient clinical-table access than the P2 spec allows.

## Verified State

- Worktree scope: uncommitted Sprint 1 / P2 portal intake changes.
- Branch: `main`; HEAD `7447ced Sprint 0 close-out: ledger entries for 20260706120000-120003; portal collision check NO-COLLISION (SCHEMA-NOTES)`.
- Remote: `origin https://Iowa51@github.com/Iowa51/ChartSparkOG.git`.
- Environment caveat: checkout is under OneDrive (`C:\Users\joman\OneDrive\Desktop\ChartSparkOG`), contrary to `planning/GIT-RULES.md`. I did not move files or run state-changing git commands.
- P0 foundation reference checked at `d3d275f`.

## Findings

| ID | Severity | File | Description | Remedy |
| --- | --- | --- | --- | --- |
| P2-RLS-1 | HIGH | `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:83` | The OWN-SUBMISSION READ family is implemented as `patient_id = portal_patient` for every intake table (`:99-103`). That is broader than "rows belonging to the patient's own submissions" and grants portal read access to any same-patient rows later written by P1D/P3/provider workflows in `problems`, `medications`, `allergies`, `family_history`, `social_history`, `ros_responses`, and `immunizations`, including provider/import/reconciled clinical rows. General chart read is explicitly out of scope for P2. | Scope SELECT to P2 submission-owned rows. For tables with `intake_submission_id`, require an own submission and likely `source='patient'`/unreconciled where available. For link-less tables, either add submission linkage before granting portal access or withhold portal grants/policies and keep them JSONB-only in P2. Add own-patient provider/import/reconciled row negative tests. |
| P2-RLS-2 | HIGH | `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:255` | `family_history`, `social_history`, and `immunizations` use a coarse `has_open` predicate (`:269-288`) because they lack `intake_submission_id`. A second open intake for the same patient reopens UPDATE access to prior rows, including rows that logically came from a submitted intake. This is the exact edge case the review prompt called out. | Do not grant portal direct write access to link-less tables until they can be tied to an intake submission, or add `intake_submission_id` and gate UPDATE/INSERT on that specific unsubmitted parent. Add a regression test: submit intake A, create intake B, prove A-era link-less rows remain immutable to `patient_portal`. |
| P2-API-1 | MEDIUM | `src/app/api/portal/intake/route.ts:27` | `responses` validation is shape-only (`z.record(z.string(), z.record(z.string(), z.unknown()))` at `:31`). There is no payload size/depth limit, no template-key allowlist, no field-type validation, and no server assertion that consent values include `{value, at, template_version}` on submit. The route currently fails closed before writing, but this boundary is not ready for the portal-auth phase. | Before enabling writes, validate responses against the selected template server-side, enforce max payload size/depth/array counts/string lengths, reject junk section/field keys, and require consent timestamp/template version on submit. |
| P2-COV-1 | MEDIUM | `src/__tests__/db/portal-intake-rls.test.ts:303` | The 26 portal DB tests cover many happy/negative paths, but not the two RLS gaps above. They also do not cover `reviewed_by`, `reviewed_at`, or `signed_snapshot` writes on UPDATE, child-table `organization_id` relocation across all child tables, or double-submit/concurrent save-vs-submit behavior. | Add the missing adversarial DB tests. Keep tests close to the policy semantics: expect RLS `USING` misses as 0-row updates and `WITH CHECK` violations as errors. |

## Reported Mismatches / Design Deviations

1. **Submit keeps `status='patient_entered'` and locks with `submitted_at`: CONFIRMED.** Documented in `supabase/SCHEMA-NOTES.md:338-349`; implemented by `portal_intake_submissions_update` at `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:139-158`. The state-machine trigger still governs downstream provider transitions.
2. **JSONB-first P2 persistence instead of immediate child-table normalization: CONFIRMED.** Documented in `supabase/SCHEMA-NOTES.md:358-373`; UI posts only `responses` to `/api/portal/intake`. Acceptable for P2/P3 separation, but see P2-API-1.
3. **`encounter_id must be NULL` is vacuous: CONFIRMED.** The eight P1 intake-write tables do not carry `encounter_id`; `vitals` is not granted to `patient_portal`.
4. **Forced fields are column-specific: CONFIRMED.** `source='patient'` is applied where `source` exists; `reconciled=false` is applied to `problems`/`medications`/`allergies`; `ros_responses`/`intake_submissions` do not have those columns.
5. **Link-less table open-intake gate is safe enough: REFUTED.** The direct write policy can be reopened by a later open intake; see P2-RLS-2.
6. **Portal write route fail-closed until portal auth lands: CONFIRMED.** `resolvePortalPatient()` returns `null` at `src/app/api/portal/intake/route.ts:44-45`, and the route returns 401 at `:71-75`. No service-role import or bypass is present in the write route.

## Mid-Build Security Fix

Confirmed for `intake_submissions.organization_id` relocation: the UPDATE `WITH CHECK` pins `organization_id` to the portal patient's organization (`supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:147-152`), and the regression test exists at `src/__tests__/db/portal-intake-rls.test.ts:318-325`. Child policies also use an `own_org` predicate, but direct child relocation is not tested table-by-table.

## Spot Checks

- Submit lock test at `src/__tests__/db/portal-intake-rls.test.ts:303` matches SQL `USING submitted_at IS NULL` at `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:139-145`.
- No-vitals-access test at `src/__tests__/db/portal-intake-rls.test.ts:398` matches the migration grant list at `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:49-60`, which omits `vitals`.
- Active-template-only tests at `src/__tests__/db/portal-intake-rls.test.ts:440-466` match `portal_intake_templates_select` requiring `active = TRUE` at `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:69-80`.
- Renderer conditionals are not arbitrary expressions: template parsing accepts only `{field, equals}` (`src/lib/intake/template.ts:10-17`) and evaluation is equality-only (`src/lib/intake/logic.ts:28-34`).
- Unknown renderer field types fall back to text instead of crashing (`src/components/intake/registry.tsx:39-61`).

## Untested Surface

- Portal SELECT of same-patient provider/import/reconciled rows in the new coded clinical tables.
- Second-open-intake reopening of link-less `family_history`/`social_history`/`immunizations` rows after an earlier submit.
- Forbidden `reviewed_by`, `reviewed_at`, and `signed_snapshot` writes through the portal policies.
- Child-table `organization_id` relocation for each table, not just `intake_submissions`.
- Real transaction race tests for double-submit and concurrent save-vs-submit.
- Next route tests for `/api/portal/intake` feature-off, CSRF, validation, 401 fail-closed, and future write behavior.
- Next route tests for `/api/terminology/[system]` rate-limit 429 behavior and degraded responses; current tests cover mapper functions only.
- Server-side template-aware response validation, payload size limits, and consent-shape enforcement.
- Portal page token/session behavior and mobile visual rendering.

## Verification Run

- `npm test -- --run src/components/intake/__tests__ src/lib/intake/__tests__ src/lib/terminology/__tests__`: passed, 41 tests.
- `bash scripts/db-local-verify.sh`: blocked by environment; WSL has no installed distribution.
- `npm run test:db`: first sandbox run failed on config access; rerun outside sandbox passed, 97 tests total: 26 P2 portal RLS + 71 existing intake data-layer tests.

---

## REMEDIATION (Sprint 1 / P2-FIXES, 2026-07-07)

All HIGH and MED findings addressed. New additive migration
`supabase/migrations/20260707130000_sprint1_p2_portal_intake_fixes.sql` amends
`…120000` (that reviewed file is NOT rewritten — same delta pattern as P1-FIXES
`…120002`). `scripts/db-local-verify.sh` applies it after `…120000`.

| ID | Severity | Status | Fix location |
| --- | --- | --- | --- |
| P2-RLS-1 | HIGH | **Fixed** | `…130000` §2 re-scopes every child-table `portal_<t>_select` to own-submission rows: `source='patient'` (where present) + `reconciled=false` (problems/medications/allergies) + `EXISTS` an own `intake_submissions` linked via `intake_submission_id`. `portal_intake_submissions_select` left as `patient_id=<self>` (the row *is* the submission). `ros_responses` scopes on the own-submission link only. Tests: `portal-intake-rls.test.ts` → "own-submission read scoping (HIGH-1)" — positive own-linked read + negatives for provider-authored, reconciled, `external_import`, and unlinked own-patient rows. |
| P2-RLS-2 | HIGH | **Fixed** | `…130000` §1 adds nullable `intake_submission_id` FK (+ index) to `family_history`/`social_history`/`immunizations`; §3 rewrites their portal INSERT/UPDATE to gate on THEIR OWN parent submission (`patient_entered` AND `submitted_at IS NULL`) and require `intake_submission_id IS NOT NULL`, replacing the coarse has-any-open-intake predicate. Tests: "link-less child submission linkage (HIGH-2)" — insert-without-link rejected (all three tables), insert-linked-to-submitted rejected, update-while-open allowed, and the exact edge case: a second open submission cannot reopen writes to rows linked to a submitted one (0 rows). Nullable-by-design + P3/P1D implications documented in SCHEMA-NOTES ("P2-FIXES"). |
| P2-API-1 | MED | **Fixed (boundary); template-aware layer bound to write path** | `/api/portal/intake` now validates with `IntakeWriteSchema` (`src/lib/intake/responses-schema.ts`): strict/bounded section+field key format, caps on section/field counts, string length, array length, nesting depth, total node count, and a raw content-length guard — all template-independent, so the boundary is safe pre-write. On `submit=true`, every affirmative consent must carry `{value, at, template_version}`. Unit tests: `src/lib/intake/__tests__/responses-schema.test.ts` (15). The **template-key allowlist + per-field-type coercion** inherently needs the selected template loaded from the DB; it runs at the write path, which is still the fail-closed 401/501 stub (no service-role read introduced). See "Deferred" below. |
| P2-COV-1 | MED | **Fixed** | New adversarial DB tests: forbidden `reviewed_by`/`reviewed_at`/`signed_snapshot` writes on UPDATE (WITH CHECK raises); child-table `organization_id` relocation blocked across **all seven** child tables (`test.each`); sequential double-submit (second submit excluded, 0 rows); plus the HIGH-1/HIGH-2 read/link tests above. |

### Deferred (with rationale)

These items from "Untested Surface" remain out of scope for P2-FIXES because they
are coupled to the not-yet-built portal-auth/write path, and are recorded here for
the next phase:

- **Template-aware response validation at write time** (allowlist responses against
  the SELECTED template's keys; per-field-type coercion). The template-independent
  boundary is hardened now; the template-aware layer lands with the write path that
  loads the template (it has no DB client today, by S4 design).
- **Next route-level tests** for `/api/portal/intake` (feature-off 404, CSRF 403,
  413 body cap, 401 fail-closed) and `/api/terminology/[system]` 429 / degraded —
  no route-harness pattern exists in this repo yet; boundary logic is unit-tested at
  the schema/mapper level instead.
- **Real transaction race** for double-submit / concurrent save-vs-submit. The
  invariant is proven deterministically (the submit lock is a single `USING`
  predicate re-checked under the row lock on every UPDATE, so a losing racer sees
  `submitted_at IS NOT NULL` → 0 rows); a multi-connection OS-thread race would add
  flakiness without changing the guarantee.

### Verification Run (P2-FIXES)

- `bash scripts/db-local-verify.sh`: booted throwaway PG16, applied all migrations
  incl. `…130000` cleanly.
- `npm run test:db`: **120 passed** (49 P2 portal RLS + 71 intake data-layer) — up
  from 97, exceeds the >97 target.
- `npx vitest run src/components/intake/__tests__ src/lib/intake/__tests__ src/lib/terminology/__tests__`:
  **56 passed** (was 41; +15 boundary-schema unit tests).
- `npx eslint` on changed TS: clean. `npx tsc --noEmit`: no new errors in changed
  files (4 pre-existing errors in unrelated `.next/*` + `transcribe-and-generate`).

