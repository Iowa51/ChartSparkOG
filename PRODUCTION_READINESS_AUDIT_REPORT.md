# Production Readiness Audit Report

If ChartSparkOG onboarded its first paying clinician tomorrow, the single most likely failure is that a clinician would click **Submit Claim** on an approved note, see a success message saying the claim was submitted, and yet no billing claim would be created or transmitted at all. The UI currently patches the note directly to `signed` and never calls the managed-billing claim creation/submission paths, so revenue work can be silently dropped while the chart appears complete.

## P0 Findings

### Correctness

#### 1. "Submit Claim" is a false-success flow that never creates or submits a claim

**Severity** — P0  
**Category** — Correctness  
**File and line reference** — `src/app/(app)/notes/[id]/page.tsx:234-253`, `src/app/(app)/notes/[id]/page.tsx:765-774`, `src/app/api/notes/[id]/route.ts:120-130`, `src/lib/validation/schemas.ts:203-206`  
**What is wrong** — The approved-note UI advertises a billing submission workflow, but `handleSubmitClaim` does not call any managed-billing route. It sends a `PATCH` to `/api/notes/[id]` with `{ status: 'signed', signed_at }`, shows `Claim submitted! Note signed and locked.`, and closes. The server route accepts arbitrary `status` values from `NoteUpdateSchema`, and its lock check explicitly allows any edit that includes a `status` field, so this path bypasses claim creation entirely and simply mutates the note state.  
**Attack or failure scenario** — During a client demo or real clinician use, an approved note reaches the billing step. The clinician clicks **Submit Claim**, the product reports success, the note becomes `signed`, and staff assume the claim entered the billing pipeline. No `billing_claims` record is created and no clearinghouse submission occurs, so revenue is silently lost and reconciliation later shows missing claims with no obvious user-visible error at the moment of failure.  
**Suggested remediation** — Replace this UI path with a dedicated server route that atomically creates a `billing_claims` row, performs any validation required for submission, invokes the downstream submission path if intended, and only transitions the note to `signed` after the billing mutation succeeds. Remove raw `status` mutation for billing-signoff from the generic note patch endpoint, or explicitly reject `approved -> signed` transitions outside that dedicated workflow.  
**Test that would have caught this** — E2E test: move a note to `approved`, click **Submit Claim**, and assert that both a `billing_claims` record exists and the correct billing route was invoked before the UI shows success.

### Security

#### 2. Smart-triage PHI reads rely on implicit RLS instead of explicit org/patient authorization

**Severity** — P0  
**Category** — Security  
**File and line reference** — `src/app/api/ai/smart-triage/medication-review/route.ts:62-83`, `src/app/api/ai/smart-triage/prescribing-check/route.ts:39-50`  
**What is wrong** — Both smart-triage routes accept a caller-supplied `patient_id` and then read `patients`, `patient_medications`, `patient_problems`, and `patient_allergies` without any explicit `organization_id` filter or `canAccessPatient` check. This is inconsistent with other PHI-heavy routes in the repo, including `chart-summary`, which does explicitly scope patient reads by `organization_id`. In these two routes, tenant isolation depends entirely on external RLS correctness that is neither asserted in code nor verified before the PHI is assembled into AI prompts and returned summaries.  
**Attack or failure scenario** — A clinician or attacker with a valid account obtains or guesses another org’s patient UUID and posts it to one of these endpoints. If any one of the underlying tables is missing or misconfigured for RLS, the route will pull the other patient’s demographics, meds, diagnoses, or allergies, send that PHI into the AI prompt, and return derived safety guidance to the unauthorized caller. The victim is the patient whose medication history crosses org boundaries; the breach becomes immediately demo-visible if a clinician sees another practice’s chart data in triage output.  
**Suggested remediation** — Before any AI-side data fetch, enforce `canAccessPatient(context.user, patient_id)` or a shared helper that loads the patient row by `id + organization_id` and aborts on mismatch. Then apply explicit `organization_id` predicates on every downstream table read where the schema supports it. Do not rely on implicit RLS alone for PHI assembly routes.  
**Test that would have caught this** — Integration security test: authenticate as Org A, call both smart-triage endpoints with Org B’s `patient_id`, and assert a 404/403 with no PHI-bearing response body.

## P1 Findings

### Security

