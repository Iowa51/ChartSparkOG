# CODEX-REVIEW-P2-DELTA - Sprint 1 / P2 remediation delta review

**Reviewer:** Codex (independent reviewer; did not author the remediation)  
**Scope:** Delta review of `CODEX-REVIEW-P2.md` remediation for Sprint 1 / P2-FIXES  
**Date:** 2026-07-08

## Verdict: REJECT

The main HIGH-2 structural fix is present: `family_history`, `social_history`, and `immunizations` now have `intake_submission_id`, and their portal write policies key on that parent submission. However, HIGH-1 is not fully closed. The tightened SELECT policies still leave a same-submission clinician-authored path, especially for `ros_responses`, and the child UPDATE `USING` predicates are broader than the rows the portal is supposed to own.

Review caveat: the requested `_cc-prompts/sprint1-codex-delta.txt` file does not exist in this checkout. I used `CODEX-REVIEW-P2.md`, `_cc-prompts/sprint1-p2-fixes.txt`, `_cc-prompts/sprint1-p2-portal-intake.txt`, and the P1 delta prompt format as the available source of instructions.

## Findings

| ID | Severity | File | Description | Remedy |
| --- | --- | --- | --- | --- |
| DELTA-RLS-1 | HIGH | `supabase/migrations/20260707130000_sprint1_p2_portal_intake_fixes.sql:112`; `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:189`; `supabase/migrations/20260707130000_sprint1_p2_portal_intake_fixes.sql:158` | HIGH-1 remains incomplete for clinician-created rows linked to the patient's submission. `portal_ros_responses_select` scopes only by same patient + own submission link, but `ros_responses` has no `source`/`reconciled` columns and does have `created_by`; a clinician-created ROS row linked during review remains portal-readable. The UPDATE policies have the same old-row problem: `USING` matches by patient + open parent only, while `source='patient'`, `reconciled=false`, and `created_by IS NULL` live only in `WITH CHECK`, so a matched non-portal row can be rewritten into the allowed shape. | Add old-row ownership predicates to SELECT and UPDATE `USING`: `created_by IS NULL` for all portal-owned child rows, plus `source='patient'` and `reconciled=false` where those columns exist. For `ros_responses`, at minimum require `created_by IS NULL`; consider parent `submitted_at IS NULL` if portal read is strictly resume/review-before-submit. Add DB tests for clinician-created linked `ros_responses` and for UPDATE attempts against provider/reconciled/created_by child rows. |
| DELTA-API-1 | MEDIUM | `src/lib/intake/responses-schema.ts:142`; `src/lib/intake/__tests__/responses-schema.test.ts:65` | The server-side consent assertion only applies when `value === true`; the test suite explicitly accepts `{ value: false }` without `at` or `template_version` on final submit. The P2 spec and original finding required consent blocks to capture checkbox value, timestamp, and template version. A declined consent is still part of the medico-legal record. | On `submit=true`, require every consent-shaped object to include the full `{ value, at, template_version }` shape, or document an explicit product decision that declined consents do not need a timestamp. Add the negative test for `{ value:false }` missing metadata. |
| DELTA-API-2 | LOW | `src/app/api/portal/intake/route.ts:62` | The raw 256KB body cap depends only on `Content-Length`. If the header is absent or inaccurate, `request.json()` still allocates/parses before the structural bounds run. This does not fully satisfy the claimed raw payload-size guard. | Enforce size while reading the request stream, or reject missing/invalid `Content-Length` for this route before parsing JSON. Keep the existing structural schema bounds as the second layer. |
| DELTA-COV-1 | LOW | `src/__tests__/db/portal-intake-rls.test.ts:521` | The HIGH-1 regression tests cover `problems` negatives and one `family_history` provider-authored negative, but do not exercise `medications`, `allergies`, `social_history`, `immunizations`, or `ros_responses` read scoping. They also do not cover the UPDATE `USING` gap in DELTA-RLS-1. | Extend the adversarial matrix across every child table, with special cases for `ros_responses.created_by IS NOT NULL` and linked provider/reconciled rows. |

## Remediation Claim Audit

