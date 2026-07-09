# CODEX-REVIEW-P2-DELTA2 - Sprint 1 / P2 final delta review

**Role:** Codex, independent reviewer  
**Scope:** `20260707140000_sprint1_p2_portal_intake_fixes2.sql`, intake response boundary schema, portal intake route byte cap, DB/API tests, and P2-FIXES-2 claims.

## Verdict: REJECT

The round-2 delta fixes are substantially closed: all seven child tables now carry the old-row ownership predicates in SELECT and UPDATE `USING`, the consent and streaming body-cap fixes work, and the DB harness plus test suite are green.

However, the documented `intake_submissions` judgment call is not safe as written. A provider-initiated `patient_entered` submission with `created_by` set cannot be normally saved by the patient while preserving `created_by`, but the patient can make the update succeed by setting `created_by = NULL`. That lets the `patient_portal` role modify provider-set provenance on the submission row.

## Findings

| ID | Severity | File | Finding | Evidence | Required fix |
| --- | --- | --- | --- | --- | --- |
| DELTA2-RLS-1 | HIGH | `supabase/migrations/20260707120000_sprint1_p2_portal_intake_rls.sql:138` | `portal_intake_submissions_update` leaves provider-authored open submissions targetable by the patient and lets the patient clear provider provenance. `USING` admits any own `patient_entered` / unsubmitted row, while `WITH CHECK` requires the new row to have `created_by IS NULL`. | Direct DB probe on a provider-authored open submission: normal save preserving `created_by` was blocked with `new row violates row-level security policy`; the same save with `created_by = NULL` returned rowcount `1`. | Either require portal-completable submissions to be portal-owned (`created_by IS NULL`) and move provider assignment metadata elsewhere, or add an RPC/trigger that allows patient completion while preserving immutable provider fields. Add DB tests proving `created_by` and other provider-controlled fields cannot be changed by `patient_portal`. |

## Executed Test Evidence

| Command / probe | Result |
| --- | --- |
| `bash scripts/db-local-verify.sh` | The default `bash.exe` was the WSL stub and failed because no WSL distribution is installed. Re-run with `C:\Program Files\Git\bin\bash.exe scripts/db-local-verify.sh` succeeded; the Docker PG16 harness applied the base schema, Sprint 0/P1, portal foundation, `...120000`, `...130000`, and `...140000` with no SQL errors. |
| `npm run test:db` | Passed: 2 test files, 141 tests. |
| `npx vitest run src/lib/intake/__tests__/responses-schema.test.ts src/app/api/portal/intake/route.test.ts` | Passed: 2 test files, 21 tests. |
| `npm test -- --run` | Passed: 37 test files, 367 tests. npm warned that `--run` is an unknown npm config, but Vitest ran once and completed green. |
| `npx tsc --noEmit` | Passed with no output. |
| Applied-policy query against local Docker DB | Confirmed every child-table SELECT and UPDATE policy has `created_by IS NULL` in `qual`; `source='patient'` is present where the column exists; `reconciled=false` is present on `problems`, `medications`, and `allergies`. |
| Launder-path direct probe | For clinician-authored linked `problems` and `ros_responses` rows: SELECT-visible rows `0`; launder UPDATE rows `0`. |
| Consent runtime probe | Decline with `at:null` and `template_version` passes; decline missing `template_version` fails; affirmation missing `at` fails; affirmation missing `template_version` fails; consent absent entirely passes current template-independent schema. |
| Chunked body-cap probe | 65 chunks of 4096 bytes each, no `Content-Length` (266,240 bytes total), returned HTTP `413`. |

## P2-FIXES-2 Claim Audit

| Claim | Result | Notes |
| --- | --- | --- |
| DELTA-RLS-1 closed for all seven child tables. | Confirmed | `...140000` adds `created_by IS NULL` to SELECT and UPDATE `USING` for `problems`, `medications`, `allergies`, `family_history`, `social_history`, `immunizations`, and `ros_responses`. It also keeps `source='patient'` and `reconciled=false` where applicable. Direct launder probes returned zero rows. |
| Reworked hijack tests are non-vacuous. | Confirmed | The test rows are linked to the portal patient's own open submission and deliberately look patient-authored (`source='patient'`, `reconciled=false`) while carrying `created_by`. Under the pre-`...140000` predicates those rows would have matched; the new tests target the real gap. |
| DELTA-API-1 fixed. | Confirmed with caveat | The schema now requires `template_version` for affirmed and declined consent-shaped values, and requires `at` only for affirmations. A submit body with no consent-shaped value still passes; that is acceptable only while template-aware required-field validation remains deferred and the route fails closed before persistence. |
| DELTA-API-2 fixed. | Confirmed | `readCappedBodyText` counts bytes while reading and aborts over cap before `JSON.parse`; focused route tests pass, and the direct multi-chunk stream probe returned `413`. |
| `intake_submissions` intentionally untightened and safe under status + `submitted_at`. | Refuted | The status + `submitted_at` gate blocks post-submit edits, but it does not preserve provider-set fields on an open provider-initiated row. Current policy lets the patient null `created_by` to satisfy `WITH CHECK`. |
| Amendment integrity: `...140000` weakens nothing from `...120000` / `...130000`. | Confirmed for the amendment | `...140000` adds no grants and no schema changes, and only re-creates child SELECT/UPDATE policies with stricter old-row predicates. The remaining rejection is in the deliberately untouched `intake_submissions` policy from `...120000`. |
| Harness and suite counts in `P2-FIXES-2-REPORT.txt`. | Confirmed | `test:db` is 141 passed; full unit suite is 367 passed; `tsc --noEmit` is clean. |

