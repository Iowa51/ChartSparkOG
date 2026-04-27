# Phase B Post-Pilot Backlog

**Generated:** 2026-04-21
**Source:** Codex production readiness audit (2026-04-21) + pilot prep session decisions
**Pilot:** Practice One — 5 days active + 7 days read-only, single clinician (James as USER + AUDITOR)
**Read this before the pilot retrospective.** Anything addressed during the pilot itself should be checked off and dated.

---

## How to read this

Each item is tagged with its origin:
- `[Codex-P0]` — production readiness audit, blocking severity (now resolved if listed here)
- `[Codex-P1]` — production readiness audit, ship-before-PHI-onboarding severity
- `[Codex-P2]` — production readiness audit, ship-before-scale severity
- `[Trade-off]` — accepted compromise during P0 work; needs proper resolution
- `[Migration]` — schema/database state to reconcile or apply
- `[Test-infra]` — test infrastructure debt
- `[Pilot-feedback]` — placeholder for issues that surface during the pilot itself

Severity in Phase B is independent of Codex severity. Some Codex P1s become Phase B P0 because they block second-pilot or scale; some Codex P2s stay P2.

---

## Phase B Priority 1 — must ship before pilot #2 OR before any non-pilot user touches the system

These are the items where deferring past the first pilot is acceptable but deferring past the second is not. The pattern: single-user-single-org pilot tolerates these; multi-user or multi-org does not.

### B-P1-1 Audit log fire-and-forget on PHI mutations
- **Origin:** [Codex-P1-1]
- **Files:** `src/lib/security/audit-log.ts:181-190, 296-305`; call sites in `src/app/api/notes/[id]/sign/route.ts:165-233`, `src/app/api/patients/route.ts:57-73`
- **Problem:** `logAuditEventAsync` returns void and fire-and-forgets. Several call sites use `await` on it but it's not awaitable. If audit insert fails (Supabase down, schema drift, missing service role key), the clinical mutation still succeeds and only a safe log line is emitted. HIPAA reconstruction becomes impossible.
- **Fix:** Split into `logAuditEventRequired` (fail closed for PHI reads/mutations, retry queue) and `logAuditEventBestEffort`. Patient/note/submission/role/auth/billing mutations use the required helper. Alert on `AUDIT_LOG_DB_WRITE_FAILED`.
- **Why deferred:** Single-user pilot has low audit-write volume; the failure mode is rare in practice for 5 days.

### B-P1-2 PHI in audit log details (patient search terms)
- **Origin:** [Codex-P1-2]
- **Files:** `src/app/api/patients/route.ts:66-70`, `src/lib/data/patients.ts:235-240`
- **Problem:** Patient search terms (which include names, phone numbers, MRNs, emails) are written raw into `audit_logs.details` JSONB. Anyone exporting audit logs receives PHI that should not be there.
- **Fix:** Replace raw search strings with `{ has_search: true, search_length: N }` plus optional HMAC digest for correlation. No raw user input in `details`.
- **Why deferred:** James is the only patient-search caller during the pilot; cross-export PHI exposure window is null.

### B-P1-3 Login route does not self-audit
- **Origin:** [Codex-P1-3]
- **Files:** `src/app/api/auth/login/route.ts:24-121`, `src/app/api/auth/record-attempt/route.ts:94-110`
- **Problem:** Login auditing is delegated to a separate `/api/auth/record-attempt` endpoint that the client calls. A direct API caller, broken client path, blocked request, or malicious script can authenticate without creating the expected `LOGIN_SUCCESS`/`LOGIN_FAILURE` audit row.
- **Fix:** Move login success/failure recording into `/api/auth/login` itself, immediately after `signInWithPassword` returns. Use service-role write. Keep `/api/auth/record-attempt` as legacy no-op or remove.

### B-P1-4 BAA inventory doc + processor allowlist
- **Origin:** [Codex-P1-4]
- **Files:** Affects Azure OpenAI, Resend, Sentry, Upstash, Daily, Supabase, Vercel
- **Problem:** No in-repo evidence of executed BAAs for PHI-receiving processors. James confirmed all are signed, but compliance auditors expect documentation in the repo.
- **Fix:** Create `docs/compliance/baa-inventory.md` documenting: each processor, PHI categories sent, BAA status, owner, renewal date, production env gate. Add startup check that blocks AI/email/Sentry/Upstash/Daily integrations unless the configured service is in an approved-processor allowlist.
- **Estimated effort:** 30 min to write doc, 1-2 hr for allowlist enforcement.

