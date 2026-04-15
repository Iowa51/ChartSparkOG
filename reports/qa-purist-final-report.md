# QA Purist Final Report: ChartSpark Psychiatric EHR

**Date:** 2026-03-19
**Branch:** pre-production-audit
**Auditor Role:** QA Purist (Test Coverage & Reliability)
**Application Type:** Psychiatric EHR with PHI/HIPAA requirements on Supabase

---

## Executive Summary

ChartSpark has **7 unit test files** (Vitest) and **6 E2E test files** (Playwright) covering a codebase with **55+ API route handlers**, **25+ library modules**, **15+ security modules**, and **25+ Supabase migrations**. The overall test coverage is **critically low for a HIPAA-regulated application**.

### Test Inventory

| Category | Files | Approx. Test Cases |
|---|---|---|
| Unit Tests (Vitest) | 7 | ~85 |
| E2E Tests (Playwright) | 6 | ~25 |
| **Total** | **13** | **~110** |

### Coverage Assessment

| Area | Coverage | Risk Level |
|---|---|---|
| PHI Encryption | PARTIAL - encrypt/decrypt tested | HIGH |
| Input Validation (Zod) | GOOD - schemas tested | MEDIUM |
| CSRF Protection | GOOD - unit tested | LOW |
| Intrusion Detection | GOOD - all checkers tested | LOW |
| Input Sanitization | GOOD - tested | LOW |
| Safe Logging | PARTIAL - only sanitizeError tested | MEDIUM |
| RLS Policies | **NONE** | **CRITICAL** |
| Auth Middleware (withAuth) | **NONE** | **CRITICAL** |
| Session Management | **NONE** | **CRITICAL** |
| MFA Flows | **NONE** | **CRITICAL** |
| Account Lockout | **NONE** | **CRITICAL** |
| Password Validation | **NONE** | **HIGH** |
| Rate Limiting | **NONE** | **HIGH** |
| Audit Logging | **NONE** | **HIGH** |
| PHI Masking | **NONE** | **HIGH** |
| File Upload Security | **NONE** | **HIGH** |
| API Route Handlers (55+) | **NONE** (unit) | **CRITICAL** |
| Stripe Webhook | **NONE** | **HIGH** |
| Role-Based Access Control | **NONE** | **CRITICAL** |
| Data Layer (src/lib/data/) | **NONE** | **HIGH** |

---

## Critical Testing Gaps

### CRIT-01: Zero RLS Policy Tests

**Severity:** CRITICAL
**Files affected:** All Supabase migrations, especially:
- `supabase/migrations/20260318120000_sprint1_security_remediations.sql` (Sprint 1 - F-003 RLS fix)
- `supabase/fix_rls_policies.sql`
- `supabase/fix_rls_complete.sql`
- `supabase/schema.sql`

**Details:** The Sprint 1 fix (F-003) replaced `USING(true)` policies on 6 PHI tables (vitals, screening_scores, smart_triage_results, medication_interaction_log, ai_prompts, claim_lines) with organization-scoped policies. There are **zero tests** verifying these RLS policies work correctly.

**HIPAA Impact:** Without RLS tests, there is no automated verification that:
- Clinician A cannot read Clinician B's patient data (different org)
- Organization scoping via `get_user_organization_id()` works correctly
- The `prevent_self_role_escalation` trigger (F-007) actually blocks self-promotion
- Audit log INSERT is restricted to service_role only (F-017)
- `claim_lines` RLS correctly joins through `billing_claims`

**Recommendation:** Create a Supabase test suite using `@supabase/supabase-js` with test users in different organizations. Use `supabase db reset` + seed data in CI. Minimum test cases:
1. User in Org-A queries patients -- should see only Org-A patients
2. User in Org-A queries vitals -- should see only Org-A vitals
3. User attempts to UPDATE own role -- trigger should raise exception
4. Authenticated user attempts INSERT into audit_logs -- should be denied
5. Cross-org claim_lines access -- should return empty

### CRIT-02: Zero Tests for `withAuth` Middleware

**Severity:** CRITICAL
**File:** `src/lib/auth/api-auth.ts` (lines 107-218)

