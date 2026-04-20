# 🚩 ChartSparkOG Observability & Pre-Clinical Readiness Roadmap

**Status:** ACTIVE — Must be implemented before real PHI touches the system
**Created:** 2026-04-16
**Last updated:** 2026-04-17
**Owner:** James (RedArk Ventures)
**Priority:** HIGH — blocks clinical launch

---

## 🔴 TOP-PRIORITY BLOCKERS (must build before clinical launch)

### 🔴 BLOCKER: Admin UI for user role changes
**Priority:** Critical — blocks ALL post-onboarding user management
**Surfaced:** 2026-04-17 during accept-invitation design
**Target:** Build day after accept-invitation flow is stable

**Problem:**
There is currently NO in-app flow for an admin to change a user's role after their account is created. Every role correction today requires direct Supabase dashboard access, temporarily bypassing the `trg_prevent_users_role_escalation` trigger, and manual audit log entry. This is a developer-level workflow, not a user-facing workflow. It does not scale and is HIPAA-problematic because role changes are not automatically audit-logged.

**Required features:**
- Users list in admin dashboard
- "Change Role" action on each user row, visible only to Super Admin and RedArk Business Admin
- Backend endpoint `/api/admin/users/[id]/role` with:
  - Super Admin / RedArk Business Admin authorization check
  - Validation that the target role is legal (no escalating beyond admin's own permissions)
  - SECURITY DEFINER function OR controlled trigger bypass to execute the UPDATE
  - Atomic update: role change + audit log entry in a single transaction
  - Rate limiting — failClosed, max 20 role changes per admin per hour
- Audit log entry: who changed, from what role to what role, who was changed, timestamp, required reason
- UI shows modal with current role, target role dropdown (filtered by admin's permission), required reason field, confirmation step
- Error paths: unauthorized 403, invalid role 400, rate limit 429

**Cannot onboard real clinicians without this** because any role correction today requires manual database intervention.

**Until this is built:**
Accept-invitation flow rejects existing users who already have a role in the same organization with message: *"Your account at this organization already has a role. To request a role change, contact your organization administrator at [admin_email]."*

---

### 🔴 BLOCKER: Rotate Supabase service_role key
**Priority:** Critical — credential exposure
**Surfaced:** 2026-04-16 audit
**Status:** DEFERRED from 2026-04-16 (code stability took priority during fix sprint)

The `service_role` JWT for project `eepwbtdqtdnqxeznykbh` has been found in git history, decodes as a valid service_role token expiring January 6, 2036. Even with a private repo, rotation is required for HIPAA posture.

**Steps:**
1. Supabase dashboard → project → Settings → API → Reset service_role key
2. Copy new key to password manager
3. Update Vercel env vars (Production, Preview, Development) → redeploy
4. Update Azure Container Apps: `agent-orchestrator`, `chartspark-scribe`, `chartspark-fhir-mcp` → new revisions
5. Update local `.env.local` files in ChartSparkOG + each sidecar repo
6. Update GitHub Actions secrets if any
7. Smoke test live app end-to-end


### 🔴 BLOCKER: AI note generation hallucinates clinical facts
**Priority:** Critical — patient safety
**Surfaced:** 2026-04-18 during Test Clinician smoke test
**Risk:** Medical malpractice / patient harm / HIPAA compliance

**Problem:**
When given minimal clinical input (single paragraph of observations), the 
AI note generator via Azure OpenAI invents clinical facts that were never 
stated in the input. Observed hallucinations include:

- Fabricated medication names ("sertraline 50mg daily") when the patient 
  is actually on Metformin and Tylenol (per the visible patient data)
- Invented treatment durations ("three weeks ago")
- Made-up vital signs and sleep metrics ("six hours per night vs four 
  hours previously")
- Auto-suggested ICD-10 codes based on hallucinated content (F32.0, F32.1, 
  F32.9 MDD variants, R45.851 Suicidal ideation, F60.3 Borderline 
  Personality Disorder) for a test patient with no relevant diagnosis

**Why this is a blocker:**
A clinician who signs off on AI-generated content containing fabricated 
medication names commits medical malpractice. A patient whose chart 
contains invented suicidal ideation codes could face:
- Denied insurance coverage
- Involuntary commitment risk
- Loss of professional licenses (pilots, teachers, healthcare workers)
- Irreversible psychiatric diagnosis record

This class of hallucination makes the AI scribe feature clinically 
unsafe in its current form.

**Required fix:**
1. Audit the Azure OpenAI system prompt in the note generation pipeline. 
   Locate the prompt that constructs the note from clinical input.
2. Add strict grounding instructions:
   - "Only include clinical facts explicitly stated in the input"
   - "Do not infer medication names, dosages, or frequencies"
   - "Do not invent vital signs, sleep metrics, or treatment durations"
   - "If information is not stated, write '[Not documented]' rather than 
     filling in plausible content"
3. Remove or strictly gate the ICD-10 auto-suggestion feature. Codes must 
   be provider-selected from actual clinical documentation, not 
   AI-inferred.
4. Add a prominent UI disclaimer on AI-generated content: "Review and 
   verify all AI-generated content before signing. AI can make errors."
5. Consider adding a verification step: before saving, require the 
   clinician to confirm that each section reflects the patient accurately.

**Testing after fix:**
- Give the AI minimal input (same as 2026-04-18 test: "depression 
  follow-up. Improved mood. Sleeping 7-8 hrs. No SI/HI. Continue 
  treatment.") and verify:
  - No medication names are invented
  - No specific durations are invented
  - No specific sleep hour comparisons
  - No ICD-10 codes auto-suggested (or codes are only suggested from 
    explicit DSM-5 criteria named in input)

**Dependencies:**
- Clinical input from a licensed clinician on what "safe hallucination 
  boundaries" look like for psychiatry
- May require legal review of AI-generated clinical content output

**Connects to:**
- Chartspark-scribe sidecar integration (when moving from direct Azure 
  OpenAI to dedicated scribe service, system prompt migrates with it)
---

### ICD-10 Coding Integrity Validator (canonical-term check)

**Priority:** HIGH — clinical documentation integrity feature
**Effort:** 4-8 hours
**Surfaced:** 2026-04-18 during ICD-10 fix discussion

**Problem:**
Clinicians can attach ICD-10 codes to notes without supporting documentation. This creates compliance risk (insurance denial, audit findings, fraud allegations) and clinical documentation gaps.

**Feature:**
Deterministic validator that checks each attached ICD-10 code against a library of canonical terms. Flags codes that lack supporting language in the note text.

**Scope for v1:**
1. Extend code-library.ts with canonicalTerms array per code
2. Populate top 200-500 codes (psychiatric + primary care for PMHNP users)
3. Build validator module at src/lib/billing/code-validator.ts (deterministic, no AI)
4. Validate on note save AND on finish/submit
5. UI badges per code: 🟢 supported / 🟡 partial / 🔴 unsupported
6. Override flow with audit log for clinician justification

**Explicitly NOT doing in v1:**
- Specificity audit (unspecified vs specific codes)
- ICD-10-CM guideline compliance checking
- AI-powered semantic matching (re-introduces hallucination risk)

**Dependencies:**
- Proposal D (grounded code suggestion) shipped first — validator runs on whatever codes end up attached
- Persistence bug fix shipped first — codes actually reach the note
- Clinical SME input on canonical terms for psych codes

**Selling point connection:**
When shipped, this + Proposal D together deliver a real clinical coding integrity story:
1. Codes auto-populate from real sources (patient problems + clinician dictation)
2. Each code is validated against note content before submission
3. Clinician sees clear per-code status before insurance submission
4. Override path with audit trail for edge cases

Most small-practice EHRs don't have this.

### 🔴 BLOCKER: Missing sidecar integration (agent pipeline)
**Priority:** Critical — core feature gap
**Surfaced:** 2026-04-16 audit

`/api/agent/complete-session` is currently gated behind `SIDECAR_READY=false` (returns 503). The full pipeline must be wired: UI → `/api/agent/complete-session` → orchestrator → scribe (Whisper + GPT-4o) → FHIR MCP → note persisted. `clinicianInput` field name must be consistent across UI → API → sidecar (regression risk).


### ICD-10 code hardening follow-ups (from 2026-04-18 Proposal D Codex verification)

**Priority:** MEDIUM — speculative edge cases, not known bugs
**Source:** Codex verification of commits 82f675e, c8fb1c1, d1dca7f
**Status:** Captured for future hardening — no confirmed runtime failures

These items were identified during post-fix review as edge cases worth hardening before real clinical data flows through the system. None are confirmed bugs — they are speculative risks based on reading the code.

- [ ] **Whitespace normalization on ICD-10 codes** — The null-check guard uses `.trim().length > 0` but the actual code value is not trimmed when extracted. Leading/trailing whitespace in `patient_problems.icd10_code` or `code-library.ts` entries would leak into dedup comparisons, causing "E11.9" and " E11.9 " to be treated as different codes. Audit all ingestion/comparison paths and add `.trim()` normalization.

- [ ] **Case normalization on ICD-10 codes** — ICD-10 codes should be stored uppercase by convention. Add a normalization step on ingestion and on comparison so "E11.9" and "e11.9" are treated as the same code. Without this, dedup can miss duplicates that differ only in case.

- [ ] **Edit path source-tag restoration** — when a saved note is edited on /notes/[id] and code objects need to be reconstructed from `string[]` storage, what source does the normalizer assign? Verify `normalizeSuggestedCodes` behavior on this path. If all restored codes are tagged `'manual'` when some are actually from patient problems, the source badge UI will mislead the clinician.

- [ ] **Patient context fetch failure path** — verify `/api/ai/generate-note` gracefully handles `getPatientContextForAI` returning null. Should NOT crash, should fall back to clinician_input codes only. Confirm via a synthetic test where the patient ID is valid but the helper errors.

- [ ] **Static code-library sanitization** — verify `src/lib/billing/code-library.ts` has no malformed code entries (whitespace, lowercase, wrong format). Malformed library entries would flow through `quickSuggestCodes` / `analyzeNoteForCodes` to output unchecked.

**Dependencies:**
- ICD-10 Coding Integrity Validator (already on roadmap) — some of these hardening steps become moot if the validator is built, since it would catch malformed/mismatched codes as part of its validation pass.

**Estimated effort:**
30-60 minutes of defensive coding across 2-3 files if done together. Not urgent. Revisit after Validator scope is defined.
---

## 🟠 HIGH-PRIORITY ITEMS

### Layer 0 — sanitizeError fix (COMPLETED 2026-04-16)
- Commit `a75a993`: unmask Supabase errors in sanitizeError
- Validated in production 2026-04-16 — fix surfaced Postgres error 0A000 within seconds that would have taken hours to diagnose otherwise
- Follow-up: audit every call site of `sanitizeError` for other silent-swallowing patterns

### Layer 1 — Static code scanner (silent-failure-auditor agent)
**Effort:** ~2 hours to build
**Priority:** HIGH

CC agent that greps for anti-patterns: silent catch blocks, `.catch(() => null)`, functions returning null/undefined on failure without logging, `failOpen` without alerts, unvalidated `process.env` reads, silent `if (!x) return;` guards, Supabase `.single()` without error handling, `fetch()` without status checking.

Install at `C:\Users\joman\.claude\agents\silent-failure-auditor.md`. Add to `CS-Review-Runner.ps1` rotation.

### Layer 2 — Sentry runtime error tracking
**Effort:** ~30 minutes
**Priority:** HIGHEST ROI

`@sentry/nextjs` installed but not configured. Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Vercel (all three environments). Configure `beforeSend` hook to scrub PHI (patient names, DOB, SSN, MRN, note content, transcript content, encounter details beyond ID/timestamp, any user free-text). **Disable session replay** — too much PHI leakage risk.

### Layer 3 — Environment variable validation at boot
**Effort:** ~1 hour
**Priority:** HIGH

Use `zod` to parse and validate all `process.env` at startup. App refuses to start if anything is missing or malformed. Single source of truth at `src/lib/env.ts`. Every `process.env.FOO` replaced with `env.FOO`.


---

## 🟡 MEDIUM-PRIORITY ITEMS

### Layer 4 — Synthetic monitoring
**Tools:** Checkly (recommended), Better Uptime, UptimeRobot, or Playwright + GitHub Actions cron

Monitor every 5-10 minutes: homepage, login, admin dashboard, create invitation, API health, accept-invitation (once built).

### Layer 5 — Continuous agent audits via GitHub Actions
**Effort:** ~half a day

Weekly rotation: Week 1 silent failure, Week 2 HIPAA compliance, Week 3 dependency/supply chain, Week 4 env vars and secrets.

### Layer 6 — Database-level observability
Weekly review of Supabase slow/failed queries, Postgres notices piped to logs, monthly audit log integrity check.

---

## 🟢 Additional hardening items (pre-clinical)

### Code quality / architecture
- [ ] Audit all `catch` blocks codebase-wide for silent swallowing (Layer 1 agent)
- [ ] Normalize external integration errors (Supabase, Azure, Resend, Upstash) through typed wrappers at boundaries
- [ ] Replace `supabase.auth.getSession()` with `getUser()` server-side (SSR warning in prod logs)
- [ ] Fix cosmetic `hasClinicalInput` typo in `src/app/api/ai/generate-note/route.ts`
- [ ] Apply `.strict()` to Zod schemas
- [ ] Scrub `console.error` near PHI paths
- [ ] Silent Azure demo-mode fallback must emit loud warning log

### Database cleanup
- [ ] **Drop orphaned `expire_old_invitations()` trigger function** — no longer called after 2026-04-17 fix (inlined into `check_expired_invitations`). Kept temporarily for reference.
- [ ] **Replace on-insert expiration check with scheduled cron job** — running expiration cleanup on every INSERT is architecturally wrong. Move to daily Supabase edge function.
- [ ] **Create migration file for 2026-04-17 `check_expired_invitations` change** — currently applied via dashboard, not version-controlled. Critical for environment parity.
- [ ] Migration drift audit: every trigger, function, RLS policy in production must have a corresponding migration file. Build a CI check that fails if drift detected.
- [ ] **Schema drift on encounters table** — no migration file exists for 
      encounters. Table was bootstrapped from supabase/schema.sql, not 
      tracked via migrations. Production drifted from schema.sql (missing 
      duration_minutes column as of 2026-04-18). Fixed on 2026-04-18 by 
      creating first migration for this table. Audit ALL other tables 
      for similar drift — any table in schema.sql that doesn't have 
      corresponding migration files is a drift risk.
### Security / HIPAA
- [ ] Consider `git filter-repo` or BFG to scrub old service_role token from git history after rotation
- [ ] Confirm 2FA on Microsoft account (OneDrive sync exposure)
- [ ] Confirm 2FA on GitHub account
- [ ] Audit third-party integrations on `Iowa51/ChartSparkOG` GitHub repo
- [ ] Post-rotation: `findstr` entire disk for old service_role token

### Infrastructure
- [ ] Vercel → GitHub webhook reliability investigation — one deploy 2026-04-16 didn't auto-trigger
- [ ] Upstash rate-limit quota monitoring — alert before quota exhaustion
- [ ] Azure sidecar health endpoints + uptime monitoring
- [ ] Rollback plan documentation — one-command procedure

### Process discipline (after clinical launch)
- [ ] Stop committing directly to `main`. Feature branch + PR + CI
- [ ] Stop using `--no-verify`. Let pre-push hooks run
- [ ] Write 5-10 Playwright E2E tests for critical paths
- [ ] Post-incident 3-line notes after every production fix

### Role taxonomy cleanup
**Priority:** HIGH (not blocker, meaningful tech debt)
**Effort:** 4-8 hours
**Surfaced:** 2026-04-18 during clinician test user creation

**Problem 1 — UI/database vocabulary mismatch:**
- UI displays role as "Clinician" but database stores it as `USER`
- No documentation of the mapping anywhere in the codebase
- Any SQL query about clinicians requires knowing `USER = Clinician`
- Confusing for future developers, auditors, anyone reading the database directly

**Problem 2 — Four-tier system expressed as three database roles:**
- Product docs describe four tiers: Super Admin, RedArk Business Admin, Practice Manager, Clinician
- Database `users_role_check` allows only: SUPER_ADMIN, ADMIN, AUDITOR, USER
- "RedArk Business Admin" and "Practice Manager" both map to `ADMIN` — distinction must be stored elsewhere (investigate)
- If the distinction is implicit or relies on organization_id alone, the four-tier system is effectively three tiers

**Required fix:**
1. Investigate how "RedArk Business Admin" vs "Practice Manager" is currently distinguished
2. Decide target taxonomy. Recommendation: SUPER_ADMIN, BUSINESS_ADMIN, ADMIN, CLINICIAN (renamed from USER), AUDITOR
3. Postgres migration: update users_role_check constraint, UPDATE users SET role = 'CLINICIAN' WHERE role = 'USER', add column comments
4. Grep codebase for every 'USER' string literal in role context — update
5. Update TypeScript types, Zod schemas, RLS policies, audit log entries
6. Update UI to match database vocabulary
7. Update invitation flow and accept-invitation flow
8. Full Codex verification — refactor touches security boundaries
9. Full manual regression test of auth flows

**Dependencies:**
- Pair with the Admin UI for role changes build (already a 🔴 BLOCKER) — same sprint

**HIPAA relevance:**
Audit logs referencing role must use consistent vocabulary. Inconsistent role values across time periods creates compliance and reporting complications during audits. Better to fix before accumulating inconsistent audit data.
---

## 🛑 Gates before clinical launch (non-negotiable)

- [x] Layer 0 — sanitizeError fixed (DONE 2026-04-16)
- [ ] 🔴 BLOCKER — Admin UI for user role changes
- [ ] 🔴 BLOCKER — Supabase service_role key rotated
- [ ] 🔴 BLOCKER — Agent sidecar pipeline wired (End Session flow)
- [ ] Accept-invitation flow built and tested (in progress 2026-04-17)
- [ ] Layer 1 — silent-failure-auditor agent run, findings remediated
- [ ] Layer 2 — Sentry configured with PHI scrubbing, tested in prod
- [ ] Layer 3 — Env var validation at boot
- [ ] Layer 4 — Synthetic monitoring on critical paths
- [ ] Postgres migration drift audit clean

---

## Session log

**2026-04-16 (11 hours):**
- Audit + Codex verification
- P1 fixes (4 blockers)
- Upstash authentication fix
- sanitizeError observability fix
- Invitation DB trigger root-cause identified (not fixed)

**2026-04-17:**
- `check_expired_invitations` SQL function fixed (inlined `expire_old_invitations` logic)
- Invitation send flow working end-to-end
- Accept-invitation 404 bug discovered
- Decision: build accept-invitation flow (Path Y — one feature tonight)
- Decision: flag admin role-change UI as 🔴 BLOCKER (this document)

---

### AI tell-tale cleanup — UI surfaces (follow-up to 2026-04-20 note-body fix)

Note body text was cleaned in the `fix(smart-triage): replace decorative emoji with clinical severity labels in note body` commit. Remaining emoji/symbols live on UI-only surfaces:

- [ ] `src/components/smart-triage/MedicationSafetyCard.tsx:152` — 💡 Clinical Pearls header
- [ ] `src/components/smart-triage/LabMonitoringCard.tsx:23,25,48,60` — ✓ / ⚠️ status chips
- [ ] `src/components/smart-triage/PrescribingCheckDialog.tsx:163,212` — ⚠️ header + ✓ button label
- [ ] `src/lib/ai/smart-triage-prompts.ts:236–240` — chart-summary demo fallback uses ⚠️, 📋, 💊, 📅, 🔄

Replace with bracketed severity labels consistent with the note-body treatment. Clinical tool should look like professional medical software, not a consumer chatbot.

---

### Navigation / picker follow-ups (from 2026-04-20 navigation bug fix)

- [ ] Verify `/patients/new?returnTo=/notes/new` honors the `returnTo` param. After the B7 fix, a clinician who clicks "Add New Patient" in the picker ends up at `/patients/new` — if the page doesn't honor `returnTo`, they get stranded after adding a patient. Test and fix if broken.
- [ ] Delete `src/lib/demo-data/patients.ts` once all consumers are migrated. After the 2026-04-20 B7 fix, `PatientQuickSelectModal` no longer imports it — grep for other consumers and remove the file if it's truly orphaned.
- [ ] Dashboard stat cards lack visual affordance that they're clickable. UX polish — add hover state or subtle arrow icon so users know the cards navigate. Minor, non-blocking.
- [ ] Notes page URL status filter support. `/notes` page uses tab-based state only (All Notes / Signed / Drafts) and ignores URL query params for cards-driven entry points. Dashboard "Today's Notes" card originally tried `/notes?status=completed` which broke because: (a) the tab UI only recognizes `signed` / `draft`, (b) `"completed"` isn't a valid note status enum accepted by `/api/notes`. Either add `useSearchParams` support to `/notes` with the actual valid statuses, or remove URL-filter-style entry points into `/notes`. Same architectural pattern as the "Pending Encounters" bug already on roadmap.

### Dashboard stats follow-ups (from 2026-04-20 overhaul)

- [ ] Patient↔clinician assignment. No `provider_id` / `primary_provider_id` column on `patients` and no join table exists. Active Patients card is therefore still organization-scoped despite the product desire to show each clinician's panel. Add either a direct column or a `patient_providers` join table, then switch the Active Patients query to clinician-scoped.
- [ ] `count: 'exact'` on three tables per dashboard load is a latency risk at scale. Confirm indexes exist on the filter tuples used: `(organization_id, status)` on `patients`, `(organization_id, provider_id, status, signed_at)` and `(organization_id, provider_id, status)` on `notes`. Validate query plans at N=10k+ notes per clinician.
- [ ] RLS policy audit. API-level scoping is the only visible safety boundary on the stats endpoint. Confirm Supabase RLS policies exist on `patients` and `notes` that enforce `organization_id` and `provider_id` filtering at the DB level.
- [ ] Timezone as user profile field. Currently using browser-detected TZ, which works but drifts if a clinician travels. Add an optional profile override so clinicians can pin a clinic timezone regardless of device.
- [ ] Admin dashboard with org-wide stats. Dashboard is now clinician-scoped for notes. Create a separate dashboard for `BUSINESS_ADMIN` / `PRACTICE_MANAGER` roles that shows org-wide numbers.
- [ ] Reconciliation workflow for no-show encounters. Previous "Pending Encounters" card inadvertently surfaced stale scheduled encounters never marked completed or cancelled. Clinic operations still needs a way to surface and reconcile these.
- [ ] Add a calendar/schedule widget. The old "Pending Encounters" card was trying to answer "what's coming up?" — still a real clinician question, but belongs in a schedule view, not a pending count.
- [ ] `src/lib/data/encounters.ts:124,188` uses `notes:clinical_notes(*)` Supabase relational-embed syntax. The rest of the app writes to a table named `notes`, not `clinical_notes`. Either this path silently returns nothing, or there's a view/alias we haven't documented. Audit and fix or remove.
- [ ] Consolidate `notes` vs `clinical_notes` tables. SQL verification on 2026-04-20 confirmed `notes` table holds 0 rows while `clinical_notes` holds the real data (52 rows). All note CRUD writes to `clinical_notes`; `notes` is orphaned. Either drop `notes` and its RLS policies if nothing references it, or migrate any remaining writers to `clinical_notes` first. Schema tech debt.
- [ ] Reconcile dual signed-tracking on `clinical_notes`. Two fields track "is this signed": `status = 'signed'` (set only at creation) and `is_signed = true` / `signed_at IS NOT NULL` (set by the post-creation sign route). The sign route at `src/app/api/notes/[id]/sign/route.ts:94-100` updates `is_signed`/`signed_at`/`is_locked` but leaves `status` unchanged. Result: a note created as draft and later signed has `status = 'draft'` but `is_signed = true`. Dashboard now filters on `signed_at` as the authoritative field; eliminating the divergence (either drop `is_signed`/`is_locked` or update `status` in the sign path) is cleaner.
- [ ] Document note status state machine. The `draft | completed | signed | amended` enum (and the extended `pending_review | approved | needs_revision` values in the Zod schema) has no documented transition model. `amended` is never set anywhere in the code. Write an ADR or inline documentation explaining which transitions are allowed and what each state means — and drop values that are unused.
- [ ] Timezone unit tests. `scripts/verify-timezone-helper.mjs` gives ad-hoc coverage. Add proper Vitest cases covering: UTC identity, EDT, PDT, JST, DST spring-forward in `America/New_York` (2025-03-09), DST fall-back (2025-11-02), extreme offsets (`Pacific/Kiritimati` +14, `Pacific/Niue` -11), and invalid TZ strings.

---

## How to return to this document

Search for: `observability roadmap`, `pre-clinical blockers`, `OBSERVABILITY_ROADMAP.md`
File location: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\OBSERVABILITY_ROADMAP.md`

---

## Review schedule

- **Weekly** during clinical prep sprint
- **Monthly** post-launch
- **Quarterly** full review with incident history

---

**Core principle:** Every hour spent here is ~10 hours saved later. Today's 3-hour debugging session with `'Unknown error'` logs was preventable with Sentry alone.