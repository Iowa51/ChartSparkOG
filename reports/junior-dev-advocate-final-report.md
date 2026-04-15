# Junior Dev Advocate Final Report

**Date:** 2026-03-19
**Scope:** Full codebase review from the perspective of a new hire's first day
**Focus:** Auth footguns, PHI exposure risks, confusing patterns, missing guardrails

---

## Executive Summary

ChartSpark has made significant security investments across Sprint 1-3 fixes. The `withAuth` wrapper, Zod validation, and audit logging are consistently applied across most endpoints. However, the codebase still contains several patterns that a junior developer could easily misuse, leading to HIPAA violations. The most dangerous issues are: (1) inconsistent `requireMFA` enforcement across routes, (2) a screenings API that queries PHI without organization-scoping, (3) the `.env.local` file containing real production secrets sitting in the repo directory (not git-tracked, but present on disk), and (4) the `DemoAuthGuard` using the deprecated `getSession()` instead of `getUser()`.

**Risk Rating:** HIGH -- Several findings require immediate attention before production deployment.

---

## Critical Footguns (Could Cause HIPAA Violation)

### CRIT-1: Screenings API Missing Organization Scope on GET Query

**File:** `src/app/api/screenings/route.ts`, lines 32-41
**Impact:** Cross-organization PHI leakage

The `handleGet` function queries `screening_scores` without filtering by `organization_id`. A user in Organization A could read screening scores for patients in Organization B by supplying a `patient_id` from that org.

Compare to the vitals route (`src/app/api/vitals/route.ts`, line 58) which correctly includes `.eq('organization_id', context.user.organizationId)`.

The POST handler at line 112 *does* set `organization_id` on insert, but the GET handler relies entirely on RLS, which may or may not be configured for this table.

**Footgun:** A junior dev copying the screenings GET pattern for a new endpoint would create the same vulnerability.

### CRIT-2: Inconsistent MFA Enforcement Creates a "Guess Which Routes Are Safe" Problem

**Files:** All API route files under `src/app/api/`
**Impact:** Privileged access without MFA, violating HIPAA requirements

The `withAuth` wrapper supports `requireMFA: true`, but enforcement is inconsistent:

| Route | Has `requireMFA` | Accesses PHI |
|---|---|---|
| `/api/patients/*` | YES | YES |
| `/api/notes/*` | YES | YES |
| `/api/billing/*` | YES | YES |
| `/api/vitals/*` | YES | YES |
| `/api/screenings/*` | YES | YES |
| `/api/appointments/*` | **NO** | YES |
| `/api/appointments/[id]/*` | **NO** | YES |
| `/api/dashboard/stats` | **NO** | YES (counts) |
| `/api/encounters/tracking` | **NO** | YES |
| `/api/ehr/audit-log` | **NO** | YES (user names) |
| `/api/ehr/consent` | **NO** on GET | YES |
| `/api/ehr/configurations` | **NO** on GET | YES |
| `/api/notes/[id]/sign` | YES | YES |
| `/api/subscriptions/status` | **NO** | NO |
| `/api/subscriptions/check-feature` | **NO** | NO |
| `/api/subscriptions/create-checkout` | **NO** | NO |
| `/api/risk-assessments` | **NO** | YES |

**Footgun:** A junior dev adding a new endpoint will look at existing routes for patterns. If they model their new PHI endpoint after `/api/appointments/route.ts`, they will skip MFA. There is no lint rule or code comment that says "all PHI endpoints MUST include `requireMFA: true`."

### CRIT-3: `DemoAuthGuard` Uses Deprecated `getSession()` Instead of `getUser()`

**File:** `src/components/auth/DemoAuthGuard.tsx`, line 17
**Impact:** Client-side auth guard can be bypassed with a forged JWT

Supabase's `getSession()` reads the session from local storage without server verification. The [Supabase docs explicitly warn](https://supabase.com/docs/guides/auth/sessions) that `getSession()` should never be used for authorization -- only `getUser()` validates the JWT with the server.

While this component is a UI guard (not the API-level protection), it controls access to the entire `(admin)` layout. A forged/expired JWT in local storage would bypass this guard and render admin UI content client-side, even if API calls subsequently fail.

**Footgun:** A junior dev looking at this component might think `getSession()` is the correct way to check authentication everywhere.

### CRIT-4: Real Production Secrets in `.env.local` on Disk

**File:** `.env.local` (present in project directory, not tracked in git)
**Impact:** Secret leakage if `.gitignore` is modified or if the file is accidentally committed

The `.env.local` file contains:
- A real Supabase service role key (line 4)
- A real Azure OpenAI API key (line 8)
- A real Upstash Redis token (line 7)
- A real PHI encryption key (line 35)
- A real CRON secret (line 31)
- A real Resend API key (line 32)

