# CODEX-REVIEW-P2-DELTA3 - Sprint 1 / P2 DELTA2-RLS-1 final scoped review

**Role:** Codex, independent reviewer  
**Scope:** Round 4 final check of only the DELTA2-RLS-1 remediation in `20260707150000_sprint1_p2_portal_intake_fixes3.sql`, the +6 RLS tests, SCHEMA-NOTES / ledger deltas, and the DB harness line.  
**Prior context read:** `CODEX-REVIEW-P2-DELTA2.md` and `P2-FIXES-3-REPORT.txt`.

## Verdict: APPROVE

DELTA2-RLS-1 is closed in the scoped remediation. I found no new RLS/provenance bypass in the reviewed delta.

The fix is in the right layer: `created_by` is immutable in the role-agnostic `enforce_intake_submission_state()` trigger, and the portal UPDATE policy no longer contains the unsafe `created_by IS NULL` WITH CHECK pin. Patients can now save and submit provider-initiated open submissions while preserving provider provenance, and attempts to null or alter `created_by` raise from the trigger.

No prior-round findings were re-opened.

## Executed Evidence

| Check | Result |
| --- | --- |
| `C:\Program Files\Git\bin\bash.exe scripts/db-local-verify.sh` | Passed. The PG16 harness applied the base schema, vitals, Sprint 0/P1 migrations through `20260706120003`, portal foundation, `20260707120000`, `...130000`, `...140000`, and `...150000` with no SQL errors. The idempotent NOTICE lines were expected drops/skips. |
| `npm run test:db` | Passed: 2 files, 147 tests. Exact expected count confirmed. |
| Original provider-authored open-submission probe | Normal portal save preserving `created_by` returned `rowCount: 1` and preserved the clinician UUID. Portal save with `created_by = NULL` raised `created_by is immutable and cannot be changed once set`. |
| Trigger re-derivation integrity | Confirmed by executable-body comparison: after removing the new `created_by` guard from `...150000`, the normalized function body matches `20260706120002` exactly. SM-1 INSERT governance and SM-2 unconditional snapshot rebuild are both still present. |
| Policy amendment integrity | Confirmed by policy-body comparison: `portal_intake_submissions_update` in `...150000` matches the base `...120000` update policy with only `AND created_by IS NULL` removed. `USING` is unchanged, all other WITH CHECK guards are intact, and the INSERT policy is not touched by `...150000`. |
| Applied DB policy metadata | `portal_intake_submissions_insert` still has `created_by IS NULL`; `portal_intake_submissions_update` WITH CHECK no longer has it and still pins own patient/org, `status = patient_entered`, `reviewed_by IS NULL`, `reviewed_at IS NULL`, and `signed_snapshot IS NULL`. |
| Upsert bypass probe | Upsert preserving `created_by` succeeded as a normal save and preserved provenance. Upsert attempting to set `created_by = NULL` raised the immutable trigger error. Upsert after `submitted_at` was set raised an RLS USING-policy violation. No upsert bypass found. |
| Transition-time mutation probe | Admin/owner update attempting `status = provider_review, created_by = NULL` in one statement raised the immutable trigger error. No transition-time bypass found. |
| Role escape probe | `patient_portal` has `rolbypassrls = false`, `rolinherit = false`, is not a member of `authenticated`, and is not a member of `service_role`. `...150000` contains no `GRANT`, `REVOKE`, role DDL, or `SECURITY DEFINER`. No role escape found. |

## REMEDIATION-3 Claim Audit

| Claim | Result | Notes |
| --- | --- | --- |
| New additive migration `20260707150000_sprint1_p2_portal_intake_fixes3.sql` remediates only DELTA2-RLS-1. | Confirmed | The file redefines the state-machine trigger and recreates only `portal_intake_submissions_update`; no grants, schema changes, role changes, INSERT policy edits, or child-table policy edits were found. |
| SM-1 and SM-2 enforcement from `...120002` is preserved verbatim, with only the new created_by immutability invariant added. | Confirmed | Normalized executable comparison returned `BaselineMatchesAfterRemovingGuard = True`; SM-1 and SM-2 patterns were present in both old and new bodies. |
| Provider-initiated open submissions can be saved/submitted by the patient with `created_by` preserved. | Confirmed | Direct probe and the +6 DB tests prove save and submit work with clinician `created_by` intact. |
| Patient cannot null or stamp `created_by`; all roles cannot mutate it post-creation. | Confirmed | Portal null/stamp tests pass; direct portal null probe and admin transition-time null probe both raised the trigger's immutable error. |
| Portal UPDATE policy drops only the unsafe `created_by IS NULL` WITH CHECK clause. | Confirmed | Textual comparison of `...120000` vs `...150000` confirms only that clause was removed. Applied `pg_policies` output matches. |
| INSERT policies are untouched and still force portal-created submissions to have `created_by IS NULL`. | Confirmed | `...150000` does not drop/create `portal_intake_submissions_insert`; applied DB policy still includes `created_by IS NULL`. |
| Post-submit lock still holds. | Confirmed | Direct upsert-after-submit probe failed with an RLS USING-policy violation after the submit write succeeded once. Existing DB tests also cover post-submit lock behavior. |
| `scripts/db-local-verify.sh` applies `...150000` after `...140000`; SCHEMA-NOTES and ledger document the delta. | Confirmed | Harness lines apply `...150000` after `...140000`; `supabase/MIGRATION_LEDGER.md` and `supabase/SCHEMA-NOTES.md` contain the P2-FIXES-3 entry and 147-test count. |

## Verification Caveats

- Current checkout is under OneDrive (`C:\Users\joman\OneDrive\Desktop\ChartSparkOG`), contrary to `planning/GIT-RULES.md`.
- `gh auth status` reports invalid tokens for both configured accounts.
- `git fetch --all` initially failed in the sandbox because `.git/FETCH_HEAD` was not writable; it succeeded after approved escalation.
- Worktree was already dirty before this review. I did not revert or modify existing source files.
- No production migration apply, fix, commit, or push was performed.
