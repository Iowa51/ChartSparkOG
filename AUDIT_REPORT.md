# ChartSparkOG Production Readiness Audit

**Date:** 2026-04-16
**HEAD:** `3bdf62c fix: add missing encounter routes, agent complete-session route, wire real data to encounter pages`
**Branch:** `main`
**Auditor:** Claude (static analysis only — see "Unverifiable" section for items needing live checks)

---

## Scope of this audit

This audit is **static analysis against the local working tree on `main`**. The following items from the audit prompt require credentials/live access I do not have; they are listed under **Unverifiable — needs human check** and are NOT implicitly "Passing":

- Vercel deploy status, build logs, domain resolution, TLS cert, `chart-spark-og.vercel.app` vs `app.chartspark.io` parity
- Supabase dashboard config (Site URL, redirect URLs)
- Resend DNS records (SPF/DKIM/DMARC) and live email deliverability
- Azure sidecar health endpoints (`agent-orchestrator`, `chartspark-scribe`, `chartspark-fhir-mcp`) — **note: I could not find any sidecar URLs referenced in `src/` at all; see B-2**
- Upstash Redis connectivity and current circuit-breaker state
- Runtime smoke tests (live GET/POST with a real token)
- Real test-email delivery

Treat the **GO/NO-GO** at the bottom as conditional on the human verifying those items.

---

## 🔴 Blockers — prevent client testing today

### B-1. `/api/agent/complete-session` is a stub; the "End Session → Azure pipeline" does not exist
**File:** `src/app/api/agent/complete-session/route.ts:24-52`
**Symptom:** The handler calls `buildDraft(body)` which string-concatenates `transcript + clinicianInput + selectedPhrases` and returns the result. It does **not** call Whisper, GPT-4o, any orchestrator, or FHIR MCP. There is no note persisted.
**Repro:** POST `/api/agent/complete-session` with `{ patientId, transcript, clinicianInput }` → response is `{ success, result: { summary, noteDraft, sections } }` where `summary = first 80 words of concatenated input`. No external call is made.
**Impact:** If the client demo exercises End Session → expect auto-generated note, you will show a literal echo of the typed/dictated text, not an AI-generated SOAP note. Audit prompt §7 explicitly names this as the end-to-end demo path.

### B-2. No sidecar integration anywhere in the repo
**Evidence:** `grep -r "agent-orchestrator\|chartspark-scribe\|fhir-mcp\|orchestrator" src/` returns **zero matches**.
**Impact:** The pipeline the audit prompt describes (UI → `/api/agent/complete-session` → orchestrator → scribe → FHIR MCP → persist) is not wired in this codebase. Either the sidecars live in another repo and are not called from here, or they were never wired. For client testing, anything that depends on them will not work.

### B-3. `/api/encounters/[id]` is missing `DELETE`
**File:** `src/app/api/encounters/[id]/route.ts:174-176`
**Current exports:** `GET`, `PATCH`, `PUT = PATCH`. Audit prompt explicitly asks for `GET, PATCH, DELETE`.
**Impact:** A client that tries to delete an encounter via the documented REST contract gets `405 Method Not Allowed`. Low-probability demo action but the audit asked to confirm.

### B-4. Hardcoded "Sarah K." demo identity still visible in non-sidebar UI
**Files:**
- `src/app/(app)/settings/page.tsx:245` — an `<input defaultValue="Sarah K. (Nurse Practitioner)">` in user settings
- `src/app/(app)/notes/new/page.tsx:1702` — transcript view renders `{entry.speaker === "NP" ? "Sarah K. (NP)" : "John Doe (Patient)"}`
- `src/components/billing/ClaimsManagerTable.tsx:41-44`, `src/app/(app)/billing/era-inbox/page.tsx:60-63`, `src/lib/demo-data/billing.ts:26` — billing fixtures with "Dr. Sarah K." / "Sarah Kline"
- Admin/auditor pages reference "Dr. Sarah Smith" / "Dr. Sarah Wilson" (demo data)

**Impact:** The sidebar fix (commit `a6a5683`) only replaced the layout identity. The Settings screen still pre-fills a fake provider name into a real input, and the note-authoring speaker label is still hardcoded. A client signing in as their own account will still see "Sarah K." in at least two places during a typical demo. Audit prompt §3 asks this be clean "anywhere".

---

## 🟡 Non-blockers for testing, blockers before real PHI

