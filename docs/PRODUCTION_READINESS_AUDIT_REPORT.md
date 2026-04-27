# ChartSparkOG Production Readiness Audit Report

## Verdict

If ChartSparkOG onboarded its first paying clinician tomorrow, the single most likely failure would be clinical note generation silently producing fabricated demo content during an Azure OpenAI or Whisper outage. The production AI wrapper falls back to a hard-coded demo SOAP note and demo transcript instead of failing closed, and that demo content includes invented vitals, diagnoses, medication adherence, safety statements, follow-up plans, and time spent. A clinician could sign or submit a note that looks polished but contains facts the clinician never documented.

Scope audited: static analysis of `src/` plus the migration/schema/env surfaces explicitly called out by the audit prompt. I did not run tests against production.

## P0 Findings

### P0-1 - Correctness

**File and line reference:** `src/app/api/ai/generate-note/route.ts:158-159`, `src/app/api/ai/transcribe-and-generate/route.ts:97-126`, `src/services/safeAzureOpenAI.ts:570-643`, `src/services/safeAzureOpenAI.ts:834-929`, `src/services/safeAzureOpenAI.ts:1000-1033`

**What is wrong:** Production AI routes use `safeAzureOpenAI`, whose `generateSOAPNote` and `transcribeAudio` methods return demo fallback content whenever Azure is unavailable or throws. The demo SOAP fallback fabricates normal vital signs, mental status exam findings, diagnoses such as MDD/GAD with ICD-10 codes, safety statements, treatment plans, and time spent. This is not gated to non-production demo mode.

**Attack or failure scenario:** Azure OpenAI or Whisper has a transient outage during a client pilot. The clinician records audio or generates a note, receives a plausible SOAP note with invented vitals and diagnoses, and signs it because the UI reports success. The clinician and patient suffer from an inaccurate medical record; an auditor sees a polished note and may not know it is synthetic fallback content.

**Suggested remediation:** In `safeAzureOpenAI`, remove demo fallback from production paths. Replace the catches in `generateSOAPNote` and `transcribeAudio` with a typed `AI_PROVIDER_UNAVAILABLE` error when `process.env.NODE_ENV === "production"` or `NEXT_PUBLIC_DEMO_MODE !== "true"`. Only call `getDemoSOAPNote` and `getDemoTranscript` in explicit non-production demo mode. Update `/api/ai/generate-note` and `/api/ai/transcribe-and-generate` to return 503 with a user-facing retry message and no generated clinical content.

**Test that would have caught this:** Integration test with Azure client mocked to throw in `NODE_ENV=production`, asserting the API returns 503 and does not return `sections`, `transcript`, diagnoses, vitals, or demo text.

### P0-2 - Correctness

**File and line reference:** `src/app/auditor/notes/page.tsx:54-64`, `src/app/auditor/notes/page.tsx:77-90`, `src/app/api/notes/route.ts:190-198`, `src/app/api/notes/[id]/review/route.ts:145-148`

**What is wrong:** The auditor notes workflow fetches reviewable notes by calling `/api/notes`, then filters for `pending_review`, `approved`, and `needs_revision`. The `/api/notes` GET handler explicitly allows only `USER`, `ADMIN`, and `SUPER_ADMIN`, excluding `AUDITOR`. The review route itself allows `AUDITOR`, but auditors cannot load the queue through the page that calls it.

**Attack or failure scenario:** During a clinical client demo, a signed note enters pending review and the auditor logs in to `/auditor/notes`. The page calls `/api/notes`, receives a 403 from `withAuth`, and displays "Failed to load notes." The clinician cannot demonstrate the review/request-revision loop.

**Suggested remediation:** Add a dedicated `GET /api/auditor/notes` route or extend `/api/notes` GET to include `AUDITOR` with read-only behavior and strict organization scoping. If using `/api/notes`, keep POST restricted to clinicians/admins while allowing GET for `["USER", "ADMIN", "AUDITOR", "SUPER_ADMIN"]`; add an integration test for an AUDITOR session loading pending review notes.

**Test that would have caught this:** E2E test logging in as AUDITOR, opening `/auditor/notes`, and asserting pending review notes load and a revision request writes `reviewer_feedback`.

