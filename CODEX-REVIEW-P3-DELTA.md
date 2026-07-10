# CODEX REVIEW - Sprint 2 / P3-FIXES Delta

## Verdict

**PASS WITH FOLLOW-UP.** The P3 critical/high remediation claims are behaviorally closed in the local harness: concurrent submit serializes, unresolved sign is blocked at the DB layer, effective-template validation is enforced, portal DB access is off service role, row reconciliation is phase-guarded, and the invite DB claim is single-use/atomic.

Two non-blocking delta findings remain: one medium recovery gap in the Auth-before-DB invite claim path, and one low test-audit mismatch where an existing assertion was broadened despite the "setup changes only" claim. No new critical or high findings found.

State caveats verified before review:

- Workspace is `C:\Users\joman\OneDrive\Desktop\ChartSparkOG`, which still conflicts with `GIT-RULES.md` "not under OneDrive"; no git moves were made.
- Branch `main`, HEAD `2299eed`.
- Remote `https://Iowa51@github.com/Iowa51/ChartSparkOG.git`.
- Active `gh` account is `RedArkventures`; `Iowa51` is logged in but inactive. No push/commit was performed.

## Findings

| ID | Severity | File | Description | Remedy |
| --- | --- | --- | --- | --- |
| P3-DELTA-MED-1 | Medium | `src/lib/portal/portal-invites.ts:81` | `claimPortalInvite` creates the Supabase Auth user before `claimPortalInviteTx` runs at `:95`. If the process crashes in that gap, the DB invite remains unclaimed and no `patient_portal_users` row exists, but a later retry can be blocked by Auth `exists`. The compensation path covers caught DB failures (`:98`, `:103`), and delete-failure logging records `PORTAL_CLAIM_ORPHAN_AUTH_USER` at `:127`, but the documented orphan cleanup job is not built (`P3-FIXES-REPORT.txt:157`). | Add a durable recovery mechanism before reporting this fully closed: implement the orphan cleanup job, or persist a pending claim record including `auth_user_id`, or make account-exists handling detect/delete/reuse an unlinked portal Auth orphan safely. Add an app-level test for the caught DB failure path and the delete-failure log path. |
| P3-DELTA-LOW-2 | Low | `src/__tests__/db/portal-intake-rls.test.ts:435` | The committed-test audit claim is not exact. One existing assertion changed from `/row-level security|violates|policy|transition/i` to `/row-level security|violates|policy|transition|submitted/i`. This is probably acceptable for the new trigger message, but it is still an assertion change and should not be reported as "setup changes only" or "assertions unchanged." | Update the remediation report/closeout wording, or split the test so one assertion verifies the portal RLS/policy block and another verifies the DB submitted gate. |

## Executed Evidence

| Check | Command/probe | Result |
| --- | --- | --- |
| Harness | `& 'C:\Program Files\Git\bin\bash.exe' scripts/db-local-verify.sh` | Passed. Full chain applied, including `20260708120000_sprint2_p3_reconciliation.sql` and `20260709120000_sprint2_p3_fixes.sql` last. |
| DB suite | `npm run test:db` | Passed exactly: 4 files, **176 tests**. |
| Unit/route suite | `npm run test:run` | Passed exactly: 44 files, **428 tests**. |
| Targeted route/unit subset | `npx vitest run ...portal/intake...status...row...no-service-role...intake-note-sections...` | Passed: 5 files, 38 tests. Covers HIGH-3, MED-5, service-role guard, note rejected-row exclusion. |
| CRIT-1 race probe | Two real `patient_portal` transactions concurrently called `portal_submit_intake` | First returned `already_submitted:false`; second returned `already_submitted:true`; final child counts were problems `2`, medications `2`, ROS `2` exactly. |
| CRIT-2 DB bypass probe | Direct SQL as `authenticated` and direct SQL as admin/owner attempted unresolved transition | Both blocked with unresolved-row error. Legitimate sign after resolving rows produced snapshot counts: problems `2` with `1` rejected, meds `2` with `1` rejected, allergies `1` rejected, ROS `2`. |
| HIGH-4 static grep | `rg createServiceRoleClient src/app/(portal) src/app/api/portal src/lib/portal -g !tests` | No matches. Auth admin calls appear only in `src/lib/auth/portal-auth-admin.ts`. |
| HIGH-4 privilege probe | `pg_proc`/`routine_privileges` inspection | `claim_portal_invite` and `validate_portal_invite` are owned by `postgres`, `SECURITY DEFINER`, `search_path=public`; EXECUTE grants list only `postgres` and `patient_portal`. Claim function body contains `FOR UPDATE`, `ROW_COUNT`, and `claimed_at IS NULL`. |
| MED-6 claim race probe | Two real `patient_portal` transactions claimed the same fresh invite | One returned `ok:true`, one returned `reason:'claimed'`; exactly one `patient_portal_users` row; invite `claimed_at` and `claimed_by` set. |
| Test setup audit | `git diff --unified=0` on edited committed DB tests | `intake-data-layer.test.ts` setup-only. `portal-intake-rls.test.ts` has setup edits plus one assertion regex change; flagged above. |

