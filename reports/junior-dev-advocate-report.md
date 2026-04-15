# Junior Developer Advocate Review: ChartSpark EHR

**Reviewer**: Junior Developer Advocate
**Date**: 2026-03-18
**Branch**: `pre-production-audit`
**Overall Onboarding Difficulty**: **D+ (Difficult)**

---

## Executive Summary

ChartSpark is a psychiatric EHR built on Next.js 16 + Supabase + Azure OpenAI handling HIPAA-sensitive mental health records. While the codebase has solid security foundations (encryption, audit logging, fail-closed patterns), it presents significant barriers for junior developers. The README is a stock `create-next-app` template with zero project-specific guidance. There are duplicate type definitions, committed credential files on disk, a stub audit logger in the data layer, and complex multi-layered abstractions that require deep tribal knowledge to navigate safely.

A junior developer contributing to this codebase has a high likelihood of accidentally introducing a HIPAA violation, breaking the security architecture, or spending days just understanding how the pieces connect.

---

## Junior-Friendliness Scores by Area

| Area | Grade | Notes |
|------|-------|-------|
| Onboarding & Setup | **F** | Stock README, no `.env.example`, no getting-started guide |
| Project Structure | **C** | Logical Next.js App Router layout, but deep nesting and duplicate type files |
| Type Safety | **C-** | Good Zod validation schemas, but duplicate type definitions and `any` casts |
| Security Architecture | **B-** | Strong patterns, but terrifying for juniors to modify; one wrong move = HIPAA violation |
| API Layer | **B** | Consistent `withAuth` pattern, Zod validation, audit logging |
| Data Layer | **C** | Well-organized but has a stub audit logger that silently drops audit events |
| Testing | **D** | Minimal test coverage; only 3 unit test files and 6 e2e specs |
| Documentation | **D-** | API docs exist but are incomplete/outdated; no architecture docs |
| Billing/Subscriptions | **C-** | Complex multi-system integration with in-memory caches and race conditions |
| AI Integration | **B-** | Clean singleton pattern with demo fallbacks; but `any` return types throughout |

---

## Findings

### 1. CRITICAL: Real Credentials Exist on Disk in `.env.local`

- **Severity**: Critical
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\.env.local` (lines 1-38)
- **Description**: The `.env.local` file contains real Supabase service role keys, Azure OpenAI API keys, Upstash Redis tokens, a Vercel OIDC token, a Daily.co API key, a Resend API key, a CRON_SECRET, and a PHI encryption key. While `.env*` is in `.gitignore`, these files exist on disk alongside `.env.vercel` and `.env.vercel.production`.
- **What a junior dev might do wrong**: Copy the repo to a new machine, share the workspace, or accidentally commit `.env.local` if they modify `.gitignore`. Any of these expose production credentials including the `SUPABASE_SERVICE_ROLE_KEY` which bypasses all Row Level Security.
- **Suggested improvement**:
  - Remove all real `.env.*` files from the workspace.
  - Create a `.env.example` file with placeholder values and comments.
  - Add a pre-commit hook that rejects any `.env*` files with non-placeholder values.
  - Document credential rotation procedures.

---

### 2. CRITICAL: Stock README With Zero Project-Specific Documentation

- **Severity**: Critical
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\README.md` (lines 1-37)
- **Description**: The README is the default Next.js `create-next-app` template. It says "run `npm run dev`" but provides zero information about: what ChartSpark is, the Supabase database setup required, environment variables needed, database migrations, the role system, HIPAA compliance requirements, or how to contribute safely.
- **What a junior dev might do wrong**: Run `npm run dev` and hit immediate crashes because they have no Supabase instance, no env vars, and no idea what this app does. They would have no idea about HIPAA obligations.
- **Suggested improvement**: Write a comprehensive README covering:
  - What ChartSpark is and the HIPAA context
  - Prerequisites (Node 20+, Supabase account, Azure OpenAI optional)
  - Step-by-step local setup with `.env.example`
  - Database migration instructions (`supabase/migrations/`)
  - Architecture overview with a diagram
  - "HIPAA rules for developers" section
  - Link to `PRODUCTION_CHECKLIST.md` and `docs/API_REFERENCE.md`

---

### 3. HIGH: Duplicate Type Definitions Across Two Files

- **Severity**: High
- **Files**:
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\types\database.ts`
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\types\database.ts`
- **Description**: There are two `database.ts` type files with overlapping but divergent definitions. For example, `src/types/database.ts` defines `Role` as `'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'AUDITOR'` (4 roles), while `src/lib/types/database.ts` defines `User.role` as `'USER' | 'ADMIN' | 'SUPER_ADMIN'` (3 roles, missing `AUDITOR`). The `Patient` interface has different fields and `status` enums (`'active' | 'inactive' | 'pending'` vs `'active' | 'inactive' | 'archived'`). The `Note` interface has completely different shapes.
- **What a junior dev might do wrong**: Import from the wrong file, use the wrong `Patient.status` values, miss the `AUDITOR` role, or try to update `Note` fields that don't exist in the actual DB schema.
- **Suggested improvement**: Consolidate into a single `src/types/database.ts` as the source of truth. Delete the duplicate file. Add a comment at the top explaining which types match which Supabase tables.

---

### 4. HIGH: Data Layer Audit Logger Is a Stub That Drops Events

- **Severity**: High
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\data\utils.ts` (lines 267-277)
- **Description**: The `createAuditLog()` function in the data layer is a stub that only logs to console in development. It has a `TODO: Implement actual audit log insertion` comment. Meanwhile, the API routes use a completely different `logAuditEvent()` from `src/lib/security/audit-log.ts` that actually writes to the database. The data layer functions (`getPatients`, `createPatient`, etc.) call the stub, meaning patient CRUD operations through the data layer are NOT being audit-logged in production.
- **What a junior dev might do wrong**: Assume audit logging is working because they see `createAuditLog()` calls in the data layer. They would not realize they need to use the separate `logAuditEvent()` / `logPHIAccess()` from the security module. This is a HIPAA compliance gap.
- **Suggested improvement**: Either implement `createAuditLog()` to call through to `logAuditEvent()`, or replace all data layer calls with the real audit logger. Add a clear comment in both files about which audit logger is authoritative.

---

### 5. HIGH: Patient PATCH Endpoint Passes Raw Client Data to Database

- **Severity**: High
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\app\api\patients\[id]\route.ts` (lines 52-71)
- **Description**: The `handlePatch` function reads `const updates = await context.request.json()` and passes it directly to `updatePatient(id, orgId, updates)` without Zod validation. While the `POST` endpoint uses `PatientCreateSchema`, the `PATCH` endpoint has no input validation. The `updatePatient()` function in the data layer also passes the input directly to `supabase.from('patients').update(input)`.
- **What a junior dev might do wrong**: A junior dev might think this is safe because "Supabase has RLS." But an attacker could send `{ "organization_id": "other-org-id" }` to reassign a patient to a different org, or send arbitrary columns that get silently dropped or cause DB errors.
- **Suggested improvement**: Add `PatientUpdateSchema` validation (it already exists in `schemas.ts` as `PatientCreateSchema.partial()`) to the PATCH handler. Explicitly whitelist fields that can be updated.

---

### 6. HIGH: `null as unknown as Type` Pattern Hides Runtime Crashes

- **Severity**: High
- **Files**:
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\supabase\server.ts` (line 33)
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\supabase\client.ts` (line 34)
- **Description**: In demo mode, the Supabase client factories return `null as unknown as SupabaseClient`. This means any code calling `.from()`, `.auth`, etc. will get a null pointer exception at runtime. The comments say "TODO: Gradually update all callers to handle null explicitly" but this has not been done.
- **What a junior dev might do wrong**: Write perfectly valid TypeScript that type-checks fine but crashes at runtime in demo mode because the Supabase client is secretly null. They would spend hours debugging "Cannot read properties of null".
- **Suggested improvement**: Return a proper mock client for demo mode that returns empty results, or make the return type `SupabaseClient | null` and fix all callers.

---

### 7. HIGH: No `.env.example` File

- **Severity**: High
- **Description**: There is no `.env.example` or `.env.template` file anywhere in the repo. The only way to discover required environment variables is to read through multiple source files (`encryption.ts`, `server.ts`, `service-role-client.ts`, `rate-limit.ts`, `safeAzureOpenAI.ts`, `csrf.ts`, `stripe-client.ts`) or find the `PRODUCTION_CHECKLIST.md`.
- **What a junior dev might do wrong**: Miss a required env var and get cryptic runtime errors. Or worse, run with `NEXT_PUBLIC_DEMO_MODE=true` in what they think is a test but is actually hitting real infrastructure.
- **Suggested improvement**: Create `.env.example` with all required variables, grouped by service, with comments explaining each one.

---

### 8. MEDIUM: Two Completely Different Audit Logging Systems

- **Severity**: Medium
- **Files**:
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\security\audit-log.ts` (real, writes to DB)
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\data\utils.ts` (stub, console-only)
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib/audit/audit-service.ts` (third audit file)
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\managed-billing\audit-logger.ts` (billing-specific)
- **Description**: There are at least 4 different audit logging implementations. A junior developer has no way to know which one to use for a new feature. The data layer's `AuditLogEntry` interface is different from the security module's `AuditLogEntry` interface (different field names like `event_type` vs `eventType`).
- **What a junior dev might do wrong**: Use the stub audit logger for a new PHI-accessing feature, creating a HIPAA compliance gap. Or create yet another audit logger.
- **Suggested improvement**: Consolidate into a single audit service. Create a `CONTRIBUTING.md` that explicitly states "always use `logAuditEvent()` from `src/lib/security/audit-log.ts`."

---

### 9. MEDIUM: `any` Types Throughout AI Service

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\services\safeAzureOpenAI.ts`
- **Description**: The `SafeAzureOpenAIService` class uses `any` return types extensively: `diagnose()` returns `Promise<any>`, `generateTreatmentPlan()` returns `Promise<any>`, `normalizeDiagnosisResponse()` takes `any` and returns `any`. The `getDemoSOAPNote()` takes `any` for session data. This means the response shape from AI calls is completely untyped.
- **What a junior dev might do wrong**: Access a property that doesn't exist on the AI response and not discover until runtime. Or change the AI prompt format and break consumers without any type errors.
- **Suggested improvement**: Define response interfaces like `DiagnosisResult`, `TreatmentPlanResult`, `SOAPNoteResult` and use them as return types.

---

### 10. MEDIUM: Inconsistent Error Response Patterns

- **Severity**: Medium
- **Files**: Multiple API route files
- **Description**: Error responses use inconsistent shapes. Some return `{ error: 'message' }`, others return `{ error: 'message', details: [...] }`, and the billing route returns `{ error: 'message', existing_invoice: '...' }`. Status codes are inconsistent too -- some return 404 for authorization failures (patient cross-org access), others return 403.
- **What a junior dev might do wrong**: Follow one API route's pattern when writing a new endpoint and create an inconsistent error format. Frontend code would need different error handling per endpoint.
- **Suggested improvement**: Create a standard error response factory: `createErrorResponse(message, status, details?)` that returns a consistent shape. Document the error contract.

---

### 11. MEDIUM: Complex `withAuth` Higher-Order Function With Implicit Behaviors

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\auth\api-auth.ts` (lines 87-196)
- **Description**: The `withAuth` HOF does authentication, CSRF validation, role checking, MFA enforcement, organization checking, and feature gating -- all in one function. The behavior depends on which options are passed, and the type signature uses generics with type assertions (`as T`). The `routeContext?.params` is a `Promise` that needs to be awaited, which is a Next.js 15+ change that is easy to miss.
- **What a junior dev might do wrong**: Forget to pass `requireOrganization: true` and accidentally create an endpoint accessible to users without an organization. Or not realize CSRF is automatically checked for POST/PUT/PATCH/DELETE but not GET.
- **Suggested improvement**: Add JSDoc with examples for each option. Create a cheat sheet showing common endpoint patterns:
  ```
  // Public data read: withAuth(handler)
  // Org-scoped: withAuth(handler, { requireOrganization: true })
  // Admin-only: withAuth(handler, { requiredRole: ['ADMIN', 'SUPER_ADMIN'] })
  // Feature-gated: withAuth(handler, { requiredFeature: 'TELEHEALTH' })
  ```

---

### 12. MEDIUM: Patient Search Fetches ALL Patients Then Filters Client-Side

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\data\patients.ts` (lines 185-266)
- **Description**: `searchPatients()` fetches ALL patients for an organization from Supabase, then filters in JavaScript. The comment says "This is more reliable than complex .or() filters which can fail on missing columns." For organizations with thousands of patients, this pulls all records into server memory.
- **What a junior dev might do wrong**: Not realize this is a performance problem until production data grows. Or try to add more search fields by copying this pattern, making it worse.
- **Suggested improvement**: Implement a Supabase full-text search using `ts_vector` columns, or at minimum use `ilike` filters server-side. Add a comment explaining the performance implications and when this pattern should NOT be used.

---

### 13. MEDIUM: Webhook Idempotency Uses In-Memory Store

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\app\api\subscriptions\webhook\route.ts` (lines 15-27)
- **Description**: The Stripe webhook handler uses an in-memory `Map` for idempotency checking. The comment says "use Redis in production for multi-instance deployments." On Vercel (serverless), each function invocation gets a fresh memory space, so this map is always empty and provides zero duplicate protection.
- **What a junior dev might do wrong**: Trust that duplicate webhook events are handled because the code looks like it does. In reality, every webhook event is processed as new on Vercel.
- **Suggested improvement**: Use Supabase to store processed event IDs, or use the existing Upstash Redis. Add a warning log if running on Vercel without Redis.

---

### 14. MEDIUM: Subscription Cache Is In-Memory (Useless on Serverless)

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\subscriptions\subscription-service.ts` (lines 13-43)
- **Description**: `subscriptionCache` is a `Map<string, CacheEntry>` with 5-minute TTL. On Vercel serverless, this cache is created fresh per invocation, so it never has a cache hit.
- **What a junior dev might do wrong**: Rely on the cache for performance or consistency and not understand why subscription status is always fetched from the DB.
- **Suggested improvement**: Use Upstash Redis for caching, or document that this cache only helps in long-running processes (not serverless). Consider using `unstable_cache` from Next.js.

---

### 15. MEDIUM: NoteCreateSchema vs Actual DB Columns Mismatch

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\validation\schemas.ts` (lines 82-114)
- **Description**: `NoteCreateSchema` includes fields like `type`, `is_signed`, `is_locked`, `chief_complaint` that, according to the comment on `NoteUpdateSchema` (line 100-102), "do NOT exist as DB columns and MUST NOT be sent in PATCH updates (Supabase will reject them)." But `NoteCreateSchema` still allows them, and the notes POST handler uses `validatedData.is_signed` to set status (line 122 of notes route).
- **What a junior dev might do wrong**: Use `NoteCreateSchema` fields in an update operation and get mysterious Supabase errors. Or trust that all schema fields map to DB columns.
- **Suggested improvement**: Split schemas clearly into `NoteAPISchema` (what the API accepts) and `NoteDBInsertSchema` (what goes to the database). Add comments on each field indicating whether it maps to a DB column.

---

### 16. MEDIUM: Intrusion Detection Safelist Could Block Legitimate API Usage

- **Severity**: Medium
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\middleware.ts` (lines 16-29)
- **Description**: The middleware safelists certain API paths to avoid false positives from the IDS. Any new API route that contains words like "create", "select", "update", "delete", "drop", or "insert" in its path or query parameters will be flagged as SQL injection and blocked with a 403.
- **What a junior dev might do wrong**: Create a new API route like `/api/templates/create` and spend hours debugging why it returns 403. The IDS regex `/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i` matches the word "create" in URLs.
- **Suggested improvement**: Document the IDS safelist prominently. Add a dev-mode bypass. Consider only running IDS on request bodies and query parameters, not on the URL path itself.

---

### 17. LOW: CSRF Protection Blocks API Testing in Development

- **Severity**: Low
- **File**: `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\security\csrf.ts` (lines 19-28)
- **Description**: POST/PUT/PATCH/DELETE requests without an `Origin` or `Referer` header are blocked. This breaks Postman, curl, and REST client testing. The workaround requires setting `ALLOW_DIRECT_API_CALLS=true`, but this env var is only mentioned in a console warning that the junior dev would need to trigger first.
- **What a junior dev might do wrong**: Try to test an API endpoint with Postman, get a 403 "Invalid request origin", and have no idea why.
- **Suggested improvement**: Document this in the README/CONTRIBUTING guide. Include `ALLOW_DIRECT_API_CALLS=true` in the `.env.example`.

---

### 18. LOW: Multiple `safeLogger` Implementations

- **Severity**: Low
- **Files**:
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\logging\safe-logger.ts` (primary)
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\utils\safe-logger.ts` (duplicate?)
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\src\lib\data\utils.ts` (inline safeLogger)
- **Description**: There are at least three implementations of "safe logging" in the codebase. Some files import from `@/lib/logging/safe-logger`, others use the inline `safeLogger` from `@/lib/data/utils`.
- **What a junior dev might do wrong**: Pick the wrong logger and either miss PHI sanitization or log inconsistently.
- **Suggested improvement**: Consolidate to one logger module and re-export from a single location.

---

### 19. LOW: Demo Mode Behavior Is Inconsistent

- **Severity**: Low
- **Multiple files**
- **Description**: Demo mode detection logic varies across files. `server.ts` checks `NODE_ENV !== 'production' && NEXT_PUBLIC_DEMO_MODE === 'true'`, while `service-role-client.ts` checks the same but returns `null` (not `null as unknown as Type`). `useFeature.ts` enables all features if supabase is null. The `.env.local` has `NEXT_PUBLIC_DEMO_MODE=false` but `NEXT_PUBLIC_APP_ENV=production` -- a confusing combination for local development.
- **What a junior dev might do wrong**: Not understand when they're in demo mode vs. production mode. Features behave differently depending on which null-check pattern was used.
- **Suggested improvement**: Create a single `isDemoMode()` utility and use it everywhere. Document the expected local dev configuration clearly.

---

### 20. LOW: Test Files at Root Level

- **Severity**: Low
- **Files**:
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\test-delete.js`
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\test-login.js`
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\test-rls.js`
  - `C:\Users\joman\OneDrive\Desktop\ChartSparkOG\verify-billing.ts`
- **Description**: There are ad-hoc test files at the project root that appear to be manual debugging scripts. These are not part of the vitest or playwright test suites.
- **What a junior dev might do wrong**: Run these scripts thinking they are official tests, potentially hitting production Supabase with test operations.
- **Suggested improvement**: Move to a `scripts/` directory, add safety guards (check for non-production env), or delete if no longer needed.

---

### 21. LOW: No CONTRIBUTING.md or Architecture Guide

- **Severity**: Low
- **Description**: There is no `CONTRIBUTING.md`, no architecture decision records, no "how to add a new API endpoint" guide. The `docs/` folder has billing-specific docs and an incomplete API reference, but nothing explaining the overall system architecture or development workflow.
- **What a junior dev might do wrong**: Follow inconsistent patterns from different parts of the codebase, miss required security steps (audit logging, validation, org scoping), or create endpoints without proper auth.
- **Suggested improvement**: Create:
  - `CONTRIBUTING.md` with the "golden path" for adding features
  - `docs/ARCHITECTURE.md` with system overview, data flow diagram
  - `docs/SECURITY_FOR_DEVELOPERS.md` with HIPAA rules in plain language
  - Checklist template for new API endpoints

---

## Scary Areas (Do Not Touch Without Senior Guidance)

These areas are dangerous for any developer to modify, but especially for juniors:

1. **`src/lib/security/encryption.ts`** -- PHI encryption with legacy format migration. A bug here could make patient data permanently unreadable or expose plaintext PHI.

2. **`src/middleware.ts`** -- The security middleware chain (IDS + rate limiting + session). Breaking this disables all security for the entire application.

3. **`src/app/api/subscriptions/webhook/route.ts`** -- Stripe webhook handler with financial implications. A bug could cause double-billing or loss of subscription status.

4. **`src/lib/supabase/service-role-client.ts`** -- The service role client bypasses all RLS. Misuse or accidental exposure to the client would compromise all data.

5. **`supabase/migrations/`** -- Database migrations are not numbered sequentially, some are named with dates, others with descriptive names. Running them in the wrong order could break the schema.

---

## Top 5 Recommendations for Making This Codebase Junior-Friendly

1. **Write a real README** with setup instructions, architecture overview, and HIPAA context. This alone would cut onboarding time by days.

2. **Create `.env.example`** with all required variables documented. Remove real credentials from the workspace.

3. **Consolidate duplicate type definitions** into a single `src/types/database.ts` that is the source of truth, and delete `src/lib/types/database.ts`.

4. **Fix the stub audit logger** in `src/lib/data/utils.ts` so it actually writes to the audit log table. This is a HIPAA compliance gap.

5. **Add a "New Feature Checklist"** that covers: Zod validation, `withAuth` wrapper, audit logging, org scoping, PHI handling, and test requirements.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Critical findings | 2 |
| High findings | 6 |
| Medium findings | 9 |
| Low findings | 4 |
| Total findings | 21 |
| Source files reviewed | 40+ |
| API routes | 35+ |
| Test files | ~9 (3 unit + 6 e2e) |
| Migration files | 15+ (inconsistently named) |
| Duplicate type files | 2 |
| Audit logging implementations | 4 |
| Safe logger implementations | 3 |