### B-P1-5 Rate limiter fails open for cost-bearing endpoints
- **Origin:** [Codex-P1-5]
- **Files:** `src/lib/security/rate-limit.ts:18-37, 328-332, 392-408, 436-450`
- **Problem:** When Upstash is misconfigured or unavailable, AI/telehealth/forgot-password/MFA/role-change buckets fail open via in-memory fallback. In-memory counters don't work in Vercel serverless. Effective limit becomes infinity.
- **Fix:** Fail closed for PHI-bearing and cost-bearing endpoints. Health check that refuses production startup or deploy promotion when Upstash credentials are absent or invalid.

### B-P1-6 SIDECAR_READY is a static gate
- **Origin:** [Codex-P1-6]
- **Files:** `src/app/api/agent/complete-session/route.ts:55-60, 96-122`, `src/lib/env.ts:77-79`
- **Problem:** `SIDECAR_READY === 'true'` is checked once. If the agent sidecar dies after deploy, the gate stays green and the route silently builds local drafts instead of calling the AI sidecar.
- **Fix:** Replace static env var with health-checking client that probes the sidecar with short timeout and cached negative state.

### B-P1-7 Patient creation is non-transactional
- **Origin:** [Codex-P1-7]
- **Files:** `src/lib/data/patients.ts:291-309, 319-390, 393-404`
- **Problem:** Patient row inserts, then allergies/medications/problems/insurance insert separately. Related-data failures are logged and ignored. AI prescribing checks later run against a patient with missing allergy context.
- **Fix:** Single Postgres RPC that inserts atomically. Or rollback patient row on related-insert failure.

### B-P1-8 Request ID propagation
- **Origin:** [Codex-P1-8]
- **Files:** `src/middleware.ts:14-22`, `src/lib/logging/safe-logger.ts:160-181`, `src/lib/security/audit-log.ts:252-268`
- **Problem:** Middleware generates `x-request-id` but `withAuth` doesn't attach it to `AuthContext`, and route logs/audit calls don't include it. Vercel logs and audit rows can't be correlated.
- **Fix:** Add `requestId` to `AuthContext`. Lint rule or test to fail handlers that omit request ID on server logs.

### B-P1-9 5xx and elevated auth-failure alerting
- **Origin:** [Codex-P1-9]
- **Files:** `src/middleware.ts:11-14`, `src/lib/security/alerts.ts:1-7, 67-103, 131-157`
- **Problem:** TODO comment in code; only optional security/auth-failure webhook delivery exists. No 5xx rate alert. Same failure class as the dead-button bug we chased manually all day.
- **Fix:** Response-observing instrumentation. Alert on 5xx rate spikes and 401/403 spikes. Required in production, not optional.
- **Note:** Build 5 in the original pilot plan was Slack alerts. The Slack workspace and webhook are already set up. This item is "wire the actual alert dispatch."

### B-P1-10 Auditor detail-route status guard
- **Origin:** [Trade-off from P0-C]
- **Files:** `src/app/api/notes/[id]/route.ts` GET handler
- **Problem:** AUDITOR can fetch any note in their org via direct GET regardless of status. List view restricts them to `pending_review/approved/needs_revision`, but detail view doesn't enforce that contract. UUID-guessing or out-of-band UUID source bypasses the queue restriction.
- **Fix:** Add status check in GET handler — if caller role is AUDITOR, return 404 unless note status is in the three review-queue statuses.
- **Why deferred:** James is both clinician and auditor in the pilot; theoretical exposure window only.

### B-P1-11 Migration `pt6_storage_rls_org_scoped` not applied
- **Origin:** [Migration]
- **Files:** `supabase/migrations/20260327160000_pt6_storage_rls_org_scoped.sql`
- **Problem:** Production has zero RLS policies on `storage.objects`. If patient documents are stored in Supabase Storage, cross-org access is possible.
- **Fix:** Apply the migration via Supabase SQL Editor. Same workflow as `20260210` and `20260427042735`.
- **Pre-check:** Confirm Practice One's pilot doesn't use Supabase Storage for patient docs. If they do, this becomes B-P0.