**Details:** The `withAuth` higher-order function is the single gate protecting **all** API routes. It handles:
- Authentication (Supabase session validation)
- CSRF validation for state-changing methods (line 124-128)
- Role-based access control (lines 131-138)
- MFA enforcement (lines 141-160)
- Organization requirement (lines 163-165)
- Feature flag gating with fail-closed semantics (lines 168-203)
- Session timeout enforcement (line 66-72 in `getAuthenticatedUser`)

**None of these behaviors are tested.** There are no mocked Supabase client tests, no tests for the role hierarchy, no tests for MFA enforcement, and no tests for the fail-closed feature check.

**HIPAA Impact:** If `withAuth` silently passes due to a code change or dependency update, all 55+ API routes become unauthenticated. The 15-minute HIPAA session timeout (F-022) has no test proving it works.

### CRIT-03: Zero Tests for Account Lockout

**Severity:** CRITICAL
**File:** `src/lib/auth/lockout.ts` (lines 1-191)

**Details:** Account lockout is a critical brute-force defense. The `checkAccountLockout` function has:
- Fail-closed behavior when service is unavailable (lines 28-31, 48-51)
- 5-attempt threshold with 30-minute lockout window
- Attempt counting with time-window reset

**None of these are tested.** The fail-closed behavior (returning `locked: true` when the DB is unavailable) is especially important to verify -- if this breaks, either all users get locked out (false positive) or lockout is disabled entirely (false negative).

### CRIT-04: Zero API Route Integration Tests

**Severity:** CRITICAL
**Files:** All 55+ files under `src/app/api/`

**Details:** No API route has a unit or integration test. The E2E tests in `e2e/api-security.spec.ts` test only that unauthenticated requests are rejected (9 GET endpoints, 3 POST endpoints). They do **not** test:
- Authenticated requests returning correct data
- Cross-organization data isolation
- Input validation rejection paths
- Error handling for malformed JSON
- Pagination edge cases
- Authorization (role checks)
- Audit log creation on PHI access

Key untested routes with high PHI exposure:
- `src/app/api/patients/route.ts` (GET/POST patient data)
- `src/app/api/patients/[id]/route.ts` (GET/PATCH/DELETE individual patient)
- `src/app/api/notes/route.ts` (GET/POST clinical notes)
- `src/app/api/notes/[id]/route.ts` (GET/PATCH/DELETE individual notes)
- `src/app/api/notes/[id]/sign/route.ts` (note signing -- legal weight)
- `src/app/api/ai/chat/route.ts` (AI with potential PHI in prompts)
- `src/app/api/ai/diagnose/route.ts` (diagnosis AI)
- `src/app/api/vitals/route.ts` (PHI data)
- `src/app/api/screenings/route.ts` (PHI data)
- `src/app/api/risk-assessments/route.ts` (sensitive psychiatric data)
- `src/app/api/admin/invitations/route.ts` (user provisioning)
- `src/app/api/admin/profile-approvals/route.ts` (access control)

---

## High Priority Testing Gaps

### HIGH-01: Zero MFA Tests

**Severity:** HIGH
**File:** `src/lib/auth/mfa.ts` (lines 1-160)

**Details:** MFA is required for ADMIN, SUPER_ADMIN, and AUDITOR roles (line 131). The functions `enrollMFA`, `verifyMFA`, `getMFAFactors`, `unenrollMFA`, and `isMFARequired` have zero tests. The `withAuth` middleware's MFA enforcement path (api-auth.ts lines 141-160) is also untested.

**HIPAA Impact:** If MFA silently fails open for privileged roles, admin accounts could be compromised without second-factor protection.

### HIGH-02: Zero Password Validation Tests

**Severity:** HIGH
**File:** `src/lib/auth/password-validation.ts` (lines 1-128)

**Details:** This module enforces HIPAA-compliant password requirements (12+ chars, mixed case, numbers, special chars, common password blocking, user-info-in-password detection). It has **zero tests**. The `validatePassword` function has 8+ distinct validation branches that should each be tested.

### HIGH-03: Zero Rate Limiting Tests

**Severity:** HIGH
**File:** `src/lib/security/rate-limit.ts` (lines 1-345)

**Details:** Rate limiting is critical infrastructure with:
- 6 different rate limit configurations (api, auth, ai, export, login, telehealth)
- In-memory fallback when Redis is unavailable
- Circuit breaker pattern (lines 42-93)
- Fail-closed behavior for auth endpoints (lines 257-267)
- Path-based config routing (lines 98-112)