#### 3. Admin submissions workflow mutates billing review state directly from the browser with no audited server gate

**Severity** — P1  
**Category** — Security  
**File and line reference** — `src/app/(admin)/admin/submissions/page.tsx:96-107`, `src/app/(admin)/admin/submissions/page.tsx:118-129`  
**What is wrong** — The admin submissions page uses the browser Supabase client to approve or reject `submissions` directly. The mutation predicates only on `.eq('id', submissionId)`, with no server-side authorization check, no explicit org scoping on the write, and no audit-log emission. The page fetch path scopes by org for display, but the actual mutation path does not. This bypasses the hardened server route pattern used elsewhere in the app.  
**Attack or failure scenario** — An admin session in the browser, a compromised extension, or a user with access to devtools can replay the same client mutation against any known submission id. If RLS is broader than intended or regresses, cross-org billing-review state can be changed from the browser with no server audit trail. Even if RLS saves the data, the product still has no canonical server-side mutation point for one of its core compliance workflows.  
**Suggested remediation** — Remove direct browser `submissions.update(...)` writes. Route all approve/reject actions through an authenticated API endpoint that enforces role, org scope, allowed status transitions, and audit logging, then have the page call only that endpoint.  
**Test that would have caught this** — Integration test: verify the admin submissions UI can only mutate through a server endpoint and that every approval/rejection emits exactly one audit event.

### Compliance

#### 4. Auth audit events are dropped because the canonical audit helper now rejects calls without `resourceType`

**Severity** — P1  
**Category** — Compliance  
**File and line reference** — `src/lib/security/audit-log.ts:189-201`, `src/app/api/auth/record-attempt/route.ts:93-102`, `src/app/api/auth/signout/route.ts:28-37`  
**What is wrong** — `logAuditEvent` now throws before entering its main `try` block whenever `entry.resourceType` is missing. `record-attempt` logs `LOGIN_SUCCESS`/`LOGIN_FAILURE` without a `resourceType`, and `signout` logs `LOGOUT` without one. Those calls therefore fail before writing to `audit_logs`, and the routes intentionally swallow the exception. The result is silent loss of auth audit events for core HIPAA-relevant actions.  
**Attack or failure scenario** — During PHI onboarding, an auditor requests evidence of successful logins, failed logins, and user sign-outs around an incident window. The app appears to "log" those actions in code, but the rows never make it to `audit_logs`, so the audit trail is materially incomplete. An attacker brute-forcing accounts or a user repeatedly logging in/out leaves a much weaker record than operators expect.  
**Suggested remediation** — Either make `resourceType` optional for auth/session events and map them to a stable default like `entity_type='auth_session'`, or update every auth/security call site to pass an explicit `resourceType`. Add a failing unit test that enumerates all supported auth audit event types and ensures each persists successfully.  
**Test that would have caught this** — Integration test: hit login-attempt and signout flows, then assert corresponding `audit_logs` rows exist with non-null `entity_type`.

#### 5. Auditor batch actions mutate billing-review state without a complete audit trail and without rollback on partial failure

**Severity** — P1  
**Category** — Compliance  
**File and line reference** — `src/app/api/auditor/batch-action/route.ts:25-45`, `src/app/api/auditor/batch-action/route.ts:47-76`  
**What is wrong** — The batch-action route updates `submissions` status first and, for flagging, inserts `audit_flags` only afterward. It never emits a canonical audit event for approve/flag actions, and it does not roll back the `submissions` update when `audit_flags.insert(...)` fails. That leaves compliance-significant workflow changes without a guaranteed reason record or audit entry.  
**Attack or failure scenario** — An auditor flags a submission for revision; the `submissions` row becomes `flagged`, but the insert into `audit_flags` fails due to schema drift, validation, or transient DB trouble. The UI reports success, yet there is no durable reason trail explaining why the claim was flagged. In a later dispute or audit, staff can see the status change but cannot reconstruct who made it or why.  
**Suggested remediation** — Wrap approve/flag flows in a transaction or RPC that performs status transition, reason-record creation, and audit-log write atomically. Fail the request if any part of the semantic action cannot be persisted.  
**Test that would have caught this** — Integration test: force `audit_flags` insertion failure during a flag action and assert the submission status remains unchanged and no partial mutation survives.

### Reliability

#### 6. Several production external calls have no timeout or circuit-breaker protection