### B-P1-12 Migration `pt4_telehealth_token_cleanup_function` not applied
- **Origin:** [Migration]
- **Files:** `supabase/migrations/20260327140000_pt4_telehealth_token_cleanup_function.sql`
- **Problem:** Function `cleanup_expired_telehealth_tokens` doesn't exist in production. Expired join tokens accumulate forever in `telehealth_session_tokens`.
- **Fix:** Apply migration. Schedule the function via pg_cron or manual periodic invocation.

### B-P1-13 Migration `pt5_billing_claims_null_encounter_unique` not applied
- **Origin:** [Migration]
- **Files:** `supabase/migrations/20260327150000_pt5_billing_claims_null_encounter_unique.sql`
- **Problem:** Index for null encounter_id uniqueness on billing_claims doesn't exist. Duplicate claim insertion possible when encounter_id is null.
- **Fix:** Apply migration. Only matters if managed billing goes live.

### B-P1-14 Migration `audit_logs_archive` not applied
- **Origin:** [Migration]
- **Files:** `supabase/migrations/20260411120000_audit_logs_archive.sql`
- **Problem:** No archive table; HIPAA wants 6-year retention. `audit_logs` grows unbounded.
- **Fix:** Apply migration. Set up archival job.

### B-P1-15 Migration ledger uncertain entries
- **Origin:** [Migration]
- **Files:** Five entries in `supabase/MIGRATION_LEDGER.md` marked `uncertain — see notes`
- **Problem:** `pt3_phi_update_with_check_medium_fixes`, `fix_audit_logs_schema`, `scalability_indexes`, `accept_invitation_atomic`, `inline_expiration_drop_orphan` — status uncertain because verification queries weren't run during P0-A.
- **Fix:** Run the verification queries listed in the ledger notes. Update statuses accordingly. Apply any that turn out to be missing and depended on by code.

---

## Phase B Priority 2 — ship before scale (multiple orgs, real load)

### B-P2-1 Note status type drift
- **Origin:** [Codex-P2-1]
- **Files:** `src/lib/types/database.ts:17, 255, 363`, `src/lib/validation/schemas.ts:189-205`
- **Problem:** Local TS types define note status differently in three places — `draft/pending_review/signed` in one, `draft/completed/signed` in another, and validation uses `completed/approved/needs_revision`. Production CHECK constraint allows all 7 statuses.
- **Fix:** Regenerate Supabase types from production schema. Single `ClinicalNoteStatusSchema` Zod enum. Remove hand-maintained duplicates.

### B-P2-2 Appointment/encounter status inconsistency
- **Origin:** [Codex-P2-2]
- **Files:** `src/app/api/appointments/[id]/route.ts:13-25`, `src/lib/validation/schemas.ts:168-180`
- **Problem:** Validation accepts `confirmed` and `no_show` but schema CHECK may not. (Production CHECK on appointments DOES include both per our verification, so this may be partially resolved — needs re-check.)
- **Fix:** Centralize appointment statuses in one Zod enum. Schema-contract test against `pg_constraint`.

### B-P2-3 Patient search loads full org PHI in memory
- **Origin:** [Codex-P2-3]
- **Files:** `src/lib/data/patients.ts:203-233`, `src/app/api/patients/route.ts:43-54`
- **Problem:** `select('*')` with no `.range()` or `.limit()`, then in-memory filter and paginate. At 10K patients this transfers full PHI for every keystroke search.
- **Fix:** Database-side `ilike` on indexed columns. List-view projection only. `.range(from, to)`. Add indexes for `(organization_id, last_name)` and `(organization_id, first_name)`.

### B-P2-4 Note list returns full SOAP body
- **Origin:** [Codex-P2-4]
- **Files:** `src/app/api/notes/route.ts:55-65`, `src/app/api/notes/[id]/route.ts:26-35`, `src/lib/data/notes.ts:30-34, 64-68`
- **Problem:** `select('*')` on `clinical_notes` for both list and detail. List view transfers large SOAP text it doesn't render.
- **Fix:** Separate list and detail projections. List: `id, patient_id, status, created_at, updated_at, cpt_codes, icd10_codes, billing_amount, patient(id, first_name, last_name)`. Detail keeps full content.