## Verification Caveats

- Current checkout is under OneDrive (`C:\Users\joman\OneDrive\Desktop\ChartSparkOG`), contrary to `planning/GIT-RULES.md`.
- `gh auth status` reports invalid tokens for both configured accounts.
- `git fetch --all` could not run in the sandbox because `.git/FETCH_HEAD` is not writable here.
- No commit, push, migration apply to production, or source fix was performed.

---

## REMEDIATION-3 (2026-07-08) — DELTA2-RLS-1 closed

**DELTA2-RLS-1 (HIGH) — CONFIRMED against the SQL, then fixed.** The base portal
`portal_intake_submissions_update` policy (`…120000:139`) pinned `created_by IS NULL`
in `WITH CHECK`. On a provider-INITIATED open submission (`created_by` = provider,
`patient_entered`, unsubmitted) that pin **rejected** a normal save preserving
`created_by` yet was **satisfied by NULLing** `created_by` — so the `patient_portal`
role could erase provider provenance (the reviewer's rowcount-1 probe). The scope was
exactly this one finding.

**Fix — new additive migration `20260707150000_sprint1_p2_portal_intake_fixes3.sql`**
(amends `…120000`/`…120002`; neither rewritten — same pattern as P1-FIXES/P2-FIXES/P2-FIXES-2):

1. **State-machine trigger — provenance immutability (all roles).**
   `enforce_intake_submission_state()` is `CREATE OR REPLACE`d, re-derived verbatim
   from `…120002` (SM-1 INSERT governance + SM-2 signed-snapshot rebuild preserved),
   with ONE added UPDATE-path invariant: `NEW.created_by IS NOT DISTINCT FROM
   OLD.created_by`. Provider provenance is set once at INSERT and never changes,
   regardless of entry path (portal, clinician, RPC, service role). Trigger events
   unchanged (BEFORE INSERT OR UPDATE OR DELETE). Verified no other provider-set field
   is patient-mutable: `reviewed_by`/`reviewed_at`/`signed_snapshot` are WITH-CHECK-forced
   NULL on a patient write and transition-derived; `organization_id`/`patient_id` are
   WITH-CHECK-pinned to self; `status` pinned to `patient_entered`; `submitted_at` is
   the by-design one-way submit lock.
2. **Portal UPDATE policy.** `portal_intake_submissions_update` drops the now-redundant
   `created_by IS NULL` clause from `WITH CHECK` (the trigger guarantees it can't
   change). `USING` (submit lock) and every other WITH CHECK guard are unchanged;
   INSERT policies unchanged (a portal INSERT still forces `created_by IS NULL`).

**Net behavior proven by tests** (`src/__tests__/db/portal-intake-rls.test.ts` →
"provider-initiated submission provenance (DELTA2-RLS-1)"): (a) patient CAN save AND
complete a provider-initiated open submission with `created_by` preserved intact
(rowcount 1); (b) patient CANNOT null OR stamp `created_by` (trigger raises
`… is immutable …`); (c) clinician/state-machine transitions are unaffected and
`created_by` is immutable for ALL roles (even an owner/admin UPDATE nulling it raises);
(d) the post-submit lock still holds (0 rows after `submitted_at`).

### Executed Test Evidence (REMEDIATION-3)

| Command / probe | Result |
| --- | --- |
| `bash scripts/db-local-verify.sh` | Docker PG16 harness applied the base schema, Sprint 0/P1, portal foundation, `…120000`, `…130000`, `…140000`, and the new `…150000` with no SQL errors. |
| `npm run test:db` | **147 passed** (2 files) — up from 141; +6 DELTA2-RLS-1 tests (76 portal RLS + 71 intake data-layer). Exceeds the >141 target. |
| Non-vacuous check | Reverting the running DB to the pre-`…150000` trigger + policy and re-running the DELTA2 block yielded **5 failed / 1 passed**: the created_by-preserving save and submit are rejected, the null/stamp attempts are no longer caught, and the all-roles admin-null succeeds with `rowCount 1` (the exact vulnerability). Re-applying `…150000` restored 147 green. |
| `npx vitest run` (unit) | **367 passed** (37 files). |
| `npx tsc --noEmit` | Clean, no output. |

### Verdict change

DELTA2-RLS-1 is **closed**. The round-2 delta fixes were already substantially closed
per the review above; this remediation resolves the one remaining HIGH. Nothing
committed; no production apply. Ledger row added for `…150000`; SCHEMA-NOTES updated
(state machine `created_by` immutability, submit-transition note, the corrected
judgment call, and a new "P2-FIXES-3" section).