### P0-3 - Security

**File and line reference:** `src/app/api/telehealth/create-room/route.ts:316-322`, `src/app/api/telehealth/accept-invite/route.ts:120-129`, `src/app/api/telehealth/accept-invite/route.ts:133-154`

**What is wrong:** Telehealth access tokens are reintroduced into client-visible surfaces. Provider `providerSessionToken`, `roomUrl`, and `meetingToken` are returned in the JSON body, and the patient accept-invite route base64url-encodes `roomUrl` and `meetingToken` into redirect query parameters `r` and `t`. The file comments state the token should not appear in URLs, but the code puts the meeting token into the URL.

**Attack or failure scenario:** A patient clicks an invite link, is redirected to `/telehealth/join?r=...&t=...`, and the browser history, screenshots, support logs, analytics, or referrer headers capture the join token. Anyone who obtains the URL can join the private telehealth session as the patient. The patient and clinician suffer an unauthorized session disclosure.

**Suggested remediation:** Never put `roomUrl`, `meetingToken`, `providerSessionToken`, or patient session refs in URLs or JSON bodies. Store only opaque server-side session refs in HTTP-only, secure, sameSite cookies, and have `/api/telehealth/join-session` resolve the Daily URL/token by POSTing the opaque ref. For cross-site cookie issues, use a one-time POST form or short-lived server-side nonce, not token-bearing query params.

**Test that would have caught this:** Pen-test probe asserting no Daily room URL, meeting token, or base64 token material appears in the response body, redirect Location, browser URL, or referrer after accepting a telehealth invite.

### P0-4 - Data Integrity

**File and line reference:** `src/app/api/notes/[id]/sign/route.ts:99-138`, `supabase/migrations/20260421000000_create_submissions_table.sql:17-45`, `supabase/MIGRATION_LEDGER.md:62-69`, `supabase/schema.sql:77-106`

**What is wrong:** The sign-and-review path depends on a `submissions` table and a `clinical_notes.status = 'pending_review'` lifecycle, but the migration ledger still marks `20260421000000_create_submissions_table.sql` as unknown and the canonical `schema.sql` still shows the old notes status check (`draft`, `completed`, `signed`, `amended`) with no `submissions` table. The audit prompt says production schema is authoritative because multiple migrations on disk are not applied, so this route is not proven deploy-safe.

**Attack or failure scenario:** A clinician clicks "Sign & Send for Review" in production where the submissions migration is absent or the status check is stale. The route updates or attempts to update `clinical_notes`, then the `submissions` insert or status write fails, returning 500 to the clinician and blocking the core workflow in front of a client.

**Suggested remediation:** Query `supabase_migrations.schema_migrations` and `information_schema` in production, then update `supabase/MIGRATION_LEDGER.md` with actual statuses. Promote `20260421000000_create_submissions_table.sql` and the review-status migration to confirmed applied only after verification. Add a startup or CI schema assertion for `clinical_notes.status` allowed values and `submissions(note_id -> clinical_notes.id)`.

**Test that would have caught this:** Integration test against a schema snapshot matching production that signs a completed note and asserts `clinical_notes.status = pending_review` and a `submissions` row are committed.

## P1 Findings

### P1-1 - Compliance

**File and line reference:** `src/lib/security/audit-log.ts:181-190`, `src/lib/security/audit-log.ts:296-305`, `src/app/api/notes/[id]/sign/route.ts:165-233`, `src/app/api/patients/route.ts:57-73`

**What is wrong:** Many mutation and PHI-read routes call `logAuditEventAsync`, but that function returns `void` and fire-and-forgets the database write. Several call sites use `await logAuditEventAsync(...)`, which gives the appearance of a blocking compliance write but does not wait. If the insert fails, the only behavior is a safe log line; the clinical mutation still succeeds and no alert is emitted.

**Attack or failure scenario:** Supabase audit logging fails because the service role key is missing, the audit schema drifted, or PostgREST is down. A clinician signs notes and views patients while audit rows are silently absent. A HIPAA auditor later requests access history and the organization cannot reconstruct it.

