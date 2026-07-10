# CODEX REVIEW - Sprint 2 / P3

## Verdict

**REJECT.** The required suites pass, but the P3 implementation has two clinical/security gate blockers:

- `portal_submit_intake` is not concurrency-safe. Two simultaneous submits can both materialize the same intake and duplicate clinical child rows.
- The reconcile status API can sign an intake while first-class patient-entered rows are still unresolved, producing a signed snapshot and draft note that omit submitted clinical data.

I also found a template-aware validation bypass on updates and service-role usage in patient portal paths that conflicts with the review prompt and the PRD security posture.

State caveats verified before review:

- Workspace is `C:\Users\joman\OneDrive\Desktop\ChartSparkOG`, which conflicts with `GIT-RULES.md` "not under OneDrive"; user explicitly anchored this review to this workspace.
- Branch is `main`, HEAD `2299eed`.
- Remote is `https://Iowa51@github.com/Iowa51/ChartSparkOG.git`.
- Active `gh` account is `RedArkventures`; `Iowa51` is logged in but inactive. No push/commit was performed.

## Findings

| ID | Severity | File | Description | Remedy |
| --- | --- | --- | --- | --- |
| P3-CRIT-1 | Critical | `supabase/migrations/20260708120000_sprint2_p3_reconciliation.sql:136` | `portal_submit_intake` reads the submission without locking it, checks `submitted_at/materialized_at`, inserts child rows, and only sets the sentinel at the end (`:302`). A concurrent double-submit probe with two real `patient_portal` connections returned `already_submitted:false` for both calls and inserted 400 `problems` rows from a 200-row payload. The sequential idempotency test misses this race. | Serialize submit per parent row. Use `SELECT ... FOR UPDATE` on `intake_submissions` before the idempotency check, or atomically claim the row with an update/returning guard inside the same transaction before materializing. Add a DB test that uses two concurrent `patient_portal` clients and asserts one materialization only. |
| P3-CRIT-2 | Critical | `src/app/api/reconcile/[submissionId]/status/route.ts:47` | The status route updates `status` directly from the request and relies only on the generic DB transition trigger. It does not verify that the submitted intake's first-class rows are all accepted/rejected/coded before `reconciled` or `signed`. Probe result: one unresolved problem remained, the API-equivalent DB transition reached `signed`, and `signed_snapshot.problems` length was `0`. This can silently drop patient-entered meds/allergies/problems from the legal snapshot and generated note. | Enforce reconciliation readiness server-side, preferably in the DB trigger/RPC and also in the route. Reject `provider_review` unless `submitted_at IS NOT NULL`; reject `reconciled`/`signed` unless every linked `problems`/`medications`/`allergies` row is resolved (`rejected=true` or `reconciled=true AND needs_coding=false`). Add negative DB/API tests. |
| P3-HIGH-3 | High | `src/app/api/portal/intake/route.ts:138`, `src/lib/portal/portal-db.ts:145` | Template-aware validation runs only when the request body includes a non-null `template_id`. For an existing template-bound submission, a client can send `submission_id` with `template_id:null`; the route skips template validation, while the DB update preserves the old template via `COALESCE($3, template_id)`. This bypasses the claimed allowlist for real-template updates. | Resolve an effective template before validation: if updating, load the owned submission's existing `template_id` and validate against it when the request omits/nulls `template_id`. Reject unauthorized template changes. Add a route test for update-with-null-template against a stored template. |
| P3-HIGH-4 | High | `src/app/(portal)/intake/[token]/page.tsx:14`, `src/lib/portal/portal-invites.ts:10` | Patient portal paths use the service-role client. The intake page uses service role to read `intake_templates` (`page.tsx:32`, `:36`), bypassing the `patient_portal` template RLS and org/system scoping; a foreign org's active `family_medicine` template could be rendered. The public claim helper also uses service role for invite lookup, `patient_portal_users` insert, and invite update. This conflicts with the prompt's "no service-role usage anywhere in portal paths" and the PRD's service-role caution for user-facing code. | Use `patient_portal` scoped reads for authenticated template rendering. For unauthenticated invite claim, move DB mutations behind a narrowly scoped SECURITY DEFINER function or least-privilege role with a single-use conditional update; isolate any unavoidable Supabase Auth admin call from database service-role writes. Add tests proving service-role client is not imported in portal paths. |
| P3-MED-5 | Medium | `src/app/api/reconcile/[submissionId]/row/route.ts:79` | The row reconciliation endpoint checks only row id plus `intake_submission_id`; it does not check parent submission status or `submitted_at`. A provider can accept/reject rows outside the intended `provider_review` phase until signed-row locks happen to block mutation. | Join/read the parent submission and require `status='provider_review'` and `submitted_at IS NOT NULL` before row actions. Add negative tests for `patient_entered`, `reconciled`, and `signed`. |
| P3-MED-6 | Medium | `src/lib/portal/portal-invites.ts:69`, `src/lib/portal/portal-invites.ts:123` | Invite claim is not transactionally single-use. It checks `claimed_at`, creates the auth user, inserts `patient_portal_users`, then updates `patient_portal_invites` by id without checking update errors or conditioning on `claimed_at IS NULL`. A failed final update leaves an active portal account with an apparently unclaimed invite. | Make claim atomic at the DB boundary: conditional update/returning on `claimed_at IS NULL`, checked row count, and explicit error handling. If Auth user creation cannot be in the same transaction, persist a recovery/compensation state and do not report success until the invite row is marked claimed. |