**Severity** — P1  
**Category** — Reliability  
**File and line reference** — `src/app/api/telehealth/create-room/route.ts:160-208`, `src/app/api/telehealth/end-session/route.ts:108-116`, `src/lib/managed-billing/clearinghouse-service.ts:233-305`, `src/lib/security/alerts.ts:155-170`  
**What is wrong** — Daily room creation, Daily meeting-token creation, Daily room teardown, Claim.MD submission, Availity token/claim submission, and webhook alert delivery all use raw `fetch(...)` without any timeout, abort signal, or shared circuit-breaker wrapper. The repo contains a tested circuit-breaker module, but outside `safeAzureOpenAI` it is not applied. A sidecar or vendor stall can therefore hang the request until the hosting platform times it out.  
**Attack or failure scenario** — Daily or a clearinghouse starts accepting TCP connections but stops responding. Clinicians trying to start telehealth sessions or staff submitting claims wait on hanging requests; Vercel workers pile up, requests saturate, and unrelated traffic degrades. Because there is no fail-fast timeout, operators get slow-motion outages instead of prompt errors and fallback behavior.  
**Suggested remediation** — Wrap every server-side external dependency call in `withTimeout(...)` and, where repeated outages are plausible, a per-provider `CircuitBreaker` with bounded retries. Return explicit 503-class errors to the caller once the timeout or breaker trips.  
**Test that would have caught this** — Integration/load test: stub Daily and clearinghouse endpoints to hang and assert the routes fail within a fixed deadline rather than waiting for platform timeout.

### Data Integrity

#### 7. Migration drift is unresolved across the repo; almost the entire migration set is "unknown" from local evidence

**Severity** — P1  
**Category** — Data Integrity  
**File and line reference** — `supabase/migrations/*`  
**What is wrong** — The audit instructions require production schema to be treated as authoritative, but the repo does not include an authoritative applied-migration ledger or a current production schema snapshot. From repository evidence alone, only `20260210_add_review_statuses.applied.sql` self-identifies as applied. Every other migration file is unknown, which means core assumptions around status constraints, RPC availability, audit-log shape, submissions, telehealth tokens, and billing infrastructure can still diverge from prod.  
**Attack or failure scenario** — Engineering ships code that depends on `accept_invitation_atomic`, `submissions`, audit-log schema changes, or later indexes, while production is missing one of those migrations. The app passes local inspection but fails live on first use with constraint errors, missing relation errors, or missing RPC errors. This is the same class of failure that already produced the dead sign flow.  
**Suggested remediation** — Pull the authoritative production `schema_migrations` state and a fresh schema dump, commit a machine-readable applied/not-applied ledger, and gate deploys on a drift check that compares repo expectations to production reality.  
**Test that would have caught this** — CI migration-drift test: compare the repo’s expected migration set plus schema snapshot against production `schema_migrations` and fail on any unknown or missing state.

Known migration classification from repository evidence:

- Confirmed applied:
  - `20260210_add_review_statuses.applied.sql`
- Confirmed not applied:
  - None confirmed from local evidence
- Unknown:
  - `20240114_security_hardening.sql`
  - `20260123120000_clearinghouse_integration.sql`
  - `20260123120001_subscription_system.sql`
  - `20260125120000_cpt_checklists_audit_sessions.sql`
  - `20260125120001_mfa_implementation.sql`
  - `20260125120002_pending_profile_changes.sql`
  - `20260125120003_user_invitations.sql`
  - `20260127120000_billing_idempotency.sql`
  - `20260127120001_fix_invitation_security.sql`
  - `20260127120002_login_attempts.sql`
  - `20260129_billing_core_infrastructure.sql`
  - `20260203120000_performance_indexes.sql`
  - `20260203120001_patient_extended_schema.sql`
  - `20260218_vitals_triage_tables.sql`
  - `20260318120000_sprint1_security_remediations.sql`
  - `20260318120001_sprint2_security_hardening.sql`
  - `20260318120002_sprint3_billing_unique_constraint.sql`
  - `20260319120000_billing_infrastructure.sql`
  - `20260319120001_create_claim_lines.sql`
  - `20260319120002_sprint4_security_remediations.sql`
  - `20260319130000_sprint5_audit_policy_alignment.sql`
  - `20260319131000_sprint5_session_timeout_and_profile_trigger.sql`
  - `20260319132000_sprint5_acknowledgements_rls.sql`
  - `20260320160000_sprint6_billing_claims_unique_encounter.sql`
  - `20260320170000_sprint6_processed_webhook_events.sql`
  - `20260320180000_sprint7_telehealth_session_tokens.sql`
  - `20260320190000_sprint7_encounter_tracking_rls.sql`
  - `20260320200000_sprint8_telehealth_token_single_use.sql`
  - `20260320200001_sprint8_webhook_events_service_role_policies.sql`
  - `20260322100000_sprint9_audit_logs_canonical_indexes.sql`
  - `20260322120000_sprint11_telehealth_tokens_service_role_policies.sql`
  - `20260327100000_pt2_patient_documents_delete_org_check.sql`
  - `20260327110000_pt3_mfa_functions_remove_uuid_params.sql`
  - `20260327120000_pt3_mfa_attempts_billing_claims_high_fixes.sql`
  - `20260327130000_pt3_phi_update_with_check_medium_fixes.sql`
  - `20260327140000_pt4_telehealth_token_cleanup_function.sql`
  - `20260327150000_pt5_billing_claims_null_encounter_unique.sql`
  - `20260327160000_pt6_storage_rls_org_scoped.sql`
  - `20260407_fix_audit_logs_schema.sql`
  - `20260410120000_telehealth_invite_tokens.sql`
  - `20260411120000_audit_logs_archive.sql`
  - `20260411120001_scalability_indexes.sql`
  - `20260417000000_accept_invitation_atomic.sql`
  - `20260419004357_add_encounters_duration_minutes.sql`
  - `20260421000000_create_submissions_table.sql`
  - `20260423000000_inline_expiration_drop_orphan.sql`
  - `ehr_integration_tables.sql`
  - `patient_documents.sql`
  - `stage1_database_foundation.sql`

### Observability

#### 8. There is no request-id propagation path through middleware or API logging

**Severity** — P1  
**Category** — Observability  
**File and line reference** — `src/middleware.ts:12-71`  
**What is wrong** — Middleware performs security checks and adds `X-API-Version`, but it never generates or forwards an `x-request-id` header, and there is no shared request identifier attached to route logs. In a system already demonstrating silent production failures, this leaves no durable way to correlate entry logs, DB mutations, downstream API calls, and user-reported failures across the request path.  
**Attack or failure scenario** — A clinician reports that signing, telehealth, or billing intermittently fails. Operators inspect logs and see multiple overlapping warnings and errors from different functions, but there is no common request identifier to reconstruct a single failing path end-to-end. Time-to-diagnosis stretches while production incidents remain live.  
**Suggested remediation** — Generate a UUID request id in middleware for every inbound request, set it on request/response headers, and require all route/log helpers to include it in every structured log line and external call context.  
**Test that would have caught this** — Integration test: issue a request through middleware and assert the response includes `x-request-id` and that downstream logging helpers receive the same id.

#### 9. The alerting subsystem is still mostly a stub and stores state only in process memory

**Severity** — P1  
**Category** — Observability  
**File and line reference** — `src/lib/security/alerts.ts:17-18`, `src/lib/security/alerts.ts:23-59`, `src/lib/security/alerts.ts:105-136`  
**What is wrong** — Security alerts are stored in an in-memory array and therefore disappear on process restart or across serverless instances. Email and SMS delivery are explicitly marked `pending_implementation`, and the only real outbound path is an optional webhook. This does not meet the audit requirement to verify at least one real alert path for elevated failures or auth-denied spikes.  
**Attack or failure scenario** — The app begins returning 5xxs or recording repeated authorization denials during a production incident. No persistent alert state exists, email/SMS paths never send anything, and the incident goes unnoticed until a user reports it. In a multi-instance deployment, some alerts exist only in one worker’s memory and vanish on recycle.  
**Suggested remediation** — Persist alerts to durable storage, implement at least one production-grade notification sink end-to-end, and add concrete alert rules for elevated 5xx rate and elevated auth-denied rate.  
**Test that would have caught this** — Integration test: trigger a critical security event in a production-like environment and assert a durable alert record plus one real outbound notification are produced.

## P2 Findings

### Observability

#### 10. The exported audit-log query helper does not match the canonical `audit_logs` schema

**Severity** — P2  
**Category** — Observability  
**File and line reference** — `src/lib/security/audit-log.ts:223-230`, `src/lib/security/audit-log.ts:455-495`  
**What is wrong** — The write path inserts `action`, `entity_type`, `entity_id`, `ip_address`, and `details`, while the exported `queryAuditLogs()` helper reads and filters on `timestamp`, `event_type`, `risk_level`, and `phi_accessed`. Those columns do not match the canonical schema described in the audit prompt or the row shape assembled by the writer. If this helper is wired into an admin/audit surface later, it will return errors or silently empty results.  
**Attack or failure scenario** — An engineer or operator later reuses `queryAuditLogs()` for an incident review or admin screen, expecting it to expose the canonical audit trail. Instead, queries fail or return no meaningful data because the filters target non-existent columns, delaying diagnosis and increasing the risk of false "no audit activity" conclusions.  
**Suggested remediation** — Rewrite `queryAuditLogs()` against the actual canonical schema: sort/filter by `created_at`, map `action` back to event type, and read risk/phi metadata from `details`. Add one integration test against a seeded `audit_logs` row written by `logAuditEvent()`.  
**Test that would have caught this** — Integration test: write an audit row with `logAuditEvent()`, read it back with `queryAuditLogs()`, and assert the returned fields round-trip correctly.

### UX

#### 11. Sign-flow diagnostic logging is still shipped in the clinician note page

**Severity** — P2  
**Category** — UX  
**File and line reference** — `src/app/(app)/notes/[id]/page.tsx:29`, `src/app/(app)/notes/[id]/page.tsx:128-166`  
**What is wrong** — The note page still emits `[SIGN-DIAG]` console warnings at module load, on submit-for-review entry, on early returns, before fetch, after fetch, and when parsing errors. The comments explicitly say the logging is diagnostic and should be removed after runtime testing. Leaving it in production-grade client code adds noise to browser consoles and risks habituating the team to low-signal debug output in the exact workflow that already failed silently once.  
**Attack or failure scenario** — During client testing, a clinician or technical stakeholder opens browser devtools to investigate an unrelated issue and sees ad hoc sign-flow diagnostics in a regulated workflow. That reduces trust, obscures real errors, and makes future production debugging harder because the console is already polluted with temporary instrumentation.  
**Suggested remediation** — Remove the temporary `[SIGN-DIAG]` instrumentation and replace any needed long-term telemetry with structured client mutation logging behind a controlled observability sink rather than raw console warnings.  
**Test that would have caught this** — E2E/browser test: load the note page and assert no temporary diagnostic console warnings are emitted during normal submit-for-review flow.

### Observability

#### 12. Core database types are stale and no longer represent the note lifecycle the app actually uses

**Severity** — P2  
**Category** — Observability  
**File and line reference** — `src/lib/types/database.ts:17`, `src/lib/types/database.ts:255`, `src/lib/types/database.ts:363`, `src/lib/validation/schemas.ts:203-206`  
**What is wrong** — The supposed canonical `NoteStatus` and note interfaces only model `draft | pending_review | signed` or `draft | completed | signed`, while the rest of the app actively uses `approved`, `needs_revision`, and `completed` in validators and route logic. That type drift guarantees that future refactors, autocomplete, and compile-time reasoning will mislead engineers about the legal state machine.  
**Attack or failure scenario** — An engineer adds a new feature against the stale types, omits handling for `approved` or `needs_revision`, and ships another workflow regression similar to the recent sign-flow failure because the type system did not represent production reality.  
**Suggested remediation** — Regenerate or hand-correct the canonical DB/domain types so the shared `NoteStatus` matches the actual validated statuses, then remove duplicate or divergent note-status declarations.  
**Test that would have caught this** — Type-level/unit test: assert the canonical exported note-status type is identical to the Zod note-status enum used by the route validators.

## Observations

- BAA status is not documented in this repo or handoff artifacts for Azure OpenAI/Whisper, Resend, Sentry, Upstash Redis, and Vercel. Because several routes send or derive PHI through these services, the legal/data-sharing status is still unclear from the evidence available here.
- I did not find any server-side `supabase.auth.getSession()` usage under `src/`; the only `getSession()` match was in a client component (`src/components/auth/MFAGate.tsx`), which is acceptable for this specific audit check.