**Suggested remediation:** Split audit helpers into `logAuditEventRequired` for PHI reads/mutations and `logAuditEventBestEffort` for low-risk diagnostics. Use the required helper in patient, note, submission, role, auth, and billing mutations; fail closed or enqueue to a durable retry table when the audit write fails. Alert on `AUDIT_LOG_DB_WRITE_FAILED`.

**Test that would have caught this:** Integration test mocking `audit_logs.insert` to fail during note signing, asserting the route either fails with 503 or writes a durable retry record and triggers an alert.

### P1-2 - Compliance

**File and line reference:** `src/app/api/patients/route.ts:66-70`, `src/lib/data/patients.ts:235-240`

**What is wrong:** Patient search terms are written into audit log `details` as raw `search` or `query` values. Patient search terms commonly include patient names, phone numbers, MRNs, and email addresses. The audit prompt specifically prohibits PHI values in audit log `details` JSONB.

**Attack or failure scenario:** A receptionist searches for "Maria Gonzalez" or a phone number. That identifier is stored in `audit_logs.details`. An admin exporting audit logs or an external system consuming audit logs receives PHI that should not be there.

**Suggested remediation:** Replace raw search strings with non-identifying metadata: `has_search: true`, `search_length`, and optionally a keyed HMAC digest for correlation. Update both the API route and data-layer helper so no audit details contain user-entered search text.

**Test that would have caught this:** Unit test for patient search audit construction asserting names, MRNs, phone numbers, and emails are absent from `details`.

### P1-3 - Compliance

**File and line reference:** `src/app/api/auth/login/route.ts:24-121`, `src/app/api/auth/record-attempt/route.ts:94-110`

**What is wrong:** The login route authenticates and returns a session without writing a server-side audit event. Login auditing is delegated to a separate `/api/auth/record-attempt` endpoint, which the client calls independently. A direct API caller, broken client path, blocked request, or malicious script can authenticate without creating the expected `LOGIN_SUCCESS` or `LOGIN_FAILURE` audit row.

**Attack or failure scenario:** An attacker scripts `/api/auth/login` directly and never calls `/api/auth/record-attempt`. Successful and failed attempts are missing from the audit trail and from the elevated-auth-failure alerting path. Admins and auditors cannot prove who accessed the app.

**Suggested remediation:** Move login success/failure recording into `/api/auth/login` itself, immediately after `signInWithPassword` returns. Keep `/api/auth/record-attempt` only as a legacy no-op or remove it. Use service role writes for `login_attempts` and `logAuditEvent` in the same route.

**Test that would have caught this:** Integration test POSTing directly to `/api/auth/login` and asserting a corresponding `LOGIN_SUCCESS` or `LOGIN_FAILURE` audit row is written without any secondary client call.

### P1-4 - Compliance

**File and line reference:** `src/app/api/ai/generate-note/route.ts:117-159`, `src/app/api/ai/transcribe-and-generate/route.ts:97-126`, `src/services/safeAzureOpenAI.ts:585-636`, `src/services/safeAzureOpenAI.ts:1000-1006`, `src/lib/email/resend.ts:37-55`, `sentry.server.config.ts:8-14`, `src/lib/security/rate-limit.ts:245-271`, `src/app/api/telehealth/create-room/route.ts:163-180`

**What is wrong:** External services receiving or potentially receiving PHI are not accompanied by any in-repo BAA evidence or runtime allowlist. Azure OpenAI receives clinical observations, patient context, vitals, and audio. Resend receives patient-adjacent account/invitation/reset emails. Sentry may receive exceptions and request metadata. Upstash receives request keys/IP-derived identifiers. Daily receives room and participant metadata. The audit prompt asked to list BAA status per handoff; no authoritative BAA artifact was present in the audited files.

**Attack or failure scenario:** Real PHI onboarding begins and clinical text, audio, patient identifiers, or visit metadata leaves ChartSparkOG boundaries through a service whose BAA status is unclear. The compliance owner cannot prove HIPAA coverage for those disclosures.

**Suggested remediation:** Add `docs/compliance/baa-inventory.md` with each external processor, PHI categories sent, BAA status, owner, renewal date, and production env gate. Add a production startup check that blocks AI, email, Sentry, Upstash, and telehealth integrations unless the configured service appears in an approved processor allowlist.