## Executed Evidence

| Check | Command/probe | Result |
| --- | --- | --- |
| Repo state | `git status --short`, `git remote -v`, `git branch --show-current`, `git log --oneline -1`, `gh auth status` | Dirty Sprint 2 tree, branch `main`, HEAD `2299eed`, remote `Iowa51/ChartSparkOG`; active `gh` account is `RedArkventures`. |
| Harness | `& 'C:\Program Files\Git\bin\bash.exe' scripts/db-local-verify.sh` | Passed. Full isolation chain applied through `20260708120000_sprint2_p3_reconciliation.sql`. |
| DB suite | `npm run test:db` | Passed: 3 files, 163 tests. |
| Unit/route suite | `npm run test:run` | Passed: 41 files, 408 tests. |
| Connection identity leakage | Single psql session: patient A transaction, commit, no-claim transaction, patient B transaction | Patient A saw only A submission; after commit residual claims were empty; no-claim query saw 0 rows; patient B saw only B submission. |
| Role escape | Real `patient_portal` login via psql | `RESET ROLE` stayed `patient_portal`; `SET ROLE authenticated` and `SET ROLE postgres` both failed with permission denied. |
| RPC grants/search path | `pg_proc` plus `information_schema.routine_privileges` query | `portal_submit_intake(uuid)` is `SECURITY DEFINER`, owner `postgres`, `search_path=public`, `proacl={postgres,patient_portal}`; routine privileges list only `postgres` and `patient_portal`. |
| Concurrent submit | Node probe with two real `patient_portal` connections calling `portal_submit_intake` concurrently | Both calls fulfilled with `already_submitted:false`; expected 200 child rows, found 400. Finding P3-CRIT-1. |
| Unresolved sign | SQL probe: one unresolved problem, provider transitions to signed | Transition succeeded; `signed_snapshot.problems` length was 0 while unresolved row count remained 1. Finding P3-CRIT-2. |
| Service-role audit | `rg "PORTAL_DATABASE_URL|service-role|createServiceRoleClient|service_role" src supabase scripts .env.example` | `PORTAL_DATABASE_URL` appears only in server-side `portal-db.ts` and docs, not `NEXT_PUBLIC_*`; portal page and invite helper import/use `createServiceRoleClient`. |

## SPRINT2-REPORT Claim Audit