### B-P2-5 Remove `[SIGN-DIAG]` console logs
- **Origin:** [Codex-P2-5]
- **Files:** `src/app/(app)/notes/[id]/page.tsx:29, 128-188`
- **Problem:** Sign-flow diagnostics still in production bundle. Logs note IDs, sign state, response status, response bodies, errors. James added these during Phase A debugging; they were supposed to be removed before client testing.
- **Fix:** Remove. Replace with production-safe observability that sends request ID, route, status, non-PHI error codes to telemetry.
- **Build-time guard:** Grep test fails production builds if `[SIGN-DIAG]` appears in `src/app`.

### B-P2-6 ConfirmModal accepts non-async handlers
- **Origin:** [Codex-P2-6]
- **Files:** `src/components/ui/ConfirmModal.tsx:6-25, 133-140`, `src/app/(app)/notes/[id]/page.tsx:767-785`
- **Problem:** `onConfirm` typed as `() => void`, doesn't await promises. Sign modal uses `asyncConfirm`, but submit-claim and delete-note modals call async handlers without it. Modal closes before async completes; double-click possible.
- **Fix:** Type `onConfirm` as `() => void | Promise<void>`. Component awaits and manages internal pending state. Submit-claim and delete-note opt into async behavior.

### B-P2-7 Audit event taxonomy widening
- **Origin:** [Trade-off from P0-B and P0-C]
- **Files:** `src/lib/security/audit-log.ts` `AuditEventType` union
- **Problem:** Closed union prevented adding `AI_PROVIDER_UNAVAILABLE` and `AUDITOR_QUEUE_VIEWED` as top-level events. Both were shoehorned into existing types (`API_ERROR` and `PATIENT_SEARCH` respectively) with the real signal in `details.action`. Semantically wrong; queries must check details rather than the indexed event_type column.
- **Fix:** Widen the union. Add proper top-level event types. Migrate the two trade-off events to their proper names. Update queries downstream.

---

## Phase B Priority 3 — nice to have

### B-P3-1 Test infrastructure failures
- **Origin:** [Test-infra]
- **Files:** `src/__tests__/api/medication-review.test.ts`, intrusion-detection test
- **Problem:** Pre-existing test failures unrelated to recent work. Verified during P0-B and P0-C.
- **Fix:** Investigate and repair. May indicate environment drift, broken mocks, or genuine bugs.

### B-P3-2 P0-A/P0-B/P0-C ledger and trade-off documentation
- **Origin:** [Trade-off]
- **Problem:** Three trade-offs from P0 work need to be reflected in their respective files' code comments so future readers don't undo them.
- **Fix:** Add comment headers to:
  - `src/services/safeAzureOpenAI.ts` near `isDemoFallbackAllowed`: "Demo gate is fail-closed in production. P0-B 2026-04-21."
  - `src/app/api/notes/route.ts` near AUDITOR branch: "AUDITOR status restriction is server-side enforced; query param cannot bypass. P0-C 2026-04-21."
  - `supabase/MIGRATION_LEDGER.md`: already has a "Last verified" header from P0-A.

---

## Pilot-feedback placeholder

Items that surface during the actual 5-day pilot get logged here as they happen.

```
B-PF-? <date> <one-line description>
  Source: <Practice One feedback / observed Slack alert / Vercel logs>
  Severity: <P0/P1/P2/P3>
  Owner: James
```

---

## Process notes

- **No work on this backlog during the pilot.** The pilot is observation + bug-fix-only mode. New features and refactors wait.
- **Post-pilot retro:** review every B-P1 item and decide which ones go into the immediate post-pilot sprint vs which can wait for the second pilot.
- **The Slack workspace and `#pilot-alerts` channel are already provisioned.** Wiring the actual 5xx alert dispatch (B-P1-9) is the only active step needed; everything else is fix-the-existing-system.
- **Migration application during Phase B:** any migration we apply post-pilot should follow the same workflow we used for `20260210` and `20260427042735` — apply via SQL Editor, rename file to `.applied.sql`, commit ledger update with `--no-verify`. Do not run `supabase db push` against production unless we've reset the ledger to match what's actually applied.

---

**Total Phase B items:** 25 across three priorities + open pilot-feedback bucket.

**Last updated:** 2026-04-21