### NB-1. Live Supabase service_role JWT is in git history
**Evidence:** `git log --all -p` shows the key `eyJhbGciOi…BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0` decodes to `ref=eepwbtdqtdnqxeznykbh, role=service_role, iat=2026-01-06, exp=2036-01-04`. That is the production Supabase project named in the audit prompt, and the key is currently valid for ~10 years.
**Impact:** `service_role` bypasses RLS. Anyone who clones the repo can read/write all PHI. **Must be rotated in Supabase before real PHI is loaded.** Not blocking synthetic-data client testing, but a hard HIPAA gate.
**Remediation:** Rotate `SUPABASE_SERVICE_ROLE_KEY` in the Supabase dashboard, update Vercel env, redeploy. History rewrite is optional (key will be dead after rotation) but `git filter-repo` is recommended for hygiene.

### NB-2. `/api/auth/login` is completely unrate-limited
**Files:**
- `src/lib/security/rate-limit.ts:60-68` adds `/api/auth/login` to `RATE_LIMIT_EXEMPT_PATHS` (so middleware skips it)
- `src/app/api/auth/login/route.ts` has no `checkRateLimit*` call of its own
- `src/middleware.ts:15-22` short-circuits all `/api/auth/*` paths out of middleware entirely

**How it still sort-of works:** `src/app/api/auth/check-lockout/route.ts` implements DB-backed brute-force lockout keyed on email. That works only if the **client voluntarily calls** `check-lockout` before hitting `/login`. An attacker scripting against `/login` directly gets unlimited attempts.
**Impact:** Brute-force against a known email is wide open. Not visible in a demo, but a real HIPAA blocker.

### NB-3. Multiple auth endpoints exempted from middleware rate limiting
**File:** `src/lib/security/rate-limit.ts:56-74`
Exempt paths: `/auth/callback`, `/api/auth/callback`, `/api/auth/complete-signup`, `/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/mfa*`, `/api/auth/verify-mfa`, `/api/auth/setup-mfa`, `/settings/security*`.
`forgot-password` and `verify-mfa` do call `checkRateLimitByKey` internally (good). `complete-signup`, `callback`, `reset-password`, `setup-mfa` do not.
**Impact:** Email-flood via forgot-password/register is partially mitigated; callback replay and complete-signup spam are not mitigated by any rate limiter.

### NB-4. PHI-adjacent raw `console.error`/`console.log` in notes/new page
**File:** `src/app/(app)/notes/new/page.tsx`
- L118: `console.error('Error fetching patient:', error)` — the `error` object can include the failing query + patient_id in its message
- L158: `console.error('Error fetching encounter:', error)` — same
- L562: `console.error('Error fetching medication triage:', error)`
- L600: `console.log("Generating note:", { hasPhrases, inputLength })` — metadata only, OK
- L660: `console.error('Error calling AI:', error)` — could contain request payload snippets in error body
- L949: `console.error('Error saving note:', error)` — could contain note content in Supabase error
- L1491: `console.error('Transcription error:', error)`

**Impact:** These ship to the browser devtools in production (they are not gated by `NODE_ENV==='development'`). Error objects from Supabase/Azure can carry request bodies. Low for synthetic-data testing, not acceptable for PHI.

### NB-5. `NoteUpdateSchema` silently strips create-only fields instead of rejecting them
**File:** `src/lib/validation/schemas.ts:204-215`
The schema is not `.strict()`; Zod's default is to strip unknown fields. So if the UI sends `{ patient_id, type, is_signed, is_locked, chief_complaint }` in a PATCH, those are silently dropped — no 400 error. Prompt §2 asked that they be "rejected".
**Impact:** Not user-visible (update still succeeds for the allowed fields), but a subtle UI/API contract mismatch. Fix: add `.strict()`.

### NB-6. No idle/session-timeout enforcement in middleware or server layer
**Evidence:** `grep -iE "idle|session.?timeout|last_activity" src/middleware.ts` → no matches. `session_timeout` appears only in `src/lib/config/environment.ts` and `src/app/(admin)/admin/settings/page.tsx` (config UI).
**Impact:** A walk-away session stays authenticated until the Supabase JWT expires (1h default, silently refreshed). HIPAA requires an enforced idle logout (typically 15min for clinical systems). Not visible in a quick demo; gating concern before real PHI.

### NB-7. `safeAzureOpenAI` demo-mode fallback is by design and will succeed silently
**File:** `src/services/safeAzureOpenAI.ts:106-110`
When `AZURE_OPENAI_ENDPOINT` / `_API_KEY` / `_DEPLOYMENT_NAME` are missing, `_ensureInitialized` logs `Running in DEMO mode - no Azure credentials configured` via `devLog` (development-only) and sets `isConfigured = false`. The generate-note path then returns a canned demo response and `isDemo: true` in the JSON.
**Impact:** In production, the demo-mode log **does not print** (because `devLog` is dev-only). If the client is running without Azure creds wired through Vercel, you will silently serve canned AI output and the only client-visible signal is `isDemo: true` in the response JSON, which is not surfaced in the UI. Verify Azure envs are present in Vercel before demoing AI features.