While `.gitignore` correctly excludes this file, the `.gitignore` pattern is fragile:
```
.env*          # Line 34 - general pattern
.env.local     # Line 45 - specific override
```

The general `.env*` on line 34 would already catch `.env.local`, but lines 45-47 redundantly list specific files. If someone "cleans up" the gitignore and removes the general pattern, the specific patterns would need to remain.

More critically: `.env.vercel` and `.env.vercel.production` are also listed in the directory but appear to not be tracked (good). However, their presence on disk alongside the `.gitignore` is a constant risk.

**Footgun:** A junior dev running `git add .` or `git add -A` combined with a gitignore change could commit these secrets.

---

## High Risk Areas

### HIGH-1: Middleware Skips Auth for ALL API Routes

**File:** `src/middleware.ts`, lines 13-58
**Impact:** API routes rely entirely on their own `withAuth` wrappers; no defense-in-depth

The main middleware applies `updateSession()` (auth checking, role checking, MFA enforcement) only to non-API routes (line 62). API routes (`/api/*`) only get rate limiting and IDS checks, then `NextResponse.next()` at line 58.

This means if a developer creates a new API route and forgets to use `withAuth`, it will be **completely unauthenticated**. The middleware will not catch this.

Currently, the cron and webhook routes intentionally bypass `withAuth` (using their own secret validation), so you cannot simply add blanket auth. But there is no automated check that every API route uses `withAuth`.

**Footgun:** A junior dev creates `/api/reports/export` and exports it as a plain `async function GET()` without `withAuth` -- it's now a public, unauthenticated endpoint serving PHI.

### HIGH-2: `updatePatient` in Data Layer Lacks Organization Scoping

**File:** `src/lib/data/patients.ts`, lines 427-480
**Impact:** Potential cross-organization patient data modification

The `updatePatient` function takes `patientId` and `userId` (actually `organizationId` based on the call site at `src/app/api/patients/[id]/route.ts:75`), but the actual Supabase query at line 446-451 only filters by `id`, not by `organization_id`:

```typescript
const { data: patient, error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', patientId)
    .select()
    .single();
```

The second parameter is named `userId` in the function signature but is actually passed as `organizationId` from the API route. This naming mismatch makes it confusing, and the organization_id is never used in the actual query.

The API route does check org match before calling update (line 75 passes `context.user.organizationId`), but the data layer itself does not enforce it. RLS should catch this, but if RLS is misconfigured, any authenticated user could update any patient.

**Footgun:** The function signature says `userId` but callers pass `organizationId`. A junior dev reading the function would not understand what the second parameter means.

### HIGH-3: Service Role Client Import Not Restricted

**File:** `src/lib/supabase/service-role-client.ts`
**Impact:** RLS bypass if imported in wrong context

The service role client bypasses ALL Row Level Security. It has good comments warning against misuse, but there is:
- No ESLint rule preventing import in client components
- No build-time check
- No barrel export restriction (the file is directly importable)

Currently used in 9 files, which is reasonable. But there is no automated enforcement.

**Footgun:** A junior dev importing `createServiceRoleClient()` in an API route handler to "fix" an RLS permission error would bypass all organization-scoping.

### HIGH-4: Notes GET Handler Missing `requireOrganization`

**File:** `src/app/api/notes/[id]/route.ts`, line 211
**Impact:** Users without an organization can access notes

```typescript
export const GET = withAuth(handleGet, { requireMFA: true });
```

The handler does manually check `note.organization_id !== context.user.organizationId` inside the function, but `context.user.organizationId` could be `null` if `requireOrganization` is not set. A null-to-null comparison would pass.

Compare to `src/app/api/patients/[id]/route.ts:122` which correctly includes `requireOrganization: true`.

### HIGH-5: EHR Audit Log and Consent Routes Missing Role Restrictions

**File:** `src/app/api/ehr/audit-log/route.ts`, line 87
**File:** `src/app/api/ehr/consent/route.ts`, line 136

Both routes use `withAuth(handleGet)` with NO options -- meaning any authenticated user (including a regular USER) can view EHR audit logs and consent settings. The audit log route comment says "RLS will filter by organization for non-super-admins" but this relies entirely on RLS being correctly configured.

---

## Medium/Low Issues

### MED-1: Two Separate `azureOpenAIService` Imports

**Files:**
- `src/app/api/test-azure/route.ts:8` imports `azureOpenAIService` (default import)
- `src/app/api/ai/chat/route.ts:3` imports `safeAzureOpenAI` (different service)

A junior dev would not know which one to use for a new AI endpoint.

### MED-2: Audit Log Event Type Mismatch in Appointments

**File:** `src/app/api/appointments/route.ts`, line 119
**Impact:** Misleading audit trail

