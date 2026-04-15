# ChartSpark EHR - Master Audit Report

**Date:** 2026-03-18
**Branch:** `pre-production-audit`
**Stack:** Next.js 16 / Supabase / Vercel / Daily.co / Stripe / Azure OpenAI
**Agents:** Security Auditor, Architect, API Designer, Performance Engineer, QA Purist, Junior Dev Advocate, Readability Advocate, Tech Debt Accountant

---

## 1. Executive Summary

Eight independent review agents audited the ChartSpark psychiatric EHR codebase and identified **164 total findings** (with significant overlap). After deduplication, **68 unique findings** remain across security, architecture, performance, quality, readability, and developer experience.

### Critical Themes

1. **Production secrets committed to version control** -- Supabase service role key, PHI encryption key, and 8+ API keys are in `.env.local`, `.env.vercel`, and hardcoded in root-level test scripts. This is a HIPAA breach scenario requiring immediate credential rotation.

2. **Row Level Security failures on PHI tables** -- Six clinical tables (vitals, screening_scores, smart_triage_results, medication_interaction_log, ai_prompts, claim_lines) use `USING (true)` RLS policies, allowing any authenticated user to read PHI across all organizations. C-SSRS suicide screening data is exposed.

3. **Cross-organization data destruction** -- The clinical note DELETE endpoint uses `createServiceRoleClient()` (bypasses all RLS) without verifying organization ownership. Any authenticated user can delete any note by UUID.

4. **Authentication bypass risks** -- API auth uses `getSession()` (reads unvalidated JWT from cookies) instead of `getUser()` (server-validated). Users can self-escalate roles via RLS policy gap. Open redirect in auth callback enables phishing.

5. **HIPAA audit trail gaps** -- The data layer audit logger is a no-op stub. Billing routes have zero audit logging. Three competing audit systems exist with different interfaces. Security alerts are console-only with no real alerting.

6. **Zero API route test coverage** -- ~60 API routes handling PHI have no unit tests. Only 7 test files exist covering utility code. No integration tests for cross-org isolation.

### Aggregate Statistics

| Severity | Unique Findings |
|----------|:-:|
| Critical | 14 |
| High | 22 |
| Medium | 22 |
| Low | 10 |
| **Total** | **68** |

---

## 2. All Findings by Severity

### CRITICAL (14)

---

