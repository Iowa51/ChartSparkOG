# ChartSparkOG Adversarial Production Readiness Audit

## Context for you, Codex

ChartSparkOG is an AI-assisted EHR built on Next.js 15 / Supabase / Vercel, with three AI sidecars (chartspark-scribe, chartspark-fhir-mcp, agent-orchestrator) and Upstash Redis for rate limiting. The app is heading into clinical client testing imminently, followed by PHI onboarding, followed by paid clinician scale-out. It has had 11 security audit sprints and 8 pen-test fix sprints historically, but today's Phase A debugging revealed that shipped code can be silently non-functional in production (the Sign & Send for Review button was dead end-to-end for unknown duration before anyone noticed). That is the kind of failure this audit must catch.

Approach this as a hostile actor would. You are not trying to help the code pass — you are trying to find the things that will embarrass, breach, or break the product under real use. Assume nothing works until proven. Assume every auth gate has a hole. Assume every error path is unreachable until you trace a test through it. Assume every audit log entry is missing until you verify it writes.

## Repository and environment facts

- Repo root: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG` (local), `Iowa51/ChartSparkOG` on GitHub
- Production branch: `main`, auto-deploys to Vercel project `chart-spark-og` at `app.chartspark.io`
- Database: Supabase project `eepwbtdqtdnqxeznykbh` — consider the running production schema authoritative over migration files (multiple migrations exist on disk that have not been applied to prod)
- Rate limit: Upstash Redis `chartspark-ratelimit`
- Email: Resend, sender `noreply@chartspark.io`
- AI: Azure GPT-4o (`https://chartspark-openai.openai.azure.com/`) + Whisper (`https://joman-mnq40342-eastus2.openai.azure.com/`)
- Sidecar repos at `C:\Users\joman\OneDrive\Desktop\chartspark-fhir-mcp`, `chartspark-scribe`, `chartspark-clinical-llm`, `chartspark-federation`
- Audit log table `audit_logs` with columns: id, user_id, organization_id, action, entity_type, entity_id, details (jsonb), ip_address, created_at

## Scope

Everything under `src/` in the main repo. Sidecars are out of scope for this audit unless a main-repo route calls one without proper error handling, in which case flag the calling site. Skip `node_modules`, `.next`, build output, and archive/report directories.

## Your deliverable

Write `PRODUCTION_READINESS_AUDIT.md` in the repo root. Every finding gets:

1. **Severity** — P0, P1, or P2 as defined below
2. **Category** — one of: Correctness, Security, Compliance, Reliability, Performance, Data Integrity, Observability, UX
3. **File and line reference** — exact path and line range, or range of files if the pattern spans many
4. **What is wrong** — one paragraph describing the defect, specific enough that a mid-level engineer could reproduce the failure without asking follow-up questions
5. **Attack or failure scenario** — the concrete sequence of events that turns this into a user-visible problem, including who suffers (clinician, auditor, admin, patient, attacker)
6. **Suggested remediation** — specific enough to be actionable, not "add validation" but "add Zod schema `X` at route `Y` enforcing constraints `Z`"
7. **Test that would have caught this** — one sentence naming the kind of test (unit / integration / e2e / load / pen-test probe) and what it would assert

Group the document by severity, not category. P0 findings first, then P1, then P2. Within each severity, order by category in the sequence above.

## Severity definitions — do not invent additional levels

**P0 — blocks clinical client testing.** The app cannot be demonstrated to a prospective client without risk of visible failure, data corruption, or security breach during the demo. Examples that qualify: a button that does nothing, a save flow that writes malformed data, an auth gate that allows cross-org access, a clinician seeing another clinician's patients, a PHI value rendered to an unauthorized role, a route that returns 500 on a happy path. Examples that do NOT qualify at P0: stylistic inconsistency, lint warnings, feature incompleteness that clients aren't expecting yet.

**P1 — blocks PHI onboarding and paying clients.** The issue would not be visible in a clean demo but becomes real the moment actual patient data or clinician workflows run at any volume. Examples: PHI in logs or error messages, audit-log write failure that doesn't alert, a rate limiter that silently throttles legitimate clinicians, missing RLS on a table holding patient data, a sign flow with no rollback on partial failure, any BAA-covered data leaving a BAA boundary, missing encryption at rest for a PHI column, a route that leaks memory under sustained load.

**P2 — blocks scale or long-term maintainability.** The issue is tolerable for the first 10 clinicians but will hurt as clinician count grows or as the team onboards engineers. Examples: unbounded queries without pagination, missing database indexes on high-read columns, dead code paths, stale migrations, unused Zod schemas, inconsistent error-handling patterns across routes, missing observability hooks, TypeScript `any` usage in critical paths.