When creating an appointment, the audit event type is `PATIENT_CREATE` instead of `APPOINTMENT_CREATE`. This would make it appear that a patient was created when only an appointment was scheduled.

### MED-3: ESLint Config Has No Security Rules

**File:** `eslint.config.mjs`
**Impact:** No automated code quality enforcement for security patterns

The ESLint config only includes `next/core-web-vitals` and `next/typescript`. There are no:
- Rules against `console.log` in production code
- Rules against `any` type usage
- Rules against importing service-role-client from client components
- Security-focused ESLint plugins (e.g., `eslint-plugin-security`, `eslint-plugin-no-secrets`)

### MED-4: TypeScript `any` Usage in Security-Critical Code

**File:** `src/app/api/ehr/audit-log/route.ts`, line 48 - `(data || []).map((log: any) => {`
**File:** `src/lib/security/audit-log.ts`, lines 93, 101, 109 - `Record<string, any>`
**File:** `src/lib/validation/schemas.ts`, line 24 - `sanitizeObject<T extends Record<string, any>>`

Using `any` in audit logging and validation code means TypeScript cannot catch type errors in the most security-critical code paths.

### MED-5: Duplicate `validateCronSecret` Function

**Files:**
- `src/app/api/cron/check-trial-expirations/route.ts`, lines 16-41
- `src/app/api/cron/generate-invoices/route.ts`, lines 16-41

Identical function duplicated across two files. If someone fixes a bug in one, they may forget the other.

### MED-6: Notes Route Uses `rawData.note_date` After Validation

**File:** `src/app/api/notes/route.ts`, line 136

```typescript
last_visit_date: rawData.note_date || new Date().toISOString().split('T')[0]
```

After Zod validation produces `validatedData`, the code reaches back to `rawData` for `note_date`. This field is NOT in the `NoteCreateSchema`, so it bypasses validation entirely. This is unvalidated user input being written to the database.

### MED-7: In-Memory Idempotency for Stripe Webhooks

**File:** `src/app/api/subscriptions/webhook/route.ts`, lines 16-27

The idempotency store uses an in-memory `Map`. In a serverless environment (Vercel), each invocation may run in a different instance, making this idempotency check ineffective. The code even has a comment acknowledging this: "use Redis in production for multi-instance deployments."

### LOW-1: `supabase/index.ts` Intentionally Empty

**File:** `src/lib/supabase/index.ts`

The barrel export is intentionally empty to prevent server code from being imported client-side. While the reasoning is documented, a junior dev might be confused why `import { createClient } from '@/lib/supabase'` doesn't work and might "fix" it by re-adding exports.

### LOW-2: No Pre-commit Hooks

**File:** `package.json`

There is no `husky`, `lint-staged`, or equivalent pre-commit hook configuration. This means:
- Secrets could be committed without detection
- TypeScript errors could be committed
- Lint violations could be committed

### LOW-3: Inconsistent `profiles` vs `users` Table Usage

**Files:**
- `src/lib/supabase/middleware.ts`, line 144: Falls back to `profiles` table
- `src/app/api/auth/signout/route.ts`, line 24: Queries `profiles` table
- `src/app/auditor/layout.tsx`, line 51: Queries `users` table
- `src/app/(admin)/super-admin/layout.tsx`, line 49: Queries `users` table

Some code queries `users`, some queries `profiles`, some fall back from one to the other. A junior dev would not know which table to use.

---

## Sprint Fix Assessment

### Sprint 1 Fixes (20260318120000_sprint1_security_remediations.sql)
**Grade: B+**
- Demo mode hardening in middleware is solid (SEC-F018)
- `client.ts` and `server.ts` properly fail-closed in production
- Service role client properly separated

### Sprint 2 Fixes (20260318120001_sprint2_security_hardening.sql)
**Grade: B**
- `withAuth` wrapper is well-designed and consistently used for new routes
- CSRF protection via `validateOrigin` in `withAuth` is good
- MFA enforcement in middleware works but is inconsistently applied to API routes
- **New confusion introduced:** The `withAuth` options pattern is not self-documenting about when `requireMFA` should be used

### Sprint 3 Fixes (20260318120002_sprint3_billing_unique_constraint.sql)
**Grade: B+**
- Billing idempotency and unique constraints are solid
- Performance indexes added
- **New confusion introduced:** The `updatePatient` function signature mismatch (`userId` parameter is actually `organizationId`)

### Overall Sprint Impact
The Sprint fixes significantly improved the security posture but introduced **pattern inconsistency** as a new risk. A junior dev now has multiple "right ways" to do things, and the wrong pattern for any given route is not obvious.

---

## Developer Experience Recommendations

### Immediate Actions (Before Production)

1. **Add `organization_id` filter to screenings GET query** (CRIT-1)
   - File: `src/app/api/screenings/route.ts`, around line 37
   - Add `.eq('organization_id', context.user.organizationId)` to the query