| Claim | Audit result |
| --- | --- |
| `db-local-verify.sh` applies the full migration chain including P3 | Verified. |
| `npm run test:db` has 163 tests passing | Verified exactly: 163 passed. |
| Unit/route suite has 408 tests passing | Verified exactly: 408 passed. |
| Dedicated portal connection uses transaction-scoped claims | Verified by code and same-session probe. No residual claims after commit; no-claim pre-query returned zero rows. |
| Role cannot be escalated from `patient_portal` | Verified: `SET ROLE authenticated/postgres` denied. |
| RPC EXECUTE granted only to `patient_portal` | Verified: only `postgres` and `patient_portal` routine privileges. |
| RPC idempotent | Sequential idempotency is covered, but concurrent idempotency is false. Probe duplicated rows. |
| Ownership guard blocks another patient's submission | Covered by executed DB suite; same-session RLS probe also confirmed per-patient visibility. |
| Transactional rollback on induced materialization failure | Covered by executed DB suite. |
| Reconciliation state machine server-enforced end to end | Partially false. Forward transition legality is enforced, but readiness/status preconditions are not. Unresolved rows can be signed out of the snapshot. |
| Note auto-population is draft-only from signed data | Code and tests support draft-only from `signed_snapshot`; however P3-CRIT-2 means the signed data can be incomplete. |
| Vitals `encounter_id` wiring | Code inspection supports open-encounter resolution when omitted; I did not find/execute a dedicated vitals route test for this path. |
| No service-role usage anywhere in portal paths | False. Service role is used in portal intake page and invite helper. |
| Feature flags default off | Verified in code: `INTAKE_V1` and `RECONCILE_V1` checks default false/off. |
| Migration additive/idempotent/ledgered | Mostly verified by harness and ledger entry; P3 function uses `CREATE OR REPLACE` and `ADD COLUMN IF NOT EXISTS`. |

## Untested Surfaces / Residual Risk

- I did not run `npx tsc --noEmit` or ESLint; the prompt only required harness, DB suite, and unit/route suite counts.
- Portal claim helper internals are not integration-tested against real Supabase Auth; route tests mock `claimPortalInvite` and `signInWithPassword`.
- CSRF and rate-limit failure paths on new portal auth routes are code-inspected but mocked as success in the route tests.
- Portal login route has no dedicated route test file in the uncommitted set.
- Reconciliation API routes do not appear to have route-level tests; DB and pure helper tests cover only part of the behavior.
- Browser/rendered-screen verification was not performed for the portal auth form or reconcile UI.
- Actual production credential distinctness for `PORTAL_DATABASE_URL` cannot be proven locally; it is absent from `.env.example` and the central env schema, though it is read server-side only.

---

## REMEDIATION (P3-FIXES) — 2026-07-09

All six findings remediated via **one new additive migration**
`supabase/migrations/20260709120000_sprint2_p3_fixes.sql` (CREATE OR REPLACE +
new SECURITY DEFINER functions; no committed migration file rewritten) plus the
app-layer + test changes below. Nothing committed or pushed.

**Verification (all green):**

| Check | Result |
| --- | --- |
| `bash scripts/db-local-verify.sh` (fresh PG16, full chain + P3-FIXES) | Passed (exit 0) |
| `npm run test:db` | **176 passed** (was 163; +13) |
| `npm run test:run` | **428 passed** (was 408; +20) |
| `npx tsc --noEmit` | clean |

### P3-CRIT-1 — portal_submit_intake concurrency (FIXED)

`portal_submit_intake` now (1) locks the parent row with `SELECT ... FOR UPDATE`
**before** the idempotency check, serializing concurrent submits; and (2) claims
`materialized_at` with a conditional `UPDATE ... WHERE materialized_at IS NULL`
(row-count checked) **before** any child insert — the structural
single-materialization backstop. A concurrent double-submit now yields exactly one
materialization; the loser blocks, re-reads the claimed sentinel, and returns
`already_submitted:true`.

- Test: `reconciliation.test.ts` › "two concurrent patient_portal submits
  materialize exactly once (CRIT-1)" — two REAL `patient_portal` connections; one
  `already_submitted:false`, one `:true`; **2** child problems, not 4.