Anything you would want to flag that does not fit P0/P1/P2 goes in a final **Observations** section with no severity — noted for consideration, not demanded as work.

## Specific attack surfaces to probe — this list is illustrative, not exhaustive

### Authentication and authorization

- Every API route under `src/app/api/` — confirm each has auth middleware OR a `withAuth`-style wrapper, AND that it validates the caller's `organizationId` matches the resource being accessed. Routes that look at resource ownership without checking org are a classic cross-org leak vector.
- `SUPER_ADMIN` bypass paths — every place role checks are written as `role !== 'SUPER_ADMIN'` inverted from `role === 'OWNER'` style gates. Find any route where a role check protects mutation but not read, or vice versa.
- The `accept-invitation` flow — confirm token use is one-time and time-bounded, that it cannot be replayed, that the invitation cannot be used to elevate role, and that the token's foreign-key target cannot be swapped mid-flow.
- MFA enforcement — if MFA is advertised (`/settings/security/mfa/page.tsx` exists), confirm routes actually check MFA status, not just that the user has it enabled.
- Session handling — search for `supabase.auth.getSession()` usages. Supabase documentation says to use `getUser()` for server-side auth because `getSession()` returns unverified cookie data. Today's Vercel logs showed warnings about this exact pattern. Every occurrence outside a pure client context is a P0 auth defect.

### PHI boundaries

- Every field on `patients`, `clinical_notes`, `encounters`, `vitals_triage`, `submissions` that contains identifiable patient information must not appear in: console.log, audit log `details` JSONB, error messages returned to non-privileged roles, Sentry breadcrumbs, Vercel function logs.
- `sanitizeError` coverage — today's fix at `src/lib/logging/safe-logger.ts` unmasks Supabase errors. Confirm every route that catches Supabase errors runs them through `sanitizeError` before logging. Any raw `console.error(error)` or `logError({ error })` without sanitization in a PHI-adjacent route is a P1 compliance break.
- The Azure OpenAI and Whisper endpoints — confirm no PHI is sent as part of a prompt unless there is a BAA confirmed for that Azure deployment. Flag any AI sidecar call that includes raw subjective/objective text in a prompt to a model whose BAA status is unclear.

### Data integrity

- Every status enum in the codebase vs the actual Postgres CHECK constraints. Today's Phase A bug was exactly this — code wrote `status='pending_review'` but the DB constraint only allowed 4 values. Find every other status column (submissions, encounters, invitations, vitals_triage, audit_flags) and verify code-side enums match DB-side constraints. Flag every mismatch.
- Every table that is written to from multiple routes — confirm there is a single source of truth for the write shape (Zod schema). Today we had `is_signed: true` being written from 3 different files to a column that didn't exist.
- Foreign key integrity on critical joins: `submissions.note_id → clinical_notes.id`, `audit_logs.user_id → auth.users.id`, `clinical_notes.provider_id → auth.users.id`. Verify the FKs exist AND have `ON DELETE` behavior that matches business logic. A `CASCADE` on a clinical note FK would silently destroy audit trail.
- Migration drift. List every file under `supabase/migrations/` and classify each as (a) confirmed applied to prod, (b) confirmed not applied, (c) unknown. Any (c) is a P1 until resolved.

### Reliability under failure

- Every `await fetch(...)` in server code — confirm timeout is set. Unbounded awaits on external APIs (Azure, Resend, sidecars) will pile up on the Node event loop under a sidecar outage.
- Every multi-step DB mutation — confirm rollback on partial failure. Today's sign route got this right (rolls back the clinical_notes UPDATE if the submissions INSERT fails), but it was an outlier. Find routes that UPDATE then INSERT then audit-log without a rollback path.
- The circuit breaker module — confirm it actually short-circuits under the conditions advertised (thresholds, half-open behavior, recovery). A circuit breaker that never trips is the same as no circuit breaker.
- Rate limit edge cases — confirm Upstash Redis tokens that fail to initialize do not silently allow all requests through (fail-closed vs fail-open). Today's handoff mentioned a Redis token misconfig that broke login post-deploy; verify there is a test that would catch that regression.
- The SIDECAR_READY gate — confirm every route that needs a sidecar checks the gate AND that the gate itself isn't stale (a stuck `true` from an earlier health check would allow clinical operations against a down sidecar).

### Client-side correctness