| Claim | Result | Notes |
| --- | --- | --- |
| P2-RLS-1 fixed: child-table SELECT is scoped to own-submission patient rows. | Refuted | The migration tightens source/reconciled tables, but `ros_responses` is still own-submission only and lacks a `created_by IS NULL` guard. Tests do not cover this case. |
| P2-RLS-2 fixed: link-less tables now require their own open parent submission. | Static confirmed | `...130000` adds nullable `intake_submission_id` plus indexes and rewrites the three INSERT/UPDATE policy families. Runtime DB verification could not be confirmed in this environment. |
| P2-API-1 fixed: boundary schema has key/size/depth limits and consent enforcement. | Partially confirmed | The schema and 15 unit tests exist and pass. Consent enforcement is incomplete for declined consents, and the raw body cap is only a `Content-Length` check. |
| P2-COV-1 fixed: adversarial DB tests added. | Partially confirmed | The file contains 49 portal RLS tests including reviewer/snapshot fields, org relocation, double-submit, HIGH-1, and HIGH-2 cases. Coverage still misses DELTA-RLS-1, and the DB suite did not run locally because the harness was unavailable. |

## Verification Notes

- `npx vitest run src/components/intake/__tests__ src/lib/intake/__tests__ src/lib/terminology/__tests__`: passed, 56 tests.
- `npx eslint -- ...P2 files...`: passed with no output.
- `npm run test:db`: failed before assertions; no Postgres harness listening on `127.0.0.1:54322`, 120 DB tests skipped after connection failure.
- `bash scripts/db-local-verify.sh`: failed; this Windows environment has no installed WSL distribution.

---

## REMEDIATION-2 (2026-07-08) — each finding verified against the SQL, then fixed

All four findings were **CONFIRMED** against the actual migrations/schema before fixing
(none refuted). DB harness stood up via Docker (`scripts/db-local-verify.sh`) and
**`npm run test:db` is green: 141 tests** (was 120; +21 adversarial portal RLS tests).
Unit suite green (367). Nothing committed.

| ID | Severity | Verdict vs. SQL | Fix location |
| --- | --- | --- | --- |
| DELTA-RLS-1 | HIGH | **Confirmed** — columns verified (`ros_responses` has `created_by`, no `source`/`reconciled`; the other six have `created_by`). Pre-fix SELECT admitted a clinician `created_by`-stamped linked row; pre-fix UPDATE `USING` (patient + open-parent only) let it be laundered. Both proven by reverting the policies and watching the new tests fail (`expected 1 to be 0`). | `supabase/migrations/20260707140000_sprint1_p2_portal_intake_fixes2.sql` (adds `created_by IS NULL` + `source='patient'`/`reconciled=false` to SELECT USING and UPDATE USING of all 7 child tables); harness line in `scripts/db-local-verify.sh`; ledger row; SCHEMA-NOTES "P2-FIXES-2". |
| DELTA-API-1 | MED | **Confirmed with a correction** — the reviewer's literal "require full `{value,at,template_version}`" would 400 legitimate declines: `src/components/intake/consent.tsx:20` sends `at:null` for a decline by design. Fix requires `template_version` on EVERY consent on submit (declines are version-stamped) and `at` only on affirmations. | `src/lib/intake/responses-schema.ts` (superRefine + docstring); test `src/lib/intake/__tests__/responses-schema.test.ts`. |
| DELTA-API-2 | LOW | **Confirmed** — `Content-Length` defaults to `0` when absent (`route.ts:62`), so `request.json()` parsed an unbounded body first. | `src/app/api/portal/intake/route.ts` (`readCappedBodyText` streams with a hard byte ceiling, independent of `Content-Length`); test `src/app/api/portal/intake/route.test.ts`. |
| DELTA-COV-1 | LOW | **Confirmed** — read scoping was only exercised for `problems` + one `family_history` case. | `src/__tests__/db/portal-intake-rls.test.ts` — `test.each(CHILD_TABLES)` now covers positive read, clinician-`created_by` negative read, and launder-via-UPDATE for all 7 child tables. |

### Claim-audit resolution

- **P2-RLS-1 (was Refuted):** now closed — `ros_responses` (and every child table) requires `created_by IS NULL` for portal read/write. DB-verified.
- **P2-RLS-2 (was Static confirmed):** runtime-confirmed under the Docker harness (link-less children gate on their own open parent; second-open-submission reopen is 0 rows).
- **P2-API-1 (was Partially confirmed):** consent enforcement completed for declines (version-stamped); raw body cap no longer depends on `Content-Length`.
- **P2-COV-1 (was Partially confirmed):** matrix extended to all child tables; DB suite runs green (141) under the harness.

### Deferred

None. All HIGH/MED/LOW delta findings were contained and fixed.