### NB-8. IDS safelist covers the core PHI routes
**File:** `src/middleware.ts:31-44`
`/api/patients`, `/api/notes`, `/api/appointments`, `/api/billing`, `/api/ai/` are safelisted from SQL-injection / XSS / path-traversal checks. This is intentional (false-positive-heavy) but means the IDS offers no protection on the exact routes that matter most. Defense-in-depth is weaker than the rest of the app.

---

## 🟢 Passing — confirmed by static inspection

- **RLS enabled** on patients, encounters, clinical_notes (via `missing_tables.sql`), notes, audit_logs, users, organizations, plus ~40 other tables (confirmed in `supabase/schema.sql` + `supabase/migrations/*`).
- **Service role key is server-only**: `process.env.SUPABASE_SERVICE_ROLE_KEY` appears only in `src/lib/supabase/service-role-client.ts`, `src/lib/managed-billing/status-polling-service.ts`, `src/lib/security/telehealth-session-tokens.ts`, `src/lib/config/environment.ts`, `src/instrumentation.ts`. No `NEXT_PUBLIC_` prefix. No usage in any `"use client"` file.
- **Critical route files exist and export expected verbs** (except B-3):
  - `/api/encounters` — GET, POST ✓ with `withAuth({ requireOrganization: true, requireMFA: true })`, Zod-validated, org-isolated, audit-logged
  - `/api/encounters/[id]` — GET, PATCH (see B-3 for missing DELETE)
  - `/api/agent/complete-session` — POST ✓ with auth + MFA (see B-1 for stub)
  - `/api/patients` — GET, POST ✓ with Zod `PatientCreateSchema`, MFA, audit events
  - `/api/notes/[id]` — GET, PATCH, DELETE ✓ with org isolation, lock-status enforcement, `UNAUTHORIZED_ACCESS` audit on cross-org
  - `/api/auth/callback` — delegates to `handleAuthCallback` in `src/lib/auth/confirmation-callback.ts`; PKCE `exchangeCodeForSession` + `verifyOtp` fallback ✓
  - `reset-password` page (`src/app/(auth)/reset-password/page.tsx`) — relies on callback to establish session; **implicit-flow hash-fragment recovery** handled in `src/app/auth/auth-code-error/AuthCodeErrorClient.tsx:28-66` (parses `#access_token&refresh_token`, calls `setSession`, redirects to `/reset-password`).
  - `/api/auth/verify-mfa` — POST ✓ with `checkRateLimitByKey(userId, 'mfaVerify')`, audit events for success + failure, stable app-level error codes, no upstream message leakage