None of this has tests. The circuit breaker state machine is particularly fragile without tests -- the threshold (5 failures), reset timer (30s), and state transitions should all be verified.

### HIGH-04: Zero Audit Log Tests

**Severity:** HIGH
**File:** `src/lib/security/audit-log.ts` (lines 1-411)

**Details:** The `sanitizeDetails` function (lines 101-124) removes PHI fields from audit log entries. This is critical -- if a developer adds a new field name that contains PHI but isn't in the `phiFields` list, PHI could leak into audit logs (which may be accessible to security staff without clinical authorization). The `getRiskLevel` function and `logAuditEvent` write path are also untested.

### HIGH-05: Zero PHI Masking Tests

**Severity:** HIGH
**File:** `src/lib/security/masking.ts` (lines 1-248)

**Details:** Contains 8 masking functions (`maskSSN`, `maskPhone`, `maskEmail`, `maskDOB`, `maskAddress`, `maskInsuranceId`, `maskMRN`, `maskName`) and role-based masking configuration (`getMaskingConfig`, `maskPatientData`). None are tested.

Edge cases that need testing:
- `maskSSN` with non-9-digit input (line 11)
- `maskEmail` with 1-2 char local part (lines 35-37)
- `maskDOB` with different date formats (line 49)
- `getMaskingConfig` with unknown role (lines 169-179) -- defaults to HIDDEN, must verify
- `maskPatientData` with missing fields

### HIGH-06: Zero File Upload Security Tests

**Severity:** HIGH
**File:** `src/lib/security/file-security.ts` (lines 1-211)

**Details:** File upload validation covers MIME types, dangerous extensions, double extensions, path traversal, and filename sanitization. Zero tests exist for any of these checks. In a psychiatric EHR, file uploads could include clinical documents with PHI.

### HIGH-07: Zero Stripe Webhook Tests

**Severity:** HIGH
**File:** `src/app/api/subscriptions/webhook/route.ts` (lines 1-208)

**Details:** The Stripe webhook handler processes 6 event types affecting subscription state. It has:
- Signature validation (line 55)
- Idempotency checking (lines 65-71)
- Subscription ownership verification before updates (lines 99-107)

None tested. A bug in webhook processing could silently downgrade or cancel subscriptions, affecting billing and feature access for clinical users.

---

## Medium / Low Issues

### MED-01: E2E Security Header Tests Use Conditional Assertions

**Severity:** MEDIUM
**File:** `e2e/security-headers.spec.ts` (lines 16-29)

**Details:** The security header tests use `if (header)` guards, meaning they pass even when headers are missing:
```typescript
// Line 19-21
const header = response.headers()['x-content-type-options'];
if (header) {
    expect(header).toBe('nosniff');
}
```
This means X-Content-Type-Options, X-Frame-Options, and Referrer-Policy could all be missing and tests would still pass. These should be unconditional assertions in production config.

### MED-02: E2E Tests Hardcode Demo Credentials

**Severity:** MEDIUM
**Files:** `e2e/login.spec.ts` (line 31-32), `e2e/patients.spec.ts` (line 11-12), `e2e/notes-navigation.spec.ts` (line 11-12)

**Details:** All E2E tests use `clinician@chartspark.com` / `Demo123!!`. This means:
1. Tests only run against a single user role (clinician/USER)
2. No E2E coverage for ADMIN, SUPER_ADMIN, or AUDITOR role flows
3. No cross-organization isolation testing at E2E level

### MED-03: Duplicate Validation Test Files

**Severity:** MEDIUM
**Files:**
- `src/__tests__/validation-schemas.test.ts` (~60 tests)
- `src/lib/validation/schemas.test.ts` (~30 tests)

**Details:** Two separate test files test the same validation schemas with overlapping coverage. This creates maintenance burden and makes it unclear which is the canonical test.

### MED-04: No CI Integration for E2E Tests

**Severity:** MEDIUM
**File:** `.github/workflows/ci.yml`

**Details:** The CI workflow (line 33) only runs `npm run test:run` (Vitest unit tests). Playwright E2E tests are not part of CI. The `playwright.config.ts` comment (line 25) confirms: "Do NOT auto-start dev server -- expects it already running." E2E tests require manual execution.