**Test that would have caught this:** Compliance unit test loading the processor allowlist and asserting every configured PHI-capable integration has `baa_status = executed` before production startup succeeds.

### P1-5 - Reliability

**File and line reference:** `src/lib/security/rate-limit.ts:18-37`, `src/lib/security/rate-limit.ts:328-332`, `src/lib/security/rate-limit.ts:392-408`, `src/lib/security/rate-limit.ts:436-450`

**What is wrong:** Rate limiting fails open for broad API, AI, telehealth, registration, forgot-password, MFA verify, and role-change buckets. On Upstash misconfiguration or outage, many protected paths either fall back to per-instance memory or return `{ success: true }`. In Vercel serverless, in-memory counters are per-instance and reset frequently, so this is not an effective production limiter.

**Attack or failure scenario:** Upstash token misconfiguration recurs after deploy. An attacker floods `/api/ai/*`, `/api/telehealth/*`, or `/api/auth/forgot-password` from many IPs. Legitimate clinicians see degraded performance, email volume spikes, and AI costs climb while the limiter reports success.

**Suggested remediation:** Fail closed for PHI-bearing and cost-bearing endpoints (`ai`, `telehealth`, `forgotPassword`, `mfaVerify`, `roleChange`) when Redis is configured but unavailable. If registration must fail open, isolate it. Add a health check that refuses production startup or deploy promotion when Upstash credentials are absent or invalid.

**Test that would have caught this:** Integration test with Upstash client mocked to throw, asserting AI, telehealth, forgot-password, and MFA verification routes return 503 or 429 instead of success.

### P1-6 - Reliability

**File and line reference:** `src/app/api/agent/complete-session/route.ts:55-60`, `src/app/api/agent/complete-session/route.ts:96-122`, `src/lib/env.ts:77-79`

**What is wrong:** The only sidecar readiness gate for the agent completion route is a static `SIDECAR_READY === 'true'` environment variable. Once true, the route does not perform a live sidecar health check and does not call an agent sidecar at all; it builds a local draft from transcript and clinician input and returns success.

**Attack or failure scenario:** The agent sidecar is down or stale, but `SIDECAR_READY` remains true from a previous deployment. A clinician completes a session expecting the AI sidecar workflow and receives a locally concatenated draft. The failure is silent and looks like a successful clinical operation.

**Suggested remediation:** Replace static `SIDECAR_READY` with a health-checking dependency client that probes the sidecar with a short timeout and cached negative state. If the route is intended to use the sidecar, call it through that client; if it is a local fallback, mark the response as fallback and block production fallback unless explicitly enabled.

**Test that would have caught this:** Integration test with `SIDECAR_READY=true` and the sidecar health probe failing, asserting `/api/agent/complete-session` returns 503 and no draft.

### P1-7 - Data Integrity

**File and line reference:** `src/lib/data/patients.ts:291-309`, `src/lib/data/patients.ts:319-390`, `src/lib/data/patients.ts:393-404`

**What is wrong:** Patient creation inserts the core patient row, then inserts allergies, medications, problems, and insurance in separate non-transactional operations. Related-data failures are explicitly logged and ignored, including missing-table errors. The route returns success with a partial patient chart.

**Attack or failure scenario:** A clinician creates a patient with allergies and active medications. A related table insert fails due to migration drift or RLS, but the patient row is still returned as created. Later AI prompts and prescribing checks run without allergy or medication context, exposing the patient to unsafe recommendations.

**Suggested remediation:** Move patient creation into a single Postgres RPC transaction that inserts the patient and related records atomically, or fail the API request and delete the patient row if any related insert fails. Treat missing related tables as production schema failures, not expected runtime conditions.

**Test that would have caught this:** Integration test forcing `patient_medications.insert` to fail, asserting no patient row remains and the API returns a non-2xx error.

### P1-8 - Observability

**File and line reference:** `src/middleware.ts:14-22`, `src/lib/logging/safe-logger.ts:160-181`, `src/lib/security/audit-log.ts:252-268`, representative call sites `src/app/api/notes/[id]/sign/route.ts:113-117` and `src/app/api/patients/route.ts:85-88`