- Every onClick in a `ConfirmModal` usage — confirm the handler either returns a Promise and the modal handles async, or the modal closes synchronously after a sync handler. Today's bug was a handler that didn't fire despite the click registering; the instrumentation commit (`0767dad`) should still be in place unless reverted — flag it either way (if still in, note that diagnostic logging must be removed before client testing; if removed, note what replaced it).
- Every form with a submit button — confirm double-click protection. The sign route has it; not all routes do.
- Every toast/error message — confirm it is surfaced to the user, not just logged. A 500 that logs silently and returns a generic "error occurred" to the UI is worse than a 500 that tells the user "try again in 30 seconds."
- The auditor workflow (`/auditor/*` routes) — confirm that the Request Revision flow actually writes `reviewer_feedback` correctly after today's migration applied the column. The code path was dead before today; confirm it is live now.
- Cross-tab consistency — if a clinician has a note open in two tabs and signs it in one, what happens in the other? Look for cases where stale client state can produce a second conflicting mutation.

### Performance and scale

- Every Supabase query — find ones missing `.limit()`. An unbounded SELECT on `audit_logs` or `clinical_notes` will eventually OOM the Vercel function.
- Every `.select('*')` on a table with JSONB or large TEXT columns — confirm necessity. Pulling entire PHI blobs for a list view is a bandwidth and logging hazard.
- N+1 patterns — any route that loads a list then loops fetching details per item. Classic for audit log views, submission queues.
- Missing DB indexes — for every WHERE clause that filters on a non-PK column at scale, confirm an index exists on that column. Common misses: `audit_logs(user_id, created_at)`, `clinical_notes(provider_id, status)`, `submissions(organization_id, status)`.
- Every cron job, scheduled report, or background task — confirm it has a timeout and will not hang the worker indefinitely.

### Compliance and HIPAA

- Business Associate Agreements (BAAs) — list every external service receiving anything that could be PHI (Anthropic, Azure OpenAI, Resend, Sentry, Upstash, HuggingFace, Vercel). For each, note whether a BAA is in place per the handoff. Flag any that are unclear.
- Audit log completeness — every mutation route must emit exactly one audit event per semantic action. Find routes that mutate without logging, and routes that log twice for one action (both are bad).
- Data retention — confirm there is a documented retention policy for `audit_logs` (HIPAA requires 6 years minimum) and that no cron is purging prematurely.
- `ENABLE_DEV_AUTH` — confirm this is `false` in production. Search for its references. Any place it is read without a corresponding `process.env.NODE_ENV === 'production'` guard is a P0.
- `VITE_SUPABASE_SERVICE_ROLE_KEY` — confirm this is NOT present in any `.env` file committed or referenced in frontend env. The service role key must never be exposed client-side. This was called out in the handoff; verify it was actually removed.

### Observability gaps — use today's Phase A failure as the template

- Every route under `/api/` — confirm it logs at entry, at DB-interaction points, and at exit (success or error). The sign route today was crashing silently for an unknown duration. That gap cannot recur.
- Every client-side mutation handler — confirm there is an error path that surfaces to the user AND logs to an observability sink. The ConfirmModal auto-close masked errors for weeks.
- Request ID propagation — confirm there is an `x-request-id` header generated at the edge and threaded through every log line. If there is not, list it as P1 Observability.
- Alerting — confirm at least one alert exists for "elevated 5xx rate" and "elevated auth-denied rate." If none, P1.

## Rules for this audit

- **Do not modify any code.** Read-only.
- **Do not run tests against production.** Static analysis, code reading, and local-scoped tooling only (grep, AST tools, Zod schema comparison with live schema snapshots).
- **Do not trust code comments as truth.** A comment saying "validates auth" does not mean the code validates auth. Verify by reading the actual logic.
- **Do not trust prior audit reports.** Existing `AUDIT_REPORT.md` and pen-test reports may have been valid at the time and are not now. Re-verify claims.
- **Do not truncate or summarize.** If there are 40 findings at P1, list all 40. A partial audit is worse than no audit because it creates false confidence.
- **Do not gate findings on "likelihood."** An RLS hole that requires an attacker to know the exact org UUID format is still P0. The bar is "can this fail"; the probability is the product team's problem.
- **When in doubt, flag it.** False positives are cheap to dismiss. False negatives are what ship.

## If you run out of time or context

If the scope exceeds what you can complete in a single pass, stop at a clean boundary (e.g. finish all P0 findings before starting P1, finish a full category before starting the next) and write a short `AUDIT_INCOMPLETE.md` noting exactly which files, routes, or categories you did not reach. Do not silently truncate. A complete audit of 60% of the surface is more useful than a claimed-complete audit that skipped the hard parts.

## Final verdict

At the top of the document, before the findings, write a one-paragraph verdict answering: "If ChartSparkOG were to onboard its first paying clinician tomorrow, what is the single most likely way it would fail?" Be specific. Do not hedge.