# ChartSpark EHR - Comprehensive Security Audit Report

**Date:** 2026-03-15
**Scope:** Full codebase audit (97 pages, 55 API routes, 18 SQL migrations, 75 lib files)
**Status:** READ-ONLY AUDIT - No fixes applied

---

## Executive Summary

ChartSpark demonstrates **strong security fundamentals**: centralized `withAuth` middleware, RLS policies, PHI encryption, audit logging, rate limiting, CSRF protection, and MFA enforcement. However, **4 CRITICAL**, **7 HIGH**, and **9 MEDIUM** severity issues were identified that must be remediated before production go-live with real patient data.

| Severity | Count | Key Theme |
|----------|-------|-----------|
| CRITICAL | 4 | Unprotected admin endpoint, field injection, missing org boundaries, PHI in console |
| HIGH | 7 | Missing input validation, org isolation gaps, service key in git, SELECT * patterns |
| MEDIUM | 9 | Demo mode risks, race conditions, file validation, rate limit tuning |
| LOW | 4 | Minor auth patterns, CSRF enhancements |

---

## 1. AUTH / SESSION & SUPABASE SSR

### 1.1 Middleware Protection (`src/middleware.ts`)

**Status: STRONG** - Comprehensive route protection with role-based access control.

**Protected route groups:**
- `/super-admin` -> SUPER_ADMIN only
- `/admin` -> SUPER_ADMIN, ADMIN
- `/auditor` -> SUPER_ADMIN, AUDITOR
- `/dashboard`, `/patients`, `/encounters`, `/notes`, `/templates`, `/references`, `/submissions`, `/settings` -> All authenticated roles
- `/billing` -> SUPER_ADMIN, ADMIN, USER

**Additional security layers in middleware:**
- Rate limiting via Upstash Redis
- SQL injection / XSS / path traversal detection
- API route safelisting
- MFA enforcement for privileged roles (SUPER_ADMIN, ADMIN, AUDITOR)

### 1.2 Supabase Client Instantiation

**Status: EXCELLENT** - Correct separation of concerns.

| File | Pattern | Usage | Status |
|------|---------|-------|--------|
| `lib/supabase/server.ts` | `createServerClient()` from `@supabase/ssr` | Server components, API routes | CORRECT |
| `lib/supabase/client.ts` | `createBrowserClient()` from `@supabase/ssr` | Client components | CORRECT |
| `lib/supabase/service-role-client.ts` | `createClient()` with service role key | Privileged server ops | CORRECT |
| `lib/supabase/middleware.ts` | `createServerClient()` | Middleware session refresh | CORRECT |

- No deprecated patterns (`supabase.auth.session()`) found
- `autoRefreshToken: false, persistSession: false` correctly set on service role client

### 1.3 Findings

#### CRITICAL-1: `/api/admin/system-health` is completely unprotected
- **File:** `src/app/api/admin/system-health/route.ts:23`
- **Issue:** `export async function GET(req)` - NO `withAuth` wrapper, NO auth check
- **Exposure:** Active session count, database status, Azure OpenAI endpoint info, recent audit log events
- **Impact:** Information disclosure enabling reconnaissance; violates HIPAA minimum necessary principle

#### HIGH-1: App layout `(app)/layout.tsx` lacks server-side auth guard
- **File:** `src/app/(app)/layout.tsx`
- **Issue:** Unlike `(admin)/admin/layout.tsx` and `auditor/layout.tsx` which verify `getUser()` + role on the server, the main `(app)` layout has NO server-side session check
- **Impact:** All 32+ app pages (dashboard, patients, notes, etc.) are client-only "use client" components relying entirely on middleware + API auth. Violates defense-in-depth.
- **Mitigated by:** Middleware session check + `withAuth` on all API routes

#### MEDIUM-1: Demo mode bypass risk
- **File:** `src/lib/supabase/middleware.ts:119-122`
- **Issue:** `if (isDemoMode && !user) { return supabaseResponse; }` allows unauthenticated access
- **Current control:** `environment.ts` blocks demo mode in `NODE_ENV=production`
- **Risk:** Middleware has a separate raw `NEXT_PUBLIC_DEMO_MODE` check that may not go through `environment.ts` safeguard

#### LOW-1: `DemoAuthGuard` uses `getSession()` without `getUser()` validation
- **File:** `src/components/auth/DemoAuthGuard.tsx:17`
- **Mitigated by:** Middleware + API-level auth

---

## 2. HIPAA / PHI LOGGING & DATA EXPOSURE

### 2.1 Safe Logger & Error Handler

**Status: EXCELLENT** - Well-architected sanitization.

- `lib/logging/safe-logger.ts` - Type-safe `SafeLogData` preventing PHI fields, production-aware log levels
- `lib/utils/error-handler.ts` - Centralized `sanitizePHI()` with regex patterns for SSN, DOB, email, phone
- `lib/security/audit-log.ts` - `sanitizeDetails()` removes 18+ PHI field types from audit payloads
- API routes consistently return generic error messages (e.g., "Patient not found"), never raw DB errors

### 2.2 Findings

#### CRITICAL-2: Clinical transcript logged to browser console
- **File:** `src/app/(app)/notes/new/page.tsx:1338`
- **Code:** `console.log('[Scribe] Transcript:', transcript);`
- **Impact:** Full clinical narrative (SOAP notes, diagnoses, medications) printed to browser DevTools. This is **PHI in plaintext** in the client console. HIPAA violation.
- **Additional lines:** 1330, 1343, 1362, 1383, 1390, 1399, 1404, 1408, 1412, 1422, 1446 - extensive speech recognition debug logging

#### HIGH-2: Telehealth participant names logged to console
- **File:** `src/components/telehealth/DailyVideoCall.tsx:194,199`
- **Code:** `console.log("[Telehealth] Participant joined:", event?.participant?.user_name);`
- **Impact:** Patient/provider names in browser console during telehealth sessions

#### HIGH-3: User email logged in auth warnings
- **File:** `src/lib/auth/api-auth.ts:57,113`
- **Code:** `console.warn('API Auth: Deactivated account attempted API access', user.email);`
- **Code:** `console.warn(\`Unauthorized access attempt: User ${user.email}...\`)`
- **Impact:** Email addresses are quasi-identifiers; server-side log exposure

#### MEDIUM-2: Login page logs email in demo mode
- **File:** `src/app/(auth)/login/page.tsx:77`
- **Code:** `console.log('[LOGIN] Demo mode bypass for:', email);`

#### HIGH-4: `SELECT *` patterns expose excess PHI fields
- **Files:** Multiple data layer and API files
  - `lib/data/patients.ts:128` - `.select('*')` returns all patient columns (SSN, insurance, etc.)
  - `lib/data/notes.ts:32,66,114` - `.select('*')` returns full SOAP narratives
  - `lib/data/encounters.ts:111,169` - `.select('*')`
  - `api/ai/smart-triage/chart-summary/route.ts:72` - Full patient record sent to AI prompt
  - `api/ai/smart-triage/medication-review/route.ts:68-75` - Full patient record stored
  - `api/appointments/[id]/route.ts:14-17` - `patient:patients(*)` returns all patient fields
- **Impact:** Minimum necessary principle violated; any API response or AI prompt includes more PHI than needed

### 2.3 No PHI in localStorage or URL Params

**Status: COMPLIANT**
- localStorage used only for feature packages and demo mode flag (not PHI)
- URL params contain only opaque UUIDs (patient_id, encounter_id), never names or clinical data
- No third-party analytics or tracking scripts found

---

## 3. RLS POLICIES & DATABASE SECURITY

### 3.1 RLS Implementation

**Status: PARTIALLY IMPLEMENTED**

**Confirmed RLS-enabled tables** (from migration files):
- `users` - SELECT/UPDATE policies based on role
- `patients` - READ/WRITE for org members + auditors
- `notes` - READ/WRITE for org members + auditors
- `encounters` - Organization-scoped
- `risk_assessments` - Organization-scoped

**RLS status UNKNOWN/NOT EVIDENT** (not found in any migration):
- `appointments` - **POTENTIALLY UNPROTECTED**
- `patient_documents` - Unknown
- `billing` - Unknown
- `patient_allergies`, `patient_medications`, `patient_problems`, `patient_insurance` - Unknown
- `vitals`, `screenings` - Unknown
- `audit_logs` - Unknown
- `pending_profile_changes` - Unknown

**Historical RLS recursion issue** (now fixed):
- `supabase/fix_rls_policies.sql` and `fix_rls_complete.sql` document an infinite recursion bug where RLS policies called `get_user_role()` which queried `users` table, triggering the same policies
- Fixed with `SECURITY DEFINER` functions (`get_my_role()`, `get_my_organization_id()`)
- Current implementation is safe but pattern is sensitive to modification

### 3.2 Service Role Key Usage

#### CRITICAL-3: Service role key committed to version control
- **Files:** `.env.local:7`, `.env.vercel:7`, `.env.vercel.production:13`
- **Issue:** `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...` visible in git-tracked files
- **Impact:** Anyone with repo access can bypass ALL RLS policies on every table
- **Note:** The key is NOT `NEXT_PUBLIC_*` prefixed (correct) and `createServiceRoleClient()` is server-only (correct), but the secret is in git history permanently

**Legitimate service role usage** (all server-side, appropriate):
- `/api/auth/check-lockout/route.ts` - Pre-auth lockout checks
- `/api/auth/record-attempt/route.ts` - Login attempt recording
- `/api/auth/complete-signup/route.ts` - Initial org setup
- `/api/cron/*` - Background jobs
- `/lib/audit/audit-service.ts` - Audit log writing

### 3.3 Organization Isolation

**Status: INCONSISTENT** - Some routes properly scope, others don't.

| Route | Org Check | Method |
|-------|-----------|--------|
| `/api/patients/[id]` | YES - explicit check + audit log | Line 24-39 |
| `/api/notes/[id]` | YES - explicit check | Line 35 |
| `/api/patients/[id]/documents` | YES - explicit check | Line 127 |
| `/api/appointments/[id]` | **NO** - only `.eq('id', id)` | Lines 14-18, 33, 56-59 |
| `/api/vitals` GET | **NO** - filters by patient_id only | Lines 31-38 |
| `/api/screenings` GET | **NO** - filters by patient_id only | Similar pattern |
| `/api/admin/profile-approvals` | **NO** - can approve cross-org | Lines 22-28 |
| `/api/auditor/batch-action` | **NO** - can act cross-org | Similar pattern |

---

## 4. API ROUTES & SERVER ACTIONS

### 4.1 Authentication Coverage

**55 total API route files:**
- **45 (81.8%)** protected with `withAuth` - auth checked at TOP before any data access
- **6 (10.9%)** pre-auth endpoints (auth/callback, check-lockout, record-attempt, complete-signup, signout) - appropriately unprotected
- **2 (3.6%)** cron endpoints protected by `CRON_SECRET` header
- **1 (1.8%)** Stripe webhook protected by signature validation
- **1 (1.8%)** `/api/admin/system-health` - **COMPLETELY UNPROTECTED** (CRITICAL-1)

### 4.2 Input Validation Coverage

**Zod validation present on:**
- All `/api/ai/*` routes (chat, diagnose, generate-note, recommendations, treatment-plan, validate-codes)
- `/api/patients` POST
- `/api/notes` POST
- `/api/encounters/tracking` POST
- `/api/ehr/*` routes

**Zod validation MISSING on:**

#### CRITICAL-4: Profile approvals - unvalidated `fieldName` allows arbitrary column update
- **File:** `src/app/api/admin/profile-approvals/route.ts:14,22-23`
- **Code:**
  ```typescript
  const { changeId, userId, fieldName, newValue, action } = body;
  const updateData: Record<string, string> = {};
  updateData[fieldName] = newValue;  // fieldName NOT VALIDATED
  await supabase.from('users').update(updateData).eq('id', userId);
  ```
- **Impact:** An admin can update ANY column on the `users` table (role, is_active, organization_id, etc.) by setting `fieldName` to that column name. **Privilege escalation vector.**

#### HIGH-5: Appointments POST - unvalidated body spread into insert
- **File:** `src/app/api/appointments/route.ts:75,79-82`
- **Code:** `await supabase.from('appointments').insert([{ ...appointmentData, organization_id: ... }])`
- **Impact:** Arbitrary fields injected into appointment records

#### HIGH-6: Vitals POST - no schema validation
- **File:** `src/app/api/vitals/route.ts:75-82`
- **Impact:** Invalid vital signs persisted (negative BP, impossible values)

#### HIGH-7: Appointments PATCH - unvalidated updates object
- **File:** `src/app/api/appointments/[id]/route.ts:32`
- **Code:** `await supabase.from('appointments').update(updates).eq('id', id)`
- **Impact:** Can set any field on appointment, including `organization_id`

#### MEDIUM-3: Billing POST - no schema validation
- **File:** `src/app/api/billing/route.ts:27-42`
- **Impact:** Invalid billing amounts (negative, huge values)

#### MEDIUM-4: Telehealth create-room - no input validation
- **File:** `src/app/api/telehealth/create-room/route.ts:11-12`
- **Impact:** Arbitrary patientName passed to Daily.co API

#### MEDIUM-5: Appointment date parameter lacks format validation
- **File:** `src/app/api/appointments/route.ts:20,33-36`
- **Code:** Direct string interpolation: `const startOfDay = \`${date}T00:00:00\``

### 4.3 SQL Injection

**Status: LOW RISK** - All database queries use Supabase's parameterized query builder (`.eq()`, `.like()`, `.gte()`). No raw SQL with string concatenation found in application code.

### 4.4 CSRF Protection

**Status: IMPLEMENTED** via `withAuth` wrapper.
- Origin/Referer header validation on all POST/PATCH/DELETE
- Applied to all 45 `withAuth`-protected routes

### 4.5 Rate Limiting

**Status: IMPLEMENTED but needs tuning for sensitive operations.**

Current configuration (`lib/security/rate-limit.ts`):
- `auth`: 10/min (good)
- `login`: 5/15min (good)
- `ai`: 20/min (good)
- `telehealth`: 50/hour (good)
- **General API: 100/min** (too lenient for note signing, profile approvals, batch actions)

#### MEDIUM-6: No per-endpoint rate limits for high-risk mutations
- Note signing (`/api/notes/[id]/sign`) uses generic 100/min
- Profile approvals (`/api/admin/profile-approvals`) uses generic 100/min
- Batch auditor actions (`/api/auditor/batch-action`) uses generic 100/min

### 4.6 File Upload Security

**Status: WELL IMPLEMENTED** (`lib/security/file-security.ts`)
- 10MB size limit, MIME whitelist, dangerous extension blocking, double-extension detection, path traversal checks, filename sanitization
- Document uploads restricted to PDF, JPEG, PNG, WebP (5MB max)

#### MEDIUM-7: No magic number (file signature) validation
- MIME type from client can be spoofed; only extension + declared type checked

### 4.7 Additional Findings

#### MEDIUM-8: Note signing lacks provider ownership check
- **File:** `src/app/api/notes/[id]/sign/route.ts`
- **Issue:** Any authenticated user in the organization can sign any note
- **Expected:** Only the note's provider (or admin) should sign

#### MEDIUM-9: Note signing potential race condition
- **File:** `src/app/api/notes/[id]/sign/route.ts:63-77`
- **Issue:** fetch-check-update pattern without atomic transaction; concurrent requests could double-sign

#### LOW-2: `/api/test-azure` properly protected
- Uses `withAuth` + double-checks `isSuperAdmin()` - no issue

#### LOW-3: Cron endpoints properly secured
- Both `/api/cron/check-trial-expirations` and `/api/cron/generate-invoices` validate `CRON_SECRET` header

#### LOW-4: Webhook endpoint properly secured
- `/api/subscriptions/webhook` validates Stripe signature with idempotency

---

## Full Findings Summary

| ID | Severity | Category | File | Description |
|----|----------|----------|------|-------------|
| CRITICAL-1 | CRITICAL | Auth | `api/admin/system-health/route.ts:23` | Unprotected endpoint exposes system status + audit logs |
| CRITICAL-2 | CRITICAL | PHI | `app/(app)/notes/new/page.tsx:1338` | Clinical transcript logged to browser console |
| CRITICAL-3 | CRITICAL | Secrets | `.env.local`, `.env.vercel`, `.env.vercel.production` | Service role key in version-controlled files |
| CRITICAL-4 | CRITICAL | Injection | `api/admin/profile-approvals/route.ts:22-23` | Unvalidated `fieldName` allows arbitrary column update on `users` table |
| HIGH-1 | HIGH | Auth | `app/(app)/layout.tsx` | No server-side auth guard on main app layout |
| HIGH-2 | HIGH | PHI | `components/telehealth/DailyVideoCall.tsx:194,199` | Participant names logged to console |
| HIGH-3 | HIGH | PHI | `lib/auth/api-auth.ts:57,113` | User emails logged in auth warnings |
| HIGH-4 | HIGH | PHI | Multiple data layer files | `SELECT *` returns excess PHI fields |
| HIGH-5 | HIGH | Validation | `api/appointments/route.ts:79-82` | Unvalidated body spread into insert |
| HIGH-6 | HIGH | Validation | `api/vitals/route.ts:75-82` | No schema validation on POST |
| HIGH-7 | HIGH | Auth/Validation | `api/appointments/[id]/route.ts:32-33` | Unvalidated PATCH + missing org check |
| MEDIUM-1 | MEDIUM | Auth | `lib/supabase/middleware.ts:119-122` | Demo mode allows unauthenticated access |
| MEDIUM-2 | MEDIUM | PHI | `app/(auth)/login/page.tsx:77` | Email logged in demo mode |
| MEDIUM-3 | MEDIUM | Validation | `api/billing/route.ts:27-42` | No schema validation on POST |
| MEDIUM-4 | MEDIUM | Validation | `api/telehealth/create-room/route.ts:11-12` | No input validation |
| MEDIUM-5 | MEDIUM | Validation | `api/appointments/route.ts:20` | Date param lacks format validation |
| MEDIUM-6 | MEDIUM | Rate Limit | `lib/security/rate-limit.ts` | Generic limit on sensitive mutations |
| MEDIUM-7 | MEDIUM | File Upload | `api/patients/[id]/documents/route.ts` | No magic number validation |
| MEDIUM-8 | MEDIUM | Auth | `api/notes/[id]/sign/route.ts` | Any org user can sign any note |
| MEDIUM-9 | MEDIUM | Race | `api/notes/[id]/sign/route.ts:63-77` | Non-atomic sign operation |
| LOW-1 | LOW | Auth | `components/auth/DemoAuthGuard.tsx:17` | `getSession()` without `getUser()` |
| LOW-2 | LOW | Auth | `api/admin/profile-approvals/route.ts` | Missing cross-org check on approvals |
| LOW-3 | LOW | Auth | `api/auditor/batch-action/route.ts` | Missing cross-org check on batch actions |
| LOW-4 | LOW | CSRF | `lib/security/csrf.ts` | Origin-only check (no token validation) |

---

## Remediation Priority

### Immediate (Before Production)
1. **CRITICAL-1:** Add `withAuth({ requiredRole: ['SUPER_ADMIN'] })` to `/api/admin/system-health`
2. **CRITICAL-2:** Remove all `console.log` statements in speech recognition / scribe code
3. **CRITICAL-3:** Rotate service role key, remove from `.env` files, use deployment secrets only
4. **CRITICAL-4:** Add field whitelist to profile approvals: `['first_name', 'last_name', 'specialty', 'phone', 'license_number']`

### High Priority (Sprint 1)
5. Add Zod schemas to appointments, vitals, billing, telehealth POST/PATCH endpoints
6. Add org isolation check to `/api/appointments/[id]` (GET/PATCH/DELETE)
7. Replace `SELECT *` with explicit column lists in data layer
8. Remove email/name logging from auth warnings and telehealth

### Medium Priority (Sprint 2)
9. Add server-side auth check to `(app)/layout.tsx`
10. Add per-endpoint rate limits for note signing, approvals, batch actions
11. Add provider ownership check for note signing
12. Add magic number validation to file uploads
13. Enable and verify RLS on all tables (appointments, billing, documents, vitals, etc.)

---

*Generated by security audit - 2026-03-15*