### P3-CRIT-2 — sign-readiness gate (FIXED)

`enforce_intake_submission_state` (DB trigger — the un-bypassable enforcement
point) now: (a) rejects `provider_review` unless `submitted_at IS NOT NULL`; (b)
rejects `reconciled`/`signed` while any first-class row (problems/medications/
allergies) is unresolved (`rejected=false AND (reconciled=false OR
needs_coding=true)`); (c) the signed snapshot captures **all** first-class rows
via `to_jsonb(row)`, so accepted **and** rejected rows appear with their
disposition flags — the record shows disposition, not omission. The status route
mirrors (a)/(b) for precise 409s (`assertReconcileReady`). The note draft
(`buildIntakeNoteDraft`) excludes rejected rows so the clinical note reflects only
the accepted picture.

- DB tests: readiness blocks unresolved sign; provider_review requires
  submitted_at; snapshot records all first-class rows with disposition.
- Route tests: `status/route.test.ts` — unresolved reconciled/signed → 409;
  provider_review unsubmitted → 409.

### P3-HIGH-3 — effective-template validation (FIXED)

`/api/portal/intake` resolves an **effective template**: on update it loads the
owned submission's stored `template_id` and validates against it when the request
omits/nulls `template_id`; changing a bound template is rejected (409). Closes the
`template_id:null` allowlist bypass.

- Route tests (`portal/intake/route.test.ts`): update-with-null-template validates
  (junk key → 400); valid update → 200; template change → 409.

### P3-HIGH-4 — service role removed from portal paths (FIXED)

(a) The intake page reads the active template through the patient's own
`patient_portal` connection (RLS `portal_intake_templates_select`), via
`getActivePortalTemplate`. (b) Invite read + claim DB access moved to SECURITY
DEFINER `validate_portal_invite` / `claim_portal_invite` (owner postgres,
`search_path` pinned, `EXECUTE` only to `patient_portal`; PUBLIC/anon/
authenticated/service_role revoked). The Supabase Auth admin `createUser`/
`deleteUser` calls are isolated in `src/lib/auth/portal-auth-admin.ts` (Auth API
only, no DB write). `portal-invites.ts` + `(portal)` no longer import the service
role.

- Test: `no-service-role.test.ts` statically asserts no `createServiceRoleClient`
  under `src/app/(portal)/**` or `src/lib/portal/**`.
- DB privilege probes (`portal-claim.test.ts`): `patient_portal` CAN execute;
  `authenticated`/`anon` → permission denied.

### P3-MED-5 — row reconcile phase guard (FIXED)

`/api/reconcile/[submissionId]/row` now loads the parent submission and requires
`status='provider_review'` AND `submitted_at IS NOT NULL` before any accept/reject.

- Route tests (`row/route.test.ts`): patient_entered / reconciled / signed / unsubmitted
  all → 409; provider_review → 200.

### P3-MED-6 — atomic single-use invite claim (FIXED)

`claim_portal_invite` locks the invite (`FOR UPDATE`), inserts the portal-account
link, then applies a single-use conditional `UPDATE ... WHERE claimed_at IS NULL`
with a checked row-count — one transactional unit (a failure rolls back the link).
If the Auth account was created but the DB claim fails, `claimPortalInvite`
compensates by deleting the Auth user; if that also fails it records a compensable
state (`PORTAL_CLAIM_ORPHAN_AUTH_USER`) and does **not** report success (recovery
path in SCHEMA-NOTES).

- DB tests (`portal-claim.test.ts`): claim links + marks single-use; second claim →
  `claimed`; account_exists / expired guards; **two concurrent claims → exactly one
  succeeds**, one portal user.

### Note on committed test setup

The required CRIT-2 gate (provider_review requires submitted_at; reconciled/signed
require resolution) invalidated the **setup** of several committed state-machine
tests that advanced through the flow without submitting/resolving. Their setup was
corrected minimally (stamp `submitted_at`; resolve rows) to describe the now-legal
flow — no committed **migration** file was rewritten, and each test's actual
assertion is unchanged.