## Remediation Claim Audit

| Claim | Result |
| --- | --- |
| P3-CRIT-1: `portal_submit_intake` concurrency-safe | Confirmed. Parent row is locked before idempotency, `materialized_at` claim is row-count checked, and the independent two-connection probe produced one materialization only. |
| P3-CRIT-2: DB sign-readiness gate and complete snapshot | Confirmed. DB rejects unresolved `reconciled`/`signed` transitions for both provider-role SQL and admin SQL. Legit sign snapshot includes accepted and rejected first-class rows with disposition flags. Note draft excludes rejected rows via `src/lib/notes/intake-note-sections.ts:48`. |
| P3-HIGH-3: update-with-null-template validates against stored template; template change 409 | Confirmed. Route resolves `effectiveTemplateId` from stored `owned.templateId` at `src/app/api/portal/intake/route.ts:152-158`; tests cover null-template junk key, valid update, and template change 409 at `route.test.ts:160`, `:174`, `:185`. |
| P3-HIGH-4: no service-role DB access in portal paths; Auth admin isolated | Confirmed for DB paths. Broader portal-path grep has zero service-role imports. Auth admin service-role usage is isolated to `src/lib/auth/portal-auth-admin.ts` and is only `createUser`/`deleteUser`. Definer grants are least-privilege in the harness. |
| P3-MED-5: row reconcile phase guard | Confirmed. Route requires parent `status='provider_review'` and `submitted_at` before row mutation; tests cover `patient_entered`, `reconciled`, `signed`, and unsubmitted provider-review rejection. |
| P3-MED-6: atomic single-use invite DB claim plus compensation | Partially confirmed. DB claim is atomic and race-safe. App compensation on caught DB failure is present and success is withheld. Crash-before-DB-claim recovery remains documented but not implemented; see P3-DELTA-MED-1. |

## Test-Edit Audit

- `src/__tests__/db/intake-data-layer.test.ts`: setup-only changes. The status helper and local transitions now stamp `submitted_at`; no `expect` changed.
- `src/__tests__/db/portal-intake-rls.test.ts`: setup/comment changes plus one changed assertion at line 435. This must be disclosed as an assertion edit.
- New tests are additive and passed in the full suites: `portal-claim.test.ts`, `reconciliation.test.ts`, reconcile route tests, portal claim/login route tests, note draft tests, template-validation tests, and service-role static guard.

## Notes

- The root PRD paths in `AGENTS.md` are actually under `chartspark-prd/`; I read `chartspark-prd/master/PRD-MASTER.md`, `features/02-patient-portal.md`, and the relevant project skills.
- Two stale pre-fix comments remain: `src/lib/reconcile/reconcile.ts:6` and `supabase/SCHEMA-NOTES.md:687` still say rejected rows are excluded from the signed snapshot. Current migration/code/tests correctly include rejected rows in the snapshot and exclude them only from note draft.