2. **Fix `DemoAuthGuard` to use `getUser()`** (CRIT-3)
   - File: `src/components/auth/DemoAuthGuard.tsx`, line 17
   - Replace `supabase.auth.getSession()` with `supabase.auth.getUser()`

3. **Add `requireMFA: true` to all PHI-accessing API routes** (CRIT-2)
   - Files: appointments, dashboard/stats, encounters/tracking, ehr/audit-log, ehr/consent, risk-assessments

4. **Add `requireOrganization: true` to notes/[id] GET and PATCH** (HIGH-4)
   - File: `src/app/api/notes/[id]/route.ts`, lines 211-212

### Short-Term (This Sprint)

5. **Create a shared `validateCronSecret` utility** to eliminate duplication (MED-5)
6. **Fix audit event type in appointments route** from `PATIENT_CREATE` to `APPOINTMENT_CREATE` (MED-2)
7. **Fix `rawData.note_date` bypass** in notes POST handler (MED-6)
8. **Add ESLint security rules:**
   ```js
   // Suggested additions to eslint.config.mjs
   - no-restricted-imports for service-role-client from client paths
   - no-console in production code
   - @typescript-eslint/no-explicit-any
   ```

### Medium-Term (Next Sprint)

9. **Add pre-commit hooks** with husky/lint-staged to catch:
   - `.env` files being committed
   - TypeScript errors
   - Missing `withAuth` on new API routes

10. **Create an API route template/generator** that includes `withAuth`, audit logging, and Zod validation by default

11. **Add an automated test** that scans all `src/app/api/**/route.ts` files and verifies every exported handler uses `withAuth`

12. **Document the `users` vs `profiles` table distinction** and standardize on one pattern

13. **Restrict service-role-client imports** via ESLint rule or a build-time check that flags imports from paths containing `/components/` or files with `'use client'`

14. **Move from in-memory Stripe webhook idempotency to Redis** (MED-7)

### Long-Term (Architecture)

15. **Make `requireMFA` the default** in `withAuth` and require explicit `requireMFA: false` to opt out. This makes security the default and forces developers to consciously disable it.

16. **Add a middleware-level API auth check** that rejects unauthenticated requests to `/api/*` unless the route is explicitly safelisted (auth, webhook, cron endpoints).

17. **Replace `organization_id` checks scattered across handlers** with a centralized middleware or `withAuth` option that automatically scopes all Supabase queries to the user's organization.

---

## Summary Table

| ID | Severity | Category | File | Line(s) | Status |
|---|---|---|---|---|---|
| CRIT-1 | CRITICAL | PHI Exposure | `src/app/api/screenings/route.ts` | 32-41 | Open |
| CRIT-2 | CRITICAL | Auth Footgun | Multiple API routes | Various | Open |
| CRIT-3 | CRITICAL | Auth Footgun | `src/components/auth/DemoAuthGuard.tsx` | 17 | Open |
| CRIT-4 | CRITICAL | Secret Exposure | `.env.local` | All | Open (on disk) |
| HIGH-1 | HIGH | Auth Footgun | `src/middleware.ts` | 13-58 | By design, needs guardrail |
| HIGH-2 | HIGH | PHI Exposure | `src/lib/data/patients.ts` | 427-480 | Open |
| HIGH-3 | HIGH | Auth Footgun | `src/lib/supabase/service-role-client.ts` | All | Needs lint rule |
| HIGH-4 | HIGH | Auth Gap | `src/app/api/notes/[id]/route.ts` | 211 | Open |
| HIGH-5 | HIGH | Auth Gap | `src/app/api/ehr/audit-log/route.ts` | 87 | Open |
| MED-1 | MEDIUM | Confusing Pattern | Multiple AI routes | Various | Open |
| MED-2 | MEDIUM | Data Integrity | `src/app/api/appointments/route.ts` | 119 | Open |
| MED-3 | MEDIUM | Missing Guardrails | `eslint.config.mjs` | All | Open |
| MED-4 | MEDIUM | Type Safety | Multiple security files | Various | Open |
| MED-5 | MEDIUM | Confusing Pattern | Cron route files | Various | Open |
| MED-6 | MEDIUM | Validation Bypass | `src/app/api/notes/route.ts` | 136 | Open |
| MED-7 | MEDIUM | Data Integrity | `src/app/api/subscriptions/webhook/route.ts` | 16-27 | Open |
| LOW-1 | LOW | Confusing Pattern | `src/lib/supabase/index.ts` | All | By design |
| LOW-2 | LOW | Missing Guardrails | `package.json` | N/A | Open |
| LOW-3 | LOW | Confusing Pattern | Multiple layout/auth files | Various | Open |