- **`clinicianInput` used consistently** UI → API → AI service. `grep` finds zero occurrences of `clinicalInput` (the typo'd variant) except `hasClinicalInput` in an audit-log metadata field, which is just a key name.
- **`failOpen`/`failClosed` behavior** documented in `src/lib/security/rate-limit.ts:18-35`:
  - `failClosed: true` — `auth`, `login`, `loginEmail`, `passwordReset`, `emailSend` (safe: these need real rate limiting)
  - `failClosed: false` — `api`, `registration`, `authCallback`, `forgotPassword`, `ai`, `export`, `mfaVerify`, `telehealth` — acceptable for bootstrap/discovery routes where Redis-outage lockout would block legitimate users
- **Circuit breaker** implemented with 5-failure threshold, 30s reset, fail-closed for auth when open (`rate-limit.ts:303-316, 362-373`).
- **Sidebar/MobileNav no longer hardcode "Dr. Sarah K."** — `src/components/layout/use-current-user-profile.ts` loads real user from Supabase `users`/`profiles` tables (commit `a6a5683`).
- **Resend FROM address** hardcoded to `ChartSpark <noreply@chartspark.io>` at `src/lib/email/resend.ts:14` — matches audit expectation. (`.env.example` default is `chartspark.app`, but the code value wins.)
- **Auth callback clears previous session** before consuming new auth code (`src/lib/auth/confirmation-callback.ts:234-240`, commit `9bd3a74`).
- **CSRF origin validation** on pre-auth state-changing routes (`check-lockout`, `record-attempt`, `login`).
- **Audit logging wired** on: patient search, encounter view/create/update, note view/update/delete, MFA challenges, login success/failure, telehealth end-session, AI note generation.
- **No secrets in .env.local** (file is gitignored; never tracked — verified via `git log --all --follow -- .env.local` returns empty).

---

## Re-verification of today's fix commits (since 2026-04-15 00:00)

There are **17 commits on `main` since 2026-04-15 00:00**, not 13. Numbering is ambiguous; I verified each `fix:` commit is present in HEAD and the relevant files are in the state the commit message claims:

| # | SHA | Title | Present in HEAD | Notes |
|---|---|---|---|---|
| 1 | `3bdf62c` | encounter routes + agent complete-session | ✓ | See **B-1, B-3** — the agent route is a stub; DELETE missing |
| 2 | `e41934d` | patient creation validation, notes patch payload | ✓ | `PatientCreateSchema` wired; `NoteUpdateSchema` not `.strict()` — see **NB-5** |
| 3 | `f9b6665` | MFA routes failOpen | ✓ | `mfaVerify: { failClosed: false }` — appropriate |
| 4 | `64d92c8` | implicit flow hash fragment handling | ✓ | Handled in `AuthCodeErrorClient.tsx`, not in `reset-password` page itself — works but brittle (requires the server flow to fail first) |
| 5 | `cfc6939` | detailed logging on password reset callback | ✓ | Error details in `describeSupabaseAuthError` |
| 6 | `cb50cd5` | recovery-type-aware flow in callback | ✓ | `getFlowType` / `buildAuthErrorRedirect` |
| 7 | `3a8f146` | redirect to /reset-password with session preserved | ✓ | `resolvePostAuthPath` |
| 8 | `a6a5683` | real user profile in sidebar/mobile nav | ✓ | Sidebar clean; other pages still hardcoded — see **B-4** |
| 9 | `9bd3a74` | clear stale session before confirmation | ✓ | `signOut({ scope: 'local' })` before code exchange |
| 10 | `f3fa519` | auth flow overhaul | ✓ | |
| 11 | `816c0d1` | PKCE email confirmation flow | ✓ | |
| 12 | `ece762b` | auth callback routes failOpen | ✓ | `authCallback: { failClosed: false }` |
| 13 | `902be28` | /auth/callback route | ✓ | Delegates to shared `handleAuthCallback` |
| 14 | `8b2807a` | emailRedirectTo path fix | ✓ | |
| 15 | `0d88a22` | use NEXT_PUBLIC_APP_URL in redirect | ✓ | `resolveRedirectBase` |
| 16 | `b776bed` | registration with org name in callback | ✓ | `completeSignupAfterConfirmation` |
| 17 | `b6c68a5` | registration rate limit failOpen | ✓ | `registration: { failClosed: false }` |

**Audit prompt's "highest-risk regression" fixes (#1, #6, #7, #8, #9, #10):** Without knowing which of my 17 the prompt's numbering maps to, I cannot confirm a specific mapping. If the prompt is numbering oldest-first (bottom of the list above), #1 is `b6c68a5` (registration failOpen), #6-10 are `b776bed`, `0d88a22`, `8b2807a`, `902be28`, `ece762b` — all confirmed present in HEAD. **Please confirm the numbering convention.**

---

## Unverifiable — needs human check

1. Vercel: is `3bdf62c` deployed, build warnings, `chart-spark-og.vercel.app` vs `app.chartspark.io` parity
2. Supabase dashboard: Site URL = `https://app.chartspark.io`, redirect URLs include both domains
3. Resend DNS: SPF / DKIM / DMARC status for `chartspark.io`
4. Live email: confirmation + password-reset delivery, inbox vs spam, from-address/branding
5. Azure sidecars: health endpoints, whether they are even wired up at infrastructure level (no sidecar URLs in `src/` — see B-2)
6. Upstash Redis: reachable from deployed function, circuit-breaker state
7. Live smoke tests on all 8 route groups listed in §2 of the prompt
8. A rendered bundle scan for `service_role` leakage (I verified at source level only)

---

## Recommendation

**NO-GO for a real clinical demo today.** **CONDITIONAL GO** for a non-clinical UX walkthrough on synthetic data only, if you steer around End Session and Settings.

**What would flip NO-GO → GO for client testing:**
1. **Wire the Azure sidecars** (orchestrator / scribe / FHIR MCP) into `/api/agent/complete-session`, or scope the demo to **not** use End Session. Without this, B-1 is unrecoverable mid-demo.
2. **Replace the hardcoded "Sarah K." strings** in `settings/page.tsx:245` and `notes/new/page.tsx:1702` (B-4). 10-minute fix.

**Must-do before real PHI (separate gate, not today's testing gate):**
- Rotate `SUPABASE_SERVICE_ROLE_KEY` (NB-1)
- Enforce rate limiting on `/api/auth/login` (NB-2)
- Enforce idle-session logout (NB-6)
- Gate the remaining raw `console.*` calls in `notes/new/page.tsx` behind `NODE_ENV` (NB-4)
- Rotate the Supabase anon key as well (also in git history)

Awaiting your go-ahead on which blockers to remediate first.