**What is wrong:** Middleware generates or forwards `x-request-id`, but most route logs and audit events do not propagate it. `safeLog` accepts `requestId`, and `logAuditEvent` can store it, but `withAuth` does not attach the request ID to `AuthContext`, and representative route log calls omit it.

**Attack or failure scenario:** The sign route or patient search fails intermittently in production. Vercel logs, audit logs, and client-reported request IDs cannot be correlated, so support cannot reconstruct what happened without manual guessing.

**Suggested remediation:** Add `requestId` to `AuthContext` in `withAuth`, populate it from `context.request.headers.get("x-request-id")`, and require all `logError`, `logWarn`, and `logAuditEvent` calls in API routes to include it. Add a lint rule or test to fail route handlers that omit request ID on server logs.

**Test that would have caught this:** Integration test sending `x-request-id: test-123` through a failing API route and asserting both safe logger payload and audit row include `request_id = test-123`.

### P1-9 - Observability

**File and line reference:** `src/middleware.ts:11-14`, `src/lib/security/alerts.ts:1-7`, `src/lib/security/alerts.ts:67-103`, `src/lib/security/alerts.ts:131-157`

**What is wrong:** The code has a TODO for elevated 5xx alerts, and the alerting module only implements optional webhook delivery for security/auth failure patterns. There is no implemented alert for elevated 5xx rate and no guaranteed alert delivery for elevated auth-denied rate.

**Attack or failure scenario:** A production deploy breaks a happy-path API route. Clinicians receive 500s for hours, but no alert fires unless someone watches logs or users report it. This is the same failure class as the dead sign button described in the audit prompt.

**Suggested remediation:** Add response-observing instrumentation for API status codes, emit metrics by route/status, and configure alerts for 5xx rate and 401/403 spikes. Make alert configuration required in production, not optional via `SECURITY_WEBHOOK_URL`.

**Test that would have caught this:** Observability integration test simulating repeated 500 and 403 responses, asserting alert dispatch is invoked with route, status class, and request IDs.

## P2 Findings

### P2-1 - Correctness

**File and line reference:** `src/lib/types/database.ts:17`, `src/lib/types/database.ts:255`, `src/lib/types/database.ts:363`, `src/lib/validation/schemas.ts:189-205`, `src/app/api/notes/[id]/sign/route.ts:81-103`, `src/app/api/notes/[id]/review/route.ts:82-92`

**What is wrong:** Local TypeScript database types still define note status as only `draft`, `pending_review`, and `signed` in one place and `draft`, `completed`, `signed` in others, while validation and routes use `completed`, `approved`, and `needs_revision`. This stale type surface invites incorrect UI conditions and unsafe casts around the highest-risk note lifecycle.

**Attack or failure scenario:** A developer implements a new note list or billing guard using `NoteStatus` from `src/lib/types/database.ts`, misses `approved` or `needs_revision`, and ships a route that treats review-ready notes as invalid or editable.

**Suggested remediation:** Regenerate Supabase types from the verified production schema, remove hand-maintained duplicate status unions, and export a single `ClinicalNoteStatusSchema` Zod enum used by API validation and UI types.

**Test that would have caught this:** Type-level test asserting the exported note status union exactly matches the Zod schema and production CHECK constraint snapshot.

### P2-2 - Correctness

**File and line reference:** `src/app/api/appointments/[id]/route.ts:13-25`, `src/lib/validation/schemas.ts:168-180`, `supabase/schema.sql:60-67`, `src/app/api/telehealth/create-room/route.ts:62-69`

**What is wrong:** Appointment and encounter status definitions are inconsistent. Appointment update validation accepts `confirmed` and `no_show`, telehealth accepts `confirmed`, but the canonical schema snapshot only proves `scheduled`, `in_progress`, `completed`, and `cancelled` for encounter-like scheduling status. No migration in the audited output proves the appointment status constraint accepts every code path value.

**Attack or failure scenario:** A calendar UI update sets an appointment to `confirmed` or `no_show` against a production constraint that does not allow it. The clinician sees a generic "Failed to update appointment" instead of a deterministic workflow state.

**Suggested remediation:** Verify the live `appointments.status` CHECK constraint, add a timestamped migration if `confirmed`/`no_show` are intended, and centralize appointment statuses in one Zod enum imported by calendar, telehealth, billing, and API update routes.

**Test that would have caught this:** Schema-contract test comparing the appointment status Zod enum to `pg_constraint` output and exercising each allowed transition.

### P2-3 - Performance

**File and line reference:** `src/lib/data/patients.ts:203-233`, `src/app/api/patients/route.ts:43-54`

**What is wrong:** Patient search fetches every patient row in the organization with `.select('*')` and no `.range()` or `.limit()`, then filters and paginates in memory. The API accepts `page` and `limit`, but those are applied after the full PHI dataset is already loaded into the function.

**Attack or failure scenario:** A clinic grows to thousands of patients. Searching for a name loads full patient PHI for the entire organization into a Vercel function on every keystroke-driven search. Latency and memory usage climb, and more PHI is exposed to runtime logs/crash dumps than needed.

**Suggested remediation:** Replace in-memory filtering with database-side search using `ilike` across indexed normalized columns, return only list-view columns, and apply `.range(from, to)` in the Supabase query. Add indexes for `(organization_id, last_name)`, `(organization_id, first_name)`, and any MRN/search column actually used.

**Test that would have caught this:** Load test seeding 10,000 patients and asserting search performs a bounded query with a fixed row limit and no full-table PHI fetch.

### P2-4 - Performance

**File and line reference:** `src/app/api/notes/route.ts:55-65`, `src/app/api/notes/[id]/route.ts:26-35`, `src/lib/data/notes.ts:30-34`, `src/lib/data/notes.ts:64-68`

**What is wrong:** Notes list/detail paths use `select('*')` on `clinical_notes`, including large SOAP text and PHI columns. The list route pulls full note bodies even when it only needs identifiers, patient display name, status, timestamps, and billing-code summary for list views.

**Attack or failure scenario:** The notes page for a busy clinician loads dozens of large notes. The function transfers unnecessary PHI blobs, increasing latency and the chance that full note content appears in runtime traces or error tooling.

**Suggested remediation:** Define separate list and detail projections. For list views, select only `id, patient_id, status, created_at, updated_at, cpt_codes, icd10_codes, billing_amount, patient:patients(id, first_name, last_name)`. Keep full SOAP sections only in `/api/notes/[id]` after a detail-view PHI audit event.

**Test that would have caught this:** Unit/integration test asserting `/api/notes` response does not include `subjective`, `objective`, `assessment`, `plan`, `content`, or transcript fields.

### P2-5 - Observability

**File and line reference:** `src/app/(app)/notes/[id]/page.tsx:29`, `src/app/(app)/notes/[id]/page.tsx:128-188`

**What is wrong:** Sign-flow diagnostic `console.warn` instrumentation is still present in the client bundle. It logs note IDs, sign state, response status, response bodies, and thrown errors. The audit prompt explicitly said to flag this if still in place before client testing.

**Attack or failure scenario:** A client tester opens DevTools or sends a browser log export during a support case. Internal sign-flow diagnostics and note identifiers are exposed, creating noise and possible PHI-adjacent leakage.

**Suggested remediation:** Remove the `[SIGN-DIAG]` logs and replace them with production-safe observability that sends request ID, route, status, and non-PHI error codes to the chosen telemetry sink. Keep verbose diagnostics behind a non-production debug flag only.

**Test that would have caught this:** Build-time grep test failing production builds if `[SIGN-DIAG]` or other diagnostic markers remain in `src/app`.

### P2-6 - UX

**File and line reference:** `src/components/ui/ConfirmModal.tsx:6-25`, `src/components/ui/ConfirmModal.tsx:133-140`, `src/app/(app)/notes/[id]/page.tsx:767-785`

**What is wrong:** `ConfirmModal` types `onConfirm` as `() => void` and does not await returned promises. The sign modal uses `asyncConfirm` and `isLoading`, but submit-claim and delete-note modals call async handlers without `asyncConfirm`, so the modal closes immediately and does not protect against duplicate clicks or preserve context on error.

**Attack or failure scenario:** A clinician double-clicks "Submit Claim" or loses network mid-submit. The modal closes before the async operation finishes; errors are shown only as a transient toast, and the user can trigger duplicate or conflicting mutations from stale state.