#### F-001: Production Secrets Committed to Version Control
- **Severity:** CRITICAL
- **Agents:** Security, Architect, Junior Dev, Tech Debt
- **Files:** `.env.local` (lines 1-38), `.env.vercel`, `.env.vercel.production`
- **Description:** Three `.env` files containing production secrets are committed/present in the repository. Exposed secrets include: `SUPABASE_SERVICE_ROLE_KEY` (full DB bypass), `PHI_ENCRYPTION_KEY` (decrypts all PHI), `AZURE_OPENAI_API_KEY`, `DAILY_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `CRON_SECRET`, and `VERCEL_OIDC_TOKEN`.
- **Fix:** (1) Immediately rotate ALL secrets, (2) `git rm --cached .env*`, (3) Scrub from git history with BFG Repo Cleaner, (4) Use Vercel Environment Variables or a secrets manager exclusively, (5) Add pre-commit hooks with `gitleaks` or `detect-secrets`.

---

#### F-002: Hardcoded Credentials in Root-Level Test Scripts
- **Severity:** CRITICAL
- **Agents:** Tech Debt, Security
- **Files:** `test-login.js` (line 5), `test-rls.js` (line 6), `test-delete.js`
- **Description:** Root-level debug scripts contain hardcoded Supabase service role JWTs, anon keys, and demo password `Demo123!!` in plaintext JavaScript. These bypass `.gitignore` protection since they are `.js` files, not `.env` files.
- **Fix:** Delete all root test scripts, rotate all Supabase keys, scrub from git history, add `test-*.js` to `.gitignore`.

---

#### F-003: RLS Policies Missing on 6 PHI Tables (USING (true))
- **Severity:** CRITICAL
- **Agents:** Security, Architect
- **File:** `supabase/migrations/20260218_vitals_triage_tables.sql` (lines 188-207)
- **Description:** Six tables have RLS policies set to `USING (true)`: `vitals`, `screening_scores`, `smart_triage_results`, `medication_interaction_log`, `ai_prompts`, and `claim_lines`. Any authenticated user can read/write all records across all organizations. Includes C-SSRS suicide screening data.
- **Fix:** Replace all `USING (true)` with `USING (organization_id = public.get_user_organization_id())`. Enable RLS on `claim_lines` and `acknowledgements`.

---

#### F-004: Note Deletion Bypasses RLS Without Organization Verification
- **Severity:** CRITICAL
- **Agents:** Security, Architect, API Designer, QA
- **File:** `src/app/api/notes/[id]/route.ts` (lines 161-208)
- **Description:** `handleDelete` uses `createServiceRoleClient()` which bypasses ALL RLS, but does NOT verify the note belongs to the user's organization. Only filters by `id`. Compare to `handlePatch` which correctly checks `organization_id`.
- **Fix:** Add `.eq('organization_id', context.user.organizationId)` to the delete query. Add `requiredRole: ['ADMIN', 'SUPER_ADMIN']`.

---

#### F-005: API Auth Uses getSession() Instead of getUser()
- **Severity:** CRITICAL
- **Agents:** Security, Architect
- **File:** `src/lib/auth/api-auth.ts` (line 40)
- **Description:** `getAuthenticatedUser()` uses `supabase.auth.getSession()` which reads JWT from cookies without server validation. Tampered or expired JWTs could bypass authentication. Middleware correctly uses `getUser()` but all API routes go through this insecure path.
- **Fix:** Replace `getSession()` with `supabase.auth.getUser()` and use `user` object directly.

---

#### F-006: Open Redirect in Auth Callback
- **Severity:** CRITICAL
- **Agents:** Security, Architect, API Designer, QA
- **File:** `src/app/api/auth/callback/route.ts` (lines 4-29)
- **Description:** The `next` query parameter is used in `NextResponse.redirect()` without validation. `//evil.com` or `x-forwarded-host` injection enables redirection to phishing sites post-authentication.
- **Fix:** Validate `next` starts with `/` and does not contain `//` or `\`. Validate `x-forwarded-host` against an allowlist.

---

#### F-007: Users Can Self-Escalate Role via RLS Policy Gap
- **Severity:** CRITICAL
- **Agents:** Security
- **Files:** `supabase/schema.sql` (lines 244-248), `fix_rls_complete.sql` (lines 77-82)
- **Description:** The `users_update_own` RLS policy allows users to update ANY column on their own row, including `role` and `organization_id`. A user can promote themselves to `SUPER_ADMIN`.
- **Fix:** Add column-level restrictions preventing role/org changes, or use a trigger to block non-admin role modifications.

---

#### F-008: Feature Access Check Fails OPEN on Error
- **Severity:** CRITICAL
- **Agents:** API Designer
- **File:** `src/app/api/subscriptions/check-feature/route.ts` (lines 30-33)
- **Description:** On error, returns `{ hasAccess: true }`, granting access to gated features. Feature gates may control access to higher-risk PHI operations.
- **Fix:** Return `{ hasAccess: false }` with HTTP 503 on error.

---

#### F-009: No Unit Tests for Any API Route Handler
- **Severity:** CRITICAL
- **Agents:** QA
- **File:** All files under `src/app/api/`
- **Description:** ~60 API route handlers covering patients, notes, billing, appointments, telehealth, screenings, vitals, AI, auth, and cron jobs have zero unit tests. Only 7 test files exist covering utility/library code.
- **Fix:** Create tests for each API route. Priority: auth routes, patient CRUD, note signing, billing, AI endpoints. Each test must verify auth enforcement, org scoping, validation, audit logging.

---

#### F-010: Data Layer Audit Log is a No-Op Stub
- **Severity:** CRITICAL
- **Agents:** QA, Junior Dev, Readability, Tech Debt
- **File:** `src/lib/data/utils.ts` (lines 268-277)
- **Description:** `createAuditLog()` only logs to console in development and has `TODO: Implement actual audit log insertion`. Patient CRUD operations through the data layer are NOT audit-logged in production. HIPAA compliance violation.
- **Fix:** Wire to the real `logAuditEvent` from `src/lib/security/audit-log.ts`, or remove stub and call real logger directly from data layer.

---

#### F-011: Screening POST Missing Zod Validation
- **Severity:** CRITICAL
- **Agents:** QA, API Designer
- **File:** `src/app/api/screenings/route.ts` (lines 75-98)
- **Description:** POST handler uses manual validation instead of Zod. `item_responses` (JSON object) inserted directly without type checking or size limits. `patient_id` not validated as UUID.
- **Fix:** Create `ScreeningCreateSchema` with proper types, bounded `total_score`, UUID validation, and payload size limits.

---

#### F-012: TOCTOU Race in Billing Duplicate Check
- **Severity:** CRITICAL
- **Agents:** QA
- **File:** `src/app/api/billing/route.ts` (lines 60-76)
- **Description:** SELECT-then-INSERT pattern for duplicate checking. Between check and insert, another request can insert the same record. Duplicate billing claims can constitute fraud.
- **Fix:** Rely solely on DB UNIQUE constraint + 23505 error handler. Remove application-level check-then-insert.

---

#### F-013: Duplicate NM1 Case in ERA Parser (Dead Code / Bug)
- **Severity:** CRITICAL
- **Agents:** Readability
- **File:** `src/lib/managed-billing/era-parser.ts` (lines 80-106)
- **Description:** Duplicate `case 'NM1':` in switch statement makes second branch unreachable. Patient name extraction from NM1/QC segments never executes, causing missing patient names in ERA payment matching.
- **Fix:** Merge both NM1 handlers into a single `case` block.

---

#### F-014: Patient Search Fetches ALL Records Then Filters Client-Side
- **Severity:** CRITICAL
- **Agents:** Performance, Security, Architect, QA, Readability
- **File:** `src/lib/data/patients.ts` (lines 200-243)
- **Description:** `searchPatients()` fetches every patient in the organization from the database, then filters in JavaScript memory. At 10,000+ patients: 500ms-5s response times, memory exhaustion risk, all PHI loaded unnecessarily.
- **Fix:** Use Supabase `ilike` or `textSearch` for server-side filtering. Add PostgreSQL `tsvector` column with GIN index for production-grade search.

---

### HIGH (22)

---

#### F-015: Patient Update (PATCH) Lacks Input Validation
- **Severity:** HIGH
- **Agents:** Security, Architect, API Designer, QA, Junior Dev
- **File:** `src/app/api/patients/[id]/route.ts` (lines 52-70)
- **Description:** Raw request JSON passed directly to `updatePatient()` without Zod validation. Mass assignment vulnerability -- attacker could modify `organization_id`, `created_by`, `status`.
- **Fix:** Apply `PatientUpdateSchema` validation. Explicitly exclude protected fields.

---

#### F-016: Patient Delete Lacks Role Restriction
- **Severity:** HIGH
- **Agents:** Security
- **File:** `src/app/api/patients/[id]/route.ts` (line 109)
- **Description:** DELETE handler exported with only `requireOrganization: true` but no `requiredRole`. Any USER role can archive patients.
- **Fix:** Add `requiredRole: ['ADMIN', 'SUPER_ADMIN']`.

---

#### F-017: Audit Log INSERT Allows Any Authenticated User to Write
- **Severity:** HIGH
- **Agents:** Security, Architect
- **Files:** `supabase/schema.sql` (line 713), `supabase/migrations/stage1_database_foundation.sql` (lines 304-306)
- **Description:** `audit_logs` and `login_attempts` tables have `WITH CHECK (TRUE)` INSERT policies. Any user can inject fake audit entries to obscure attacks or frame other users. Violates HIPAA 45 CFR 164.312(b).
- **Fix:** Restrict INSERT to `service_role` only. Route all audit writes through server-side code.

---

#### F-018: Demo Mode Bypasses Authentication in Production
- **Severity:** HIGH
- **Agents:** Security
- **File:** `src/lib/supabase/middleware.ts` (lines 118-122)
- **Description:** `NEXT_PUBLIC_DEMO_MODE=true` allows unauthenticated access to all protected routes. `.env.vercel` has demo mode enabled. `.env.vercel.production` has `\r\n` suffix that may cause comparison issues.
- **Fix:** Remove demo mode from production builds. Add startup check that halts if demo mode is enabled in production.

---

#### F-019: Lockout Check Fails Open
- **Severity:** HIGH
- **Agents:** Security, QA
- **Files:** `src/app/api/auth/check-lockout/route.ts` (lines 32-44), `src/lib/auth/lockout.ts` (line 44)
- **Description:** When service role client is unavailable or DB errors occur, lockout check returns `locked: false`, allowing unlimited login attempts.
- **Fix:** Return `locked: true` with HTTP 503 when infrastructure is unavailable in production.

---

#### F-020: Record Login Attempt API is Unauthenticated
- **Severity:** HIGH
- **Agents:** Security
- **File:** `src/app/api/auth/record-attempt/route.ts`
- **Description:** Accepts POST without authentication, writes to DB via service role. Attacker can lock out legitimate users by flooding with fake failed attempts.
- **Fix:** Add rate limiting, validate email format, consider server-side-only recording triggered by auth callback.

---

#### F-021: CSP Allows unsafe-eval Site-Wide
- **Severity:** HIGH
- **Agents:** Security, Architect, API Designer
- **File:** `next.config.ts` (line 35)
- **Description:** `'unsafe-eval'` in `script-src` for Daily.co SDK compatibility applies to ALL pages, not just telehealth. Significantly weakens XSS protections.
- **Fix:** Restrict `unsafe-eval` to telehealth routes only. Investigate Daily.co iframe integration.

---

#### F-022: Session Timeout Enforcement is Client-Side Only
- **Severity:** HIGH
- **Agents:** Architect, API Designer
- **File:** `src/lib/auth/session.ts` (lines 1-131)
- **Description:** HIPAA 15-minute inactivity timeout implemented entirely via `localStorage`. No server-side enforcement. Users can clear localStorage or use JWT directly to bypass.
- **Fix:** Implement server-side session tracking with `last_activity_at` in database. Validate in `withAuth` wrapper.

---

#### F-023: MFA Not Required for API Routes Accessing PHI
- **Severity:** HIGH
- **Agents:** Architect
- **File:** `src/app/api/patients/route.ts` (lines 142-148)
- **Description:** MFA enforced in middleware for page navigation but NOT for API routes. User can bypass MFA by calling `/api/patients`, `/api/notes` directly. MFA not required for regular USER role at all.
- **Fix:** Add `requireMFA: true` to all PHI-accessing API routes. Consider MFA for all users accessing PHI.

---

#### F-024: AI Chat Audit Event Uses Wrong Type
- **Severity:** HIGH
- **Agents:** QA
- **Files:** `src/app/api/ai/chat/route.ts` (line 34), `src/app/api/ai/diagnose/route.ts` (line 27)
- **Description:** AI interactions logged as `NOTE_VIEW` instead of `AI_CHAT_REQUEST`/`AI_DIAGNOSE_REQUEST`. HIPAA audit trail cannot distinguish AI usage from note viewing.
- **Fix:** Change to correct event types. `AI_CHAT_REQUEST` and `AI_DIAGNOSE_REQUEST` exist but are unused.

---

#### F-025: Treatment Plan API Missing Validation + PHI in Audit Log
- **Severity:** HIGH
- **Agents:** API Designer
- **File:** `src/app/api/ai/treatment-plan/route.ts` (lines 12-24, 45)
- **Description:** (A) No Zod validation despite `AITreatmentPlanSchema` existing. Prompt injection risk. (B) Patient name (PHI) logged in audit event `details` field.
- **Fix:** Apply `AITreatmentPlanSchema`. Remove `patientName` from audit details.

---

#### F-026: Encounter Tracking Lacks Validation and Org Scoping
- **Severity:** HIGH
- **Agents:** API Designer
- **File:** `src/app/api/encounters/tracking/route.ts` (lines 14-47)
- **Description:** `action` field not validated (log injection risk), `encounterId` not validated as UUID, no verification encounter belongs to user's organization.
- **Fix:** Create `TrackingSchema` with validated `action` enum and UUID fields. Verify encounter org ownership.

---

#### F-027: Auditor Batch Action Missing Organization Scoping
- **Severity:** HIGH
- **Agents:** API Designer
- **File:** `src/app/api/auditor/batch-action/route.ts` (lines 20-28)
- **Description:** Batch approve/flag uses `.in('id', submissionIds)` without `organization_id` filter. Cross-org data manipulation possible.
- **Fix:** Add `.eq('organization_id', context.user.organizationId)`.

---

#### F-028: Three Competing Audit Logging Systems
- **Severity:** HIGH
- **Agents:** Tech Debt, Junior Dev, Readability
- **Files:** `src/lib/security/audit-log.ts`, `src/lib/audit/audit-service.ts`, `src/lib/data/utils.ts`, `src/lib/managed-billing/audit-logger.ts`
- **Description:** 3-4 separate audit logging implementations with different type systems, different Supabase clients, and different interfaces. API routes inconsistently import from different systems.
- **Fix:** Consolidate into single audit service using `createServiceRoleClient()`. Unify event type enums. Remove stubs.

---

#### F-029: Duplicate Type Definitions Across Two Files
- **Severity:** HIGH
- **Agents:** Junior Dev, Tech Debt
- **Files:** `src/types/database.ts`, `src/lib/types/database.ts`
- **Description:** Overlapping but divergent definitions. `Role` has 4 values in one file, 3 in the other (missing AUDITOR). `Patient.status` enums differ. `Note` interfaces have different shapes.
- **Fix:** Consolidate into single `src/types/database.ts`. Delete duplicate.

---

#### F-030: Three Competing Validation Frameworks
- **Severity:** HIGH
- **Agents:** Tech Debt, Readability
- **Files:** `src/lib/security/validation.ts`, `src/lib/validation/schemas.ts`, `src/lib/utils/validation.ts`
- **Description:** Three validation systems with different naming (camelCase vs snake_case), different field sets, and different `validateRequest` signatures.
- **Fix:** Consolidate on `validation/schemas.ts` (snake_case, matching DB columns). Remove or deprecate others.

---

#### F-031: Three Safe-Logger Implementations
- **Severity:** HIGH
- **Agents:** Tech Debt, Junior Dev, Readability
- **Files:** `src/lib/logging/safe-logger.ts`, `src/lib/utils/safe-logger.ts`, `src/lib/data/utils.ts` (lines 16-50)
- **Description:** Three PHI-safe logging implementations with different redaction approaches. PHI could leak through the least restrictive logger.
- **Fix:** Consolidate into `logging/safe-logger.ts`. Remove duplicates.

---

#### F-032: `null as unknown as Type` Pattern Hides Runtime Crashes
- **Severity:** HIGH
- **Agents:** Junior Dev
- **Files:** `src/lib/supabase/server.ts` (line 33), `src/lib/supabase/client.ts` (line 34)
- **Description:** In demo mode, Supabase clients return `null as unknown as SupabaseClient`. Code type-checks fine but crashes at runtime with null pointer exceptions.
- **Fix:** Return proper mock client or make return type `SupabaseClient | null` and fix all callers.

---

#### F-033: Vitals GET Missing Organization Scoping
- **Severity:** HIGH
- **Agents:** QA
- **File:** `src/app/api/vitals/route.ts` (lines 52-63)
- **Description:** Query filters by `patient_id` but NOT `organization_id`. Combined with broken RLS (F-003), enables cross-org PHI access.
- **Fix:** Add `.eq('organization_id', context.user.organizationId)`.

---

#### F-034: Billing Route Missing Audit Logging
- **Severity:** HIGH
- **Agents:** Tech Debt
- **File:** `src/app/api/billing/route.ts`
- **Description:** Neither GET nor POST handler has any audit logging. Billing records contain patient financial data (PHI under HIPAA). Compare with patients/notes routes which have comprehensive logging.
- **Fix:** Add `logAuditEventAsync` for reads and `logPHIAccess` for writes.

---

#### F-035: Office Ally SFTP "Decryption" Uses Base64 Decode
- **Severity:** HIGH
- **Agents:** Tech Debt, Readability
- **File:** `src/lib/managed-billing/office-ally-sftp.ts` (lines 130-135)
- **Description:** `decrypt()` function performs `Buffer.from(value, 'base64')` -- base64 decoding, NOT encryption. Clearinghouse credentials stored with fake "encryption".
- **Fix:** Use `decryptPHI` from `encryption.ts`. Re-encrypt stored credentials with AES-256-GCM.

---

#### F-036: `lockout.ts` Uses Browser Client for Server-Side Operation
- **Severity:** HIGH
- **Agents:** Tech Debt, QA, Architect
- **File:** `src/lib/auth/lockout.ts` (line 4)
- **Description:** Imports browser client (`@/lib/supabase/client`) for server-side lockout checks. Lockout needs to bypass RLS (pre-auth), so should use service role client.
- **Fix:** Switch to `createServiceRoleClient`. Handle null case properly.

---

### MEDIUM (22)

---

#### F-037: PHI Encryption Not Applied at Data Layer
- **Severity:** MEDIUM
- **Agents:** Architect
- **File:** `src/lib/data/patients.ts` (lines 275-420)
- **Description:** Encryption module defines `PHI_ENCRYPTED_FIELDS` but `createPatient`/`updatePatient` never call `encryptPHIFields()`. PHI stored in plaintext despite encryption infrastructure existing.
- **Fix:** Call `encryptPHIFields()` before writes and `decryptPHIFields()` after reads. Run data migration for existing records.

---

#### F-038: In-Memory Rate Limiting and Idempotency Not Production-Ready
- **Severity:** MEDIUM
- **Agents:** Architect, API Designer, QA, Performance
- **Files:** `src/lib/security/rate-limit.ts` (line 40), `src/app/api/subscriptions/webhook/route.ts` (line 16)
- **Description:** Rate limiter and Stripe webhook idempotency use in-memory `Map`. On Vercel serverless, each invocation has fresh memory. Rate limits not enforced across instances; webhooks processed multiple times.
- **Fix:** Ensure Upstash Redis active in production. Move webhook idempotency to Redis or database.

---

#### F-039: Billing GET Returns ALL Records Without Pagination
- **Severity:** MEDIUM
- **Agents:** Performance, API Designer
- **File:** `src/app/api/billing/route.ts` (lines 10-23)
- **Description:** No `.range()` or `.limit()`. Billing records grow monotonically (never deleted). 10,000+ records = 5-10MB payloads, 2-5s response times.
- **Fix:** Add pagination with `page`/`limit` parameters and `.range()`.

---

#### F-040: Appointments GET Returns All Records Without Pagination
- **Severity:** MEDIUM
- **Agents:** Performance, API Designer
- **File:** `src/app/api/appointments/route.ts` (lines 37-54)
- **Description:** Returns all appointments with no limit or pagination. 50+ appointments/day accumulate unbounded.
- **Fix:** Add date-range defaults (current week) and pagination. Add `.limit(100)` safety net.

---

#### F-041: Dashboard Stats Executes Three Sequential Queries
- **Severity:** MEDIUM
- **Agents:** Performance
- **File:** `src/app/api/dashboard/stats/route.ts` (lines 23-44)
- **Description:** Three independent count queries run sequentially. Dashboard is the first page users see on every session. 150-450ms unnecessary latency.
- **Fix:** Use `Promise.all()` to execute concurrently.

---

#### F-042: Email/PHI Logged in Middleware and AI Error Handlers
- **Severity:** MEDIUM
- **Agents:** Security
- **Files:** `src/lib/supabase/middleware.ts` (lines 166, 181, 216), `src/app/api/ai/chat/route.ts` (line 70)
- **Description:** User email addresses logged in console warnings. AI chat error messages (which may echo clinical content) logged in audit details.
- **Fix:** Log user IDs instead of emails. Use `sanitizeError()` for AI error messages.

---

#### F-043: Claim Lines and Acknowledgements Tables Missing RLS
- **Severity:** MEDIUM
- **Agents:** Security
- **File:** `supabase/migrations/20260129_billing_core_infrastructure.sql` (lines 188-276)
- **Description:** `claim_lines` and `acknowledgements` tables have no RLS enabled at all. Direct access bypasses claim-level security.
- **Fix:** Enable RLS and add organization-scoped policies.

---

#### F-044: Webhook Handler Uses createClient() Instead of Service Role
- **Severity:** MEDIUM
- **Agents:** Security
- **File:** `src/app/api/subscriptions/webhook/route.ts` (lines 96, 136)
- **Description:** Stripe webhook uses user-session-based client. Webhooks have no user session, so operations may fail silently. Subscriptions could remain active after expiry.
- **Fix:** Use `createServiceRoleClient()` for webhook handlers.

---

#### F-045: Invitation Token Returned in API Response
- **Severity:** MEDIUM
- **Agents:** Security
- **File:** `src/app/api/admin/invitations/route.ts` (line 200)
- **Description:** Invite URL with secret token returned in JSON response. Exposed to browser extensions, proxy servers, browser history.
- **Fix:** Only return invite URL if email send failed. Show masked version in UI.

---

#### F-046: Claim Submission Has No Role Restriction
- **Severity:** MEDIUM
- **Agents:** Architect
- **File:** `src/app/api/managed-billing/claims/[id]/submit/route.ts` (line 63)
- **Description:** Any authenticated user can submit insurance claims -- a high-risk financial operation.
- **Fix:** Add `requiredRole: ['ADMIN', 'SUPER_ADMIN']`.

---

#### F-047: Notes GET Returns All Fields (Over-fetching PHI)
- **Severity:** MEDIUM
- **Agents:** API Designer
- **File:** `src/app/api/notes/route.ts` (lines 39-47)
- **Description:** Uses `SELECT *` returning full note content, SOAP sections, all PHI in list view. Violates HIPAA minimum necessary principle.
- **Fix:** Select only metadata fields for list view (id, patient_id, status, created_at).

---

#### F-048: EHR Audit Log GET Has No Organization Filter
- **Severity:** MEDIUM
- **Agents:** API Designer
- **File:** `src/app/api/ehr/audit-log/route.ts` (lines 24-40)
- **Description:** Queries `audit_logs` without `organization_id` filter. Users could see EHR audit entries from other organizations.
- **Fix:** Add `.eq('organization_id', context.user.organizationId)`.

---

#### F-049: Rate Limiting Uses Exact Pathname as Key (Bypass via UUID Rotation)
- **Severity:** MEDIUM
- **Agents:** API Designer
- **File:** `src/lib/security/rate-limit.ts` (lines 125-128)
- **Description:** Key is `${ip}:${pathname}`. Each unique UUID gets its own counter. Attacker can iterate UUIDs to bypass rate limits while brute-forcing patient/note IDs.
- **Fix:** Normalize pathname: `pathname.replace(/\/[0-9a-f-]{36}/gi, '/:id')`.

---

#### F-050: Security Alert System is Console-Only
- **Severity:** MEDIUM
- **Agents:** QA
- **File:** `src/lib/security/audit-log.ts` (lines 289-312)
- **Description:** `triggerSecurityAlert` for CRITICAL events only logs to console. Email, SMS, SIEM, and incident ticket integrations are unimplemented TODO comments.
- **Fix:** Integrate with at least one alerting channel (Resend email, Slack webhook, PagerDuty, or Sentry).

---

#### F-051: Two Separate ERA/835 Parsers with Divergent Logic
- **Severity:** MEDIUM
- **Agents:** Readability
- **Files:** `src/lib/managed-billing/era-parser.ts`, `src/lib/managed-billing/era-service.ts` (lines 168-241)
- **Description:** Two different 835 parsers with different data structures (`ERAClaim` vs `ERAPayment`), field names, and parsing strategies. Bug fixes must be applied in both locations.
- **Fix:** Consolidate into single parser. `ERAParser` class should be canonical.

---

#### F-052: Money Representation Inconsistency (Dollars vs Cents)
- **Severity:** MEDIUM
- **Agents:** Readability
- **Files:** `src/lib/billing.ts` (dollars), `src/lib/managed-billing/claim-generator.ts` (cents)
- **Description:** Same CPT billing rates represented in dollars in one module and cents in another. Copying between modules could introduce 100x billing errors.
- **Fix:** Standardize on cents as integers everywhere (industry standard). Create shared `Money` type.

---

#### F-053: `any` Types Throughout Critical Code (116 occurrences)
- **Severity:** MEDIUM
- **Agents:** Readability, Tech Debt, Junior Dev
- **Files:** 30+ files, worst in `safeAzureOpenAI.ts`, `clearinghouse-service.ts`, `treatment-planner/page.tsx`
- **Description:** 116 uses of `any` type defeat TypeScript safety in PHI-handling and billing code. Wrong field access in `claim: any` means wrong financial data.
- **Fix:** Enable `noImplicitAny`. Define proper interfaces for AI responses, billing claims, and Supabase results.

---

#### F-054: Inconsistent Demo Mode Checks Across Codebase
- **Severity:** MEDIUM
- **Agents:** Tech Debt, Junior Dev
- **Files:** `server.ts`, `client.ts`, `service-role-client.ts`, `middleware.ts`, `environment.ts`
- **Description:** Centralized `isDemoMode()` exists but 4+ files use inline checks with subtly different logic. Middleware check missing `NODE_ENV` guard.
- **Fix:** Replace all inline checks with centralized `isDemoMode()`.

---

#### F-055: Managed Billing Claims POST Lacks Input Validation
- **Severity:** MEDIUM
- **Agents:** API Designer, Readability
- **File:** `src/app/api/managed-billing/claims/route.ts` (lines 61-97)
- **Description:** No Zod validation. Accepts negative `billedAmount`, invalid UUIDs, injection payloads in `payerName`. Financial manipulation vector.
- **Fix:** Create `BillingClaimCreateSchema` with UUID validation, positive amount constraint, field length limits.

---

#### F-056: Note Creation and Patient Update Not Transactional
- **Severity:** MEDIUM
- **Agents:** QA
- **File:** `src/app/api/notes/route.ts` (lines 115-138)
- **Description:** Note INSERT and patient `last_visit_date` UPDATE are separate operations. Patient update failure is silently ignored.
- **Fix:** Use Supabase RPC function or database trigger for atomic update.

---

#### F-057: `checkAfterHoursAccess` Ignores Timezone Parameter
- **Severity:** MEDIUM
- **Agents:** Readability
- **File:** `src/lib/security/intrusion-detection.ts` (lines 177-199)
- **Description:** Function accepts `timezone` parameter but uses `new Date().getHours()` (server local time). Misleading API.
- **Fix:** Implement timezone-aware checking or remove the parameter.

---

#### F-058: `force-dynamic` on App Layout Disables All Static Optimization
- **Severity:** MEDIUM
- **Agents:** Performance
- **File:** `src/app/(app)/layout.tsx` (line 8)
- **Description:** Blanket `force-dynamic` on layout forces every page under `(app)` to be server-rendered on every request. Adds 100-500ms per request for pages that could be static.
- **Fix:** Move `force-dynamic` to individual pages that require it.

---

### LOW (10)

---

#### F-059: Rate Limit Headers Expose Internal Configuration
- **Severity:** LOW
- **Agents:** Security
- **File:** `src/lib/security/rate-limit.ts` (lines 277-285)
- **Description:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers expose exact rate limiting configuration.
- **Fix:** Only return `Retry-After` header.

---

#### F-060: Lockout Duration Mismatch (Client 30min vs Server 5min)
- **Severity:** LOW
- **Agents:** Security
- **Files:** `src/lib/auth/lockout.ts` (line 8), `src/app/api/auth/check-lockout/route.ts` (line 11)
- **Description:** Client-side lockout is 30 minutes, server-side is 5 minutes. Actual protection is only 5 minutes.
- **Fix:** Align both to 30 minutes. Centralize configuration.

---

#### F-061: Any *.vercel.app Subdomain Accepted as Valid CSRF Origin
- **Severity:** LOW
- **Agents:** QA, API Designer
- **File:** `src/lib/security/csrf.ts` (lines 88-96)
- **Description:** `url.hostname.endsWith('.vercel.app')` accepts any Vercel deployment including attacker-controlled projects.
- **Fix:** Restrict to project-specific pattern (e.g., `chart-spark-*.vercel.app`).

---

#### F-062: Stock README With No Project Documentation
- **Severity:** LOW
- **Agents:** Junior Dev
- **File:** `README.md`
- **Description:** Default `create-next-app` template. No setup instructions, no HIPAA context, no architecture overview, no env var documentation.
- **Fix:** Write comprehensive README with setup guide, `.env.example`, architecture overview, HIPAA rules for developers.

---

#### F-063: No `.env.example` File
- **Severity:** LOW
- **Agents:** Junior Dev
- **Description:** Required environment variables discoverable only by reading multiple source files. No template for new developers.
- **Fix:** Create `.env.example` with all required variables, grouped by service, with comments.

---

#### F-064: IDS SQL Injection Patterns Trigger on Clinical Text
- **Severity:** LOW
- **Agents:** QA, Readability
- **File:** `src/lib/security/intrusion-detection.ts` (line 26)
- **Description:** Regex matches words like "select", "drop", "create" in URLs. Clinical notes with "select" or "drop in blood pressure" could trigger false positives.
- **Fix:** Apply IDS only to URL paths and query parameters, not request bodies.

---

#### F-065: Broad IDS Safelist Disables Protection for Most API Routes
- **Severity:** LOW
- **Agents:** QA, API Designer
- **File:** `src/middleware.ts` (lines 16-27)
- **Description:** Safelist includes `/api/patients`, `/api/notes`, `/api/billing`, `/api/ai/` etc., effectively disabling IDS for the majority of API traffic.
- **Fix:** Narrow safelist to specific false-positive paths, not entire API trees.

---

#### F-066: Appointment Audit Event Uses Wrong Type
- **Severity:** LOW
- **Agents:** QA
- **File:** `src/app/api/appointments/route.ts` (line 119)
- **Description:** Appointment creation logged as `PATIENT_CREATE` instead of `APPOINTMENT_CREATE`.
- **Fix:** Use correct event type.

---

#### F-067: PatientCreateSchema Accepts Future Dates of Birth
- **Severity:** LOW
- **Agents:** QA
- **File:** `src/lib/validation/schemas.ts` (line 39)
- **Description:** `date_of_birth` regex validates format but accepts `2099-12-31`.
- **Fix:** Add `.refine()` to reject future dates.

---

#### F-068: Missing Automated Formatting (No Prettier Config)
- **Severity:** LOW
- **Agents:** Tech Debt
- **Description:** No Prettier or equivalent. ESLint config is minimal. No import ordering or formatting enforcement.
- **Fix:** Add Prettier with `.prettierrc`. Add format check to CI.

---

## 3. Top 10 Remediation Priority Queue

| # | Finding | Severity | Effort | HIPAA Impact | Rationale |
|---|---------|----------|--------|--------------|-----------|
| 1 | **F-001/F-002: Rotate & remove all secrets** | CRITICAL | 4h | Breach notification required | Service role key = full DB bypass. PHI encryption key = all PHI readable. Must rotate before ANY other work. |
| 2 | **F-003: Fix RLS on 6 PHI tables** | CRITICAL | 2h | Direct unauthorized PHI access | Every minute these stay `USING(true)`, any user can read suicide screening scores across all orgs. |
| 3 | **F-007: Block self-role-escalation** | CRITICAL | 1h | Complete system compromise | Any user can become SUPER_ADMIN right now. One SQL update away from full access. |
| 4 | **F-005: Replace getSession() with getUser()** | CRITICAL | 1h | Auth bypass for all API routes | Tampered JWTs could pass authentication. One-line fix with massive impact. |
| 5 | **F-004: Fix note deletion org check** | CRITICAL | 1h | Cross-org data destruction | Add `.eq('organization_id', ...)` to delete query. Mirrors existing PATCH pattern. |
| 6 | **F-006: Fix open redirect** | CRITICAL | 30m | Credential phishing | Validate `next` parameter. Simple regex check. |
| 7 | **F-015: Add patient PATCH validation** | HIGH | 1h | Mass assignment / data corruption | Apply existing `PatientUpdateSchema`. Schema already exists, just needs to be wired up. |
| 8 | **F-018: Disable demo mode in production** | HIGH | 1h | Full auth bypass | Add startup check. Fix `\r\n` in env value. |
| 9 | **F-010/F-028: Fix audit logging gaps** | HIGH | 2d | HIPAA compliance violation | Wire stub to real logger. Consolidate 3 systems. Add billing audit logging (F-034). |
| 10 | **F-009: Establish API route test infrastructure** | CRITICAL | 3d | Regression prevention | Create test harness + tests for auth, patient, note, billing routes. Foundation for ongoing quality. |

**Total estimated effort for Top 10: ~5-6 developer-days**

---

## 4. PHI / HIPAA Compliance Section

### Current HIPAA Compliance Status: FAILING

The following HIPAA requirements are not met:

#### 45 CFR 164.312(a)(1) - Access Control
- **FAILING:** RLS policies allow cross-organization access to vitals, screening scores, medication interactions (F-003)
- **FAILING:** Users can self-escalate to SUPER_ADMIN via RLS gap (F-007)
- **FAILING:** Demo mode can bypass authentication entirely (F-018)
- **FAILING:** API auth uses unvalidated JWT tokens (F-005)
- **AT RISK:** MFA not enforced for API routes accessing PHI (F-023)

#### 45 CFR 164.312(b) - Audit Controls
- **FAILING:** Data layer audit logging is a no-op stub (F-010)
- **FAILING:** Billing routes have zero audit logging (F-034)
- **FAILING:** Three competing audit systems create inconsistent coverage (F-028)
- **FAILING:** AI interactions logged under wrong event types (F-024)
- **FAILING:** Audit log INSERT policies allow any user to inject fake entries (F-017)
- **FAILING:** Security alerts are console-only, no real notification system (F-050)

#### 45 CFR 164.312(c)(1) - Integrity Controls
- **FAILING:** Clinical notes can be deleted across organizations (F-004)
- **FAILING:** Patient records vulnerable to mass assignment (F-015)
- **AT RISK:** Billing duplicate check has TOCTOU race condition (F-012)

#### 45 CFR 164.312(d) - Person or Entity Authentication
- **FAILING:** `getSession()` does not validate JWT with auth server (F-005)
- **AT RISK:** Lockout mechanism fails open on errors (F-019)
- **AT RISK:** Session timeout enforcement is client-side only (F-022)

#### 45 CFR 164.312(e)(1) - Transmission Security
- **PASSING:** HSTS enabled, TLS enforced
- **AT RISK:** PHI encryption infrastructure exists but is not applied at data layer (F-037)

#### 45 CFR 164.308(a)(1)(ii)(D) - Information System Activity Review
- **AT RISK:** No automated security alerting (F-050)
- **AT RISK:** Zero test coverage for security-critical code paths (F-009)

### PHI Data at Risk

| Data Type | Table | Exposure | Sensitivity |
|-----------|-------|----------|-------------|
| Suicide screening (C-SSRS) | `screening_scores` | Any authenticated user | Extreme |
| Substance abuse screening (AUDIT-C) | `screening_scores` | Any authenticated user | Very High |
| Depression/anxiety scores (PHQ-9, GAD-7) | `screening_scores` | Any authenticated user | Very High |
| Blood pressure, weight, BMI, pain scores | `vitals` | Any authenticated user | High |
| AI clinical analysis and diagnoses | `smart_triage_results` | Any authenticated user | High |
| Drug interaction alerts | `medication_interaction_log` | Any authenticated user | High |
| Patient PII (DOB, phone, email, SSN) | `patients` | Unencrypted at app layer | High |
| Clinical notes (SOAP, treatment plans) | `clinical_notes` | Cross-org delete possible | High |
| Billing records | `billing` | No audit trail | Medium |

---

## 5. Health Scores by Category

### Scoring Methodology
Each category scored 0-100 based on findings severity and density. Deductions: Critical = -15, High = -8, Medium = -4, Low = -2. Bonuses for positive controls observed.

---

### Security: 32/100 (F)

**Deductions:** 5 critical findings (secrets, RLS, auth bypass, role escalation, open redirect), 8 high findings (demo mode, lockout, CSP, session timeout, MFA gaps)
**Positives:** MFA enforcement for admin roles, CSRF protection, security headers, intrusion detection, PHI-safe logging utility, file upload security, rate limiting infrastructure
**Key Gap:** Foundational access control is broken. RLS policies, auth validation, and role enforcement all have critical bypass paths.

---

### Architecture: 52/100 (D)

**Deductions:** Cross-org isolation failures, client-side session enforcement, 3 competing audit systems, 3 validation frameworks, 3 safe-logger implementations, inconsistent demo mode, browser client used for server operations
**Positives:** Centralized `withAuth` wrapper, clean Next.js App Router structure, Zod schema infrastructure, PHI encryption infrastructure (even if not applied), clear service role client separation, request deduplication utility
**Key Gap:** Good architectural intent undermined by duplication and inconsistent implementation. Multiple systems exist for the same concern with no canonical choice.

---

### Performance: 58/100 (D+)

**Deductions:** Full table scan in patient search, missing pagination on billing/appointments, sequential queries on dashboard, N+1 patterns, unbounded in-memory stores, redundant Supabase client creation, `force-dynamic` blanket, no streaming for AI chat
**Positives:** Pagination on patients/notes, parallel loading in `getPatientById`, batch claim processing with concurrency control, performance indexes migration, image optimization, package import optimization, async audit logging, streaming AI methods exist (unused)
**Key Gap:** Core query patterns (search, listing) will degrade significantly at production scale. Patient search is the worst offender.

---

### Quality (Testing): 25/100 (F)

**Deductions:** Zero API route tests, only 7 test files for 60+ routes and 50+ modules, no integration tests for cross-org isolation, no e2e test for note signing, no encryption roundtrip test, no billing test coverage, ESLint set to continue-on-error in CI
**Positives:** Existing tests cover validation schemas, CSRF, safe-logger, encryption, intrusion detection, sanitization. 6 e2e Playwright specs exist.
**Key Gap:** The most critical code paths (auth, patient CRUD, billing, note signing) have zero automated verification. Regressions will go undetected.

---

### Readability: 62/100 (C-)

**Deductions:** Duplicate ERA parsers, pervasive `any` types, dollars-vs-cents inconsistency, dead code in switch statement, 580-line AI service with inline demo data, duplicate validation modules, inconsistent logging, magic numbers in billing, misleading function signatures
**Positives:** Clean `withAuth` pattern, well-organized Zod schemas, good file structure following Next.js conventions, clear comments in auth code, well-documented security headers
**Key Gap:** Managed billing module is the weakest area. Duplicate parsers, magic numbers, and `any` types make it hard to maintain correctly.

---

### Tech Debt: 42/100 (D-)

**Deductions:** Hardcoded credentials, 3 competing audit systems (5.5 dev-days), 3 validation frameworks (2 dev-days), 3 safe-loggers (1 dev-day), duplicate types, ghost imports, stub SFTP adapter, legacy encryption shim, 116 `any` usages, no Prettier, test-ai page in production
**Positives:** Evidence of active remediation (SEC-, CODEX-, INTEGRITY- prefixed fixes), migration infrastructure exists, debt ratio ~15-20%
**Key Gap:** Rapid security remediation passes created new duplication debt. 22-30 dev-days of estimated total debt.
**Overall Debt Score:** 72/100 (where 100 = debt-free)

---

### API Design: 60/100 (D+)

**Deductions:** 5 endpoints missing Zod validation, missing pagination on 2 endpoints, over-fetching PHI in list views, missing org scoping on 3 endpoints, feature check fails open, inconsistent error response shapes, rate limit key bypass via UUID rotation
**Positives:** Consistent `withAuth` wrapper pattern, Zod validation on most endpoints, comprehensive HIPAA audit logging on core routes, safe error handling with `sanitizeError()`, organization isolation on most endpoints, note signing race condition prevention, robust file upload security
**Key Gap:** Newer endpoints (managed billing, vitals, screenings, encounter tracking) were not built with the same rigor as core endpoints.

---

### Summary Health Dashboard

| Category | Score | Grade | Trend |
|----------|:-----:|:-----:|:-----:|
| Security | 32 | F | Needs immediate work |
| Quality (Testing) | 25 | F | Needs immediate work |
| Tech Debt | 42 | D- | Accumulating |
| Architecture | 52 | D | Needs consolidation |
| Performance | 58 | D+ | Will degrade at scale |
| API Design | 60 | D+ | Inconsistent |
| Readability | 62 | C- | Manageable |
| **Overall** | **47** | **D** | **Not production-ready** |

---

## Appendix: Findings by Agent

| Agent | Critical | High | Medium | Low | Total |
|-------|:--------:|:----:|:------:|:---:|:-----:|
| Security Auditor | 5 | 8 | 6 | 4 | 23 |
| Architect | 3 | 7 | 6 | 5 | 21 |
| API Designer | 4 | 6 | 8 | 5 | 23 |
| Performance Engineer | 3 | 7 | 8 | 5 | 23 |
| QA Purist | 6 | 12 | 14 | 10 | 42 |
| Junior Dev Advocate | 2 | 6 | 9 | 4 | 21 |
| Readability Advocate | 1 | 4 | 9 | 7 | 21 |
| Tech Debt Accountant | 2 | 9 | 12 | 3 | 26 |

---

*Master report synthesized from 8 independent agent reviews on 2026-03-18.*