### MED-05: No Test Coverage Threshold Enforcement

**Severity:** MEDIUM
**File:** `vitest.config.ts` (lines 12-20)

**Details:** Coverage is configured with `v8` provider and reporters, but no threshold is set. Without `thresholds: { lines: 80, branches: 80 }` (or similar), coverage can drop without CI failing.

### MED-06: Session Management Module Completely Untested

**Severity:** MEDIUM
**File:** `src/lib/auth/session.ts` (lines 1-131)

**Details:** `hasSessionExpired()`, `isSessionExpiring()`, `getSessionRemainingTime()`, `hasAbsoluteTimeoutExpired()`, and `requiresReAuth()` are all untested client-side session functions. While the server-side timeout is in `api-auth.ts`, these client-side functions drive the UI timeout experience.

### LOW-01: No Test for Open Redirect Protection

**Severity:** LOW
**File:** `src/app/api/auth/callback/route.ts` (lines 8-16)

**Details:** The `sanitizeRedirectPath` function blocks `//` and `\` in redirect paths. This is good security practice but has no dedicated test.

### LOW-02: No Test for `canAccessPatient` Cross-Org Check

**Severity:** LOW
**File:** `src/lib/auth/api-auth.ts` (lines 261-283)

**Details:** `canAccessPatient` queries the patients table to verify organization match. Untested.

### LOW-03: No Component Tests

**Severity:** LOW
**Directory:** `src/components/`

**Details:** Despite `@testing-library/react` and `@testing-library/jest-dom` being in devDependencies, there are zero React component tests. This means no tests for PHI display components, session timeout UI, MFA enrollment UI, etc.

---

## Sprint Fix Test Verification

### Sprint 1 Fixes (commit `b193315`)

| Fix ID | Description | Has Test? | Verdict |
|---|---|---|---|
| F-003 | Replace RLS `USING(true)` on 6 PHI tables | NO | **FAIL** - Migration exists but no test verifies policies work |
| F-007 | Block user self-role-escalation trigger | NO | **FAIL** - Trigger created in SQL but no test fires it |
| F-017 | Restrict audit_logs INSERT to service_role | NO | **FAIL** - Policy dropped but no test confirms authenticated users are blocked |
| F-015 | Zod validation + strip protected fields | PARTIAL | Patient create/update schemas tested, but `organization_id` / `created_by` stripping in `[id]/route.ts` line 68-72 is not tested |

### Sprint 2 Fixes (commit `b193315`)

| Fix ID | Description | Has Test? | Verdict |
|---|---|---|---|
| F-022 | Server-side session timeout (15-min) | NO | **FAIL** - `last_activity_at` column added, timeout check in `api-auth.ts` line 66-72, but no test |
| SEC-MED-02 | CSRF in withAuth for state-changing methods | NO (unit) | **PARTIAL** - CSRF logic itself tested in `csrf.test.ts`, but withAuth integration untested |
| SEC-010 | Rate limiting with fail-closed for auth | NO | **FAIL** - Complex module with circuit breaker, zero tests |

### Sprint 3 Fixes (commit `1212711`)

| Fix ID | Description | Has Test? | Verdict |
|---|---|---|---|
| F-012 | Billing UNIQUE constraint (TOCTOU fix) | NO | **FAIL** - DB constraint added but no test attempts duplicate insert |
| Performance indexes | `20260203120001_performance_indexes.sql` | N/A | Indexes don't need functional tests, but query performance should be benchmarked |

### Verification Sweep (commit `7b02353`)

| Fix ID | Description | Has Test? | Verdict |
|---|---|---|---|
| Demo mode | NEXT_PUBLIC_DEMO_MODE gating | NO | **FAIL** - No test verifies demo mode actually gates production features |
| MFA billing | MFA required for billing endpoints | NO | **FAIL** - `requireMFA: true` in route config but no test |
| Audit logging | Consolidated audit service | NO | **FAIL** - `sanitizeDetails` PHI stripping untested |

**Overall Sprint Fix Verification: 0 of 12 fixes have adequate test coverage.**

---

## Testing Recommendations

### Priority 1: Immediate (Pre-Production Blockers)

1. **RLS Policy Integration Tests** -- Create `src/__tests__/rls-policies.test.ts` using Supabase client with two test users in different organizations. Verify all 6 tables from F-003, the self-role-escalation trigger (F-007), and audit_logs INSERT restriction (F-017). **Estimated: 30-40 test cases.**

2. **withAuth Middleware Tests** -- Create `src/lib/auth/__tests__/api-auth.test.ts` with mocked Supabase client. Test: unauthenticated rejection, role checks (USER/ADMIN/SUPER_ADMIN), MFA enforcement, session timeout, CSRF on POST/PATCH/DELETE, feature flag gating with fail-closed, deactivated account blocking. **Estimated: 25-30 test cases.**

3. **Account Lockout Tests** -- Create `src/lib/auth/__tests__/lockout.test.ts` with mocked service role client. Test: lockout after 5 failures, lockout expiry, fail-closed on DB error, attempt recording, successful login clears attempts. **Estimated: 10-15 test cases.**

### Priority 2: High (Within Sprint)

4. **Password Validation Tests** -- Create `src/lib/auth/__tests__/password-validation.test.ts`. Test all 8 validation rules plus edge cases. **Estimated: 15-20 test cases.**

5. **Rate Limiting Tests** -- Create `src/lib/security/__tests__/rate-limit.test.ts`. Test in-memory fallback, circuit breaker state machine, fail-closed for auth endpoints, path-based config routing. **Estimated: 15-20 test cases.**

6. **Audit Log Tests** -- Create `src/lib/security/__tests__/audit-log.test.ts`. Test `sanitizeDetails` PHI stripping (critical), `getRiskLevel` mapping, and `logAuditEvent` write path with mocked Supabase. **Estimated: 15-20 test cases.**

7. **PHI Masking Tests** -- Create `src/lib/security/__tests__/masking.test.ts`. Test all 8 masking functions with edge cases plus role-based config. **Estimated: 30-40 test cases.**

8. **File Security Tests** -- Create `src/lib/security/__tests__/file-security.test.ts`. Test MIME validation, dangerous extensions, double extensions, path traversal, filename sanitization. **Estimated: 20-25 test cases.**

### Priority 3: Medium (Next Sprint)

9. **API Route Integration Tests** -- Start with the highest-risk routes: patients CRUD, notes CRUD, and AI endpoints. Use supertest or next-test-api-resolver patterns with mocked Supabase. **Estimated: 40-50 test cases per route group.**

10. **E2E Multi-Role Tests** -- Add E2E tests for admin and super-admin flows. Test that a USER cannot access `/admin/*` routes even when authenticated.

11. **Stripe Webhook Tests** -- Test signature validation, idempotency, and each event type handler with mocked Stripe objects.

12. **Fix E2E Security Header Assertions** -- Remove conditional guards in `e2e/security-headers.spec.ts` so missing headers fail.

13. **Add E2E Tests to CI** -- Configure Playwright in GitHub Actions with a test Supabase instance.

14. **Enforce Coverage Thresholds** -- Add `thresholds` to `vitest.config.ts` and fail CI below 70% lines/branches.

### Priority 4: Ongoing

15. **Consolidate duplicate test files** -- Merge `src/__tests__/validation-schemas.test.ts` and `src/lib/validation/schemas.test.ts` into a single canonical location.

16. **Component tests for PHI display** -- Test that patient detail components apply masking correctly based on user role.

17. **Session timeout UI tests** -- Verify the client-side session module with JSDOM/happy-dom.

---

## Summary Metrics

| Metric | Value |
|---|---|
| Total Source Files (non-test) | ~130 |
| Total Test Files | 13 |
| Test-to-Source Ratio | ~1:10 |
| Security Modules Without Tests | 8 of 15 |
| Auth Modules Without Tests | 4 of 5 |
| API Routes Without Tests | 55 of 55 |
| Sprint Fix Tests | 0 of 12 |
| RLS Policy Tests | 0 |
| HIPAA-Critical Untested Paths | 12+ |

**Bottom Line:** This application has reasonable test coverage for input validation and intrusion detection, but **zero test coverage for authentication, authorization, session management, RLS policies, rate limiting, and every API route handler**. For a HIPAA-regulated psychiatric EHR handling PHI, this represents a significant compliance and reliability risk. The Sprint 1/2/3 security remediations were implemented but none have regression tests to prevent future breakage.