**Suggested remediation:** Change `ConfirmModalProps.onConfirm` to `() => void | Promise<void>`, make the component await it, manage an internal pending state when `isLoading` is not provided, and require async mutations to opt into non-auto-close behavior. Update submit-claim and delete-note usages to pass `asyncConfirm` and loading flags.

**Test that would have caught this:** Component test clicking confirm twice on an async handler and asserting the handler runs once, the modal remains open while pending, and errors keep the modal open.

## Migration Classification

Confirmed applied from local evidence: `20260210_add_review_statuses.applied.sql`, `20260423000000_inline_expiration_drop_orphan.sql`, `20260427042735_add_pilot_trial_columns.applied.sql`.

Confirmed not applied from local evidence: none. I did not query production.

Unknown per `supabase/MIGRATION_LEDGER.md:23-72`: `20240114_security_hardening.sql`, `20260123120000_clearinghouse_integration.sql`, `20260123120001_subscription_system.sql`, `20260125120000_cpt_checklists_audit_sessions.sql`, `20260125120001_mfa_implementation.sql`, `20260125120002_pending_profile_changes.sql`, `20260125120003_user_invitations.sql`, `20260127120000_billing_idempotency.sql`, `20260127120001_fix_invitation_security.sql`, `20260127120002_login_attempts.sql`, `20260129_billing_core_infrastructure.sql`, `20260203120000_performance_indexes.sql`, `20260203120001_patient_extended_schema.sql`, `20260218_vitals_triage_tables.sql`, `20260318120000_sprint1_security_remediations.sql`, `20260318120001_sprint2_security_hardening.sql`, `20260318120002_sprint3_billing_unique_constraint.sql`, `20260319120000_billing_infrastructure.sql`, `20260319120001_create_claim_lines.sql`, `20260319120002_sprint4_security_remediations.sql`, `20260319130000_sprint5_audit_policy_alignment.sql`, `20260319131000_sprint5_session_timeout_and_profile_trigger.sql`, `20260319132000_sprint5_acknowledgements_rls.sql`, `20260320160000_sprint6_billing_claims_unique_encounter.sql`, `20260320170000_sprint6_processed_webhook_events.sql`, `20260320180000_sprint7_telehealth_session_tokens.sql`, `20260320190000_sprint7_encounter_tracking_rls.sql`, `20260320200000_sprint8_telehealth_token_single_use.sql`, `20260320200001_sprint8_webhook_events_service_role_policies.sql`, `20260322100000_sprint9_audit_logs_canonical_indexes.sql`, `20260322120000_sprint11_telehealth_tokens_service_role_policies.sql`, `20260327100000_pt2_patient_documents_delete_org_check.sql`, `20260327110000_pt3_mfa_functions_remove_uuid_params.sql`, `20260327120000_pt3_mfa_attempts_billing_claims_high_fixes.sql`, `20260327130000_pt3_phi_update_with_check_medium_fixes.sql`, `20260327140000_pt4_telehealth_token_cleanup_function.sql`, `20260327150000_pt5_billing_claims_null_encounter_unique.sql`, `20260327160000_pt6_storage_rls_org_scoped.sql`, `20260407_fix_audit_logs_schema.sql`, `20260410120000_telehealth_invite_tokens.sql`, `20260411120000_audit_logs_archive.sql`, `20260411120001_scalability_indexes.sql`, `20260417000000_accept_invitation_atomic.sql`, `20260419004357_add_encounters_duration_minutes.sql`, `20260421000000_create_submissions_table.sql`, `ehr_integration_tables.sql`, `patient_documents.sql`, `stage1_database_foundation.sql`.

## Observations

- Server-side `supabase.auth.getSession()` was not found in `src/`; the only occurrence is client-side MFA gate usage in `src/components/auth/MFAGate.tsx:25`.
- `VITE_SUPABASE_SERVICE_ROLE_KEY` was not found in `src/`, `.env.example`, or `.env.local`; however `.env.local` contains live-looking service/API secrets and should remain uncommitted and be rotated if ever shared.
- `ENABLE_DEV_AUTH` was not found in the audited files.
- `sentry.server.config.ts` has a PHI scrubber configured, but BAA status and production DSN governance are not represented in-repo.
