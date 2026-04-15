# API Designer Final Audit Report
## ChartSpark Psychiatric EHR/PHI/HIPAA Application

**Auditor:** API Designer
**Date:** 2026-03-19
**Branch:** pre-production-audit
**Scope:** All API routes, data contracts, auth flows, Supabase integration patterns
**Total API Routes Audited:** 48 endpoints across 35 route files

---

## Executive Summary

The ChartSpark API layer demonstrates a **mature security posture** for a HIPAA-compliant psychiatric EHR application. The codebase has clearly undergone multiple rounds of security hardening (Sprint 1/2/3) that addressed critical vulnerabilities. A centralized `withAuth` wrapper provides consistent authentication, CSRF protection, role-based access control, MFA enforcement, and session timeout across nearly all endpoints. Zod validation schemas are consistently applied for input validation, and a safe-logger prevents PHI from leaking into logs or error responses.

However, this audit identified **2 High**, **5 Medium**, and **7 Low** severity findings that must be addressed before production deployment. The most concerning issues involve inconsistent input validation on the billing claims creation endpoint (no Zod schema), missing MFA enforcement on several EHR and telehealth endpoints, and a clearinghouse test endpoint that may send encrypted credentials in plaintext to external APIs.

**Overall API Security Grade: B+**

---

## Critical Findings

**No critical findings.** All previously identified critical issues (privilege escalation in complete-signup, missing auth on endpoints, demo mode in production) have been properly remediated.

---

## High Findings

### H-001: Billing Claims POST Endpoint Missing Zod Input Validation

**File:** `src/app/api/managed-billing/claims/route.ts`, lines 78-131
**Severity:** HIGH
**HIPAA Impact:** Data integrity risk for financial PHI

The `handlePost` function for creating billing claims directly destructures `body` from `request.json()` without any Zod schema validation, unlike virtually every other POST endpoint in the application. Fields like `patientId`, `providerId`, `encounterId`, `billedAmount`, `diagnosisCodes`, and `procedureCodes` are passed directly to the database insert.

```typescript
// Line 86-87: Raw body used without validation
const body = await context.request.json();
const claimNumber = `CLM-${Date.now()...}`;
```

**Risk:** An attacker could submit malformed data, negative amounts, or excessively long strings. This is especially dangerous because billing claims contain financial PHI.

**Recommendation:** Create and apply a `BillingClaimCreateSchema` Zod schema matching the existing pattern used across all other endpoints.

---

### H-002: Clearinghouse Test Endpoint Uses Encrypted Credential Values as Plaintext API Keys

**File:** `src/app/api/managed-billing/admin/clearinghouse/test/route.ts`, lines 47-68
**Severity:** HIGH
**HIPAA Impact:** Credential exposure risk

The clearinghouse connection test reads `api_key_encrypted` and `api_secret_encrypted` from the database and sends them directly as API credentials to external services (Claim.MD, Availity). The column names suggest these should be encrypted at rest, but they are used as-is without decryption:

```typescript
// Line 48: Using "encrypted" value directly as credential
'Authorization': `Basic ${Buffer.from(`${config.api_key_encrypted}:`).toString('base64')}`
```

Either (a) these values are NOT actually encrypted (naming is misleading and dangerous), or (b) they ARE encrypted and the test will always fail. Either way, this needs correction.

**Recommendation:** Implement proper encryption/decryption for stored API credentials using a KMS or `src/lib/security/encryption.ts`. Rename columns if they are stored in plaintext.

---

## Medium Findings

### M-001: Missing MFA Requirement on EHR Configuration and Consent Endpoints

**Files:**
- `src/app/api/ehr/configurations/route.ts`, lines 103-107
- `src/app/api/ehr/consent/route.ts`, lines 136-140
- `src/app/api/ehr/audit-log/route.ts`, line 87

**Severity:** MEDIUM
**HIPAA Impact:** Reduced authentication assurance for sensitive operations

These endpoints use `withAuth` but do NOT specify `requireMFA: true`, unlike the majority of PHI-touching endpoints. EHR configuration changes (connecting external EHR systems) and consent settings (what PHI is shared) are high-sensitivity operations that should require MFA.

**Recommendation:** Add `requireMFA: true` to all EHR endpoint `withAuth` options.

---

### M-002: Missing MFA Requirement on Telehealth Endpoints

**Files:**
- `src/app/api/telehealth/create-room/route.ts`, lines 200-202
- `src/app/api/telehealth/end-session/route.ts`, lines 103-105
- `src/app/api/appointments/route.ts`, lines 143-144
- `src/app/api/appointments/[id]/route.ts`, lines 154-156
- `src/app/api/encounters/tracking/route.ts`, line 77
- `src/app/api/dashboard/stats/route.ts`, line 60

**Severity:** MEDIUM
**HIPAA Impact:** These endpoints access or create PHI records without full MFA assurance.

Telehealth room creation creates a video session involving patient PHI. Appointment endpoints expose patient scheduling data. All lack `requireMFA: true`.

**Recommendation:** Add `requireMFA: true` to these endpoints.

---

### M-003: Medication Review Error Handler Returns 200 with Demo Data

**File:** `src/app/api/ai/smart-triage/medication-review/route.ts`, lines 213-219
**Severity:** MEDIUM
**HIPAA Impact:** Silent failure masking

When the medication review endpoint encounters an exception, it returns HTTP 200 with demo data instead of an error status code:

```typescript
return NextResponse.json(
    { error: 'Failed to run medication triage', isDemo: true, result: getDemoMedicationTriageResponse() },
    { status: 200 } // Should be 500 or 503
);
```

This means a genuine failure (database down, AI service error) is silently hidden. A clinician could make decisions based on demo data thinking it is real. The `chart-summary` and `prescribing-check` endpoints have the same pattern (returning demo data on error without error status codes).

**Recommendation:** Return HTTP 503 with clear error messaging. Never return demo clinical data as if it were real when an actual error occurs.

---

### M-004: Managed Billing Onboarding POST Accepts Unsanitized NPI and Tax ID

**File:** `src/app/api/managed-billing/onboarding/route.ts`, lines 71-98
**Severity:** MEDIUM
**HIPAA Impact:** Data integrity; NPI/Tax ID are sensitive identifiers

The onboarding POST handler reads `practiceNpi` and `practiceTaxId` from the request body without any validation:

```typescript
practice_npi: body.practiceNpi,
practice_tax_id: body.practiceTaxId,
```

NPI numbers are exactly 10 digits. Tax IDs have specific formats. Neither is validated.

**Recommendation:** Add Zod schema with NPI (10-digit numeric) and EIN/TIN format validation.

---

### M-005: In-Memory Rate Limiting Not Suitable for Production Multi-Instance

**File:** `src/lib/security/rate-limit.ts`, lines 39-40, 246-251
**Severity:** MEDIUM
**HIPAA Impact:** Brute-force protection ineffective across multiple Vercel function instances

The rate limiter falls back to in-memory storage when Upstash Redis is not configured. In production, each Vercel serverless function instance has its own memory space, making per-instance rate limiting ineffective. The code warns about this but does not enforce Redis in production:

```typescript
if (process.env.NODE_ENV === 'production') {
    console.warn('[RATE-LIMIT] Upstash not configured...');
}
```

Similarly, the Stripe webhook idempotency store (`src/app/api/subscriptions/webhook/route.ts`, line 16) and the `record-attempt` endpoint rate limiter (`src/app/api/auth/record-attempt/route.ts`, line 10) use in-memory Maps.

**Recommendation:** Require Upstash Redis in production (fail-closed if not configured). Document this as a deployment prerequisite.

---

## Low Findings

### L-001: Inconsistent Error Response Schemas Across Endpoints

Multiple error response formats exist:
- `{ error: 'message' }` (majority of endpoints)
- `{ message: 'text' }` (`src/app/api/admin/profile-approvals/route.ts`, `src/app/api/auditor/batch-action/route.ts`)

**Recommendation:** Standardize all error responses to `{ error: string, details?: string[] }`.

---

### L-002: EHR Audit Log Endpoint Lacks Organization Scoping

**File:** `src/app/api/ehr/audit-log/route.ts`, lines 23-40

The query filters by `action LIKE 'EHR_%'` but does not explicitly filter by `organization_id`. It relies on RLS, but the comment on line 23 says "RLS will filter by organization for non-super-admins." If RLS policies are misconfigured, this could leak cross-org audit data.

**Recommendation:** Add explicit `.eq('organization_id', context.user.organizationId)` filter as defense-in-depth.

---

### L-003: Pagination Parameters Not Clamped on Some Endpoints

**File:** `src/app/api/managed-billing/claims/route.ts`, lines 25-27

The `page` and `limit` parameters are parsed with `parseInt` without bounds checking:

```typescript
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '20');
```

Compare with the patients route which properly clamps: `Math.min(100, Math.max(1, parseInt(...)))`.

**Recommendation:** Apply consistent pagination clamping across all endpoints or use the shared `PaginationSchema` Zod schema.

---

### L-004: Auditor Batch Action Missing Zod Validation for submissionIds

**File:** `src/app/api/auditor/batch-action/route.ts`, lines 13-18

The `submissionIds` array is checked with `Array.isArray()` but individual elements are not validated as UUIDs. A malformed ID could cause database errors or injection.

**Recommendation:** Validate with `z.array(UUIDSchema).min(1).max(100)`.

---

### L-005: Note Signing Endpoint Leaks `signed_by` User ID in Error Response

**File:** `src/app/api/notes/[id]/sign/route.ts`, lines 73-82

When a note is already signed, the response includes `signed_by` (a user UUID). While not PHI, this exposes internal user identifiers unnecessarily.

**Recommendation:** Return only `signed_at` in the error response, not `signed_by`.

---

### L-006: Telehealth End Session Logs Appointment ID to Console

**File:** `src/app/api/telehealth/end-session/route.ts`, line 87

```typescript
console.log(`Session ended for appointment ${appointmentId}`);
```

This bypasses the safe-logger and could persist in serverless function logs.

**Recommendation:** Replace with `devLog()` or remove entirely.

---

### L-007: AI Diagnose Endpoint Checks Error Message Content for Status Code Detection

**File:** `src/app/api/ai/diagnose/route.ts`, lines 68-87

Error handling uses string matching on error messages (`errorMsg.includes('401')`, `errorMsg.includes('429')`), which is fragile and could break with SDK updates.

**Recommendation:** Catch typed errors from the Azure OpenAI SDK and check status codes directly.

---

## Sprint Fix Verification

### Sprint 1 Fixes (SEC-HIGH-01 Series) -- VERIFIED

| Fix ID | Description | Status | Evidence |
|--------|------------|--------|----------|
| SEC-HIGH-01 | Migrate all routes to `withAuth` wrapper | PASS | All 48 endpoints verified. Every endpoint except auth pre-login routes (`record-attempt`, `check-lockout`, `callback`) and cron/webhook handlers uses `withAuth`. |
| SEC-003 | Fail-closed when Supabase not configured in production | PASS | `src/lib/supabase/server.ts:36`, `src/lib/supabase/client.ts:37`, `src/lib/supabase/middleware.ts:68` all throw or return 500 in production. |
| SEC-004 | Lock down previously unprotected endpoints | PASS | `validate-codes`, `risk-assessments`, `test-azure` all secured with `withAuth`. |

### Sprint 2 Fixes (Auth & API Hardening) -- VERIFIED

| Fix ID | Description | Status | Evidence |
|--------|------------|--------|----------|
| SEC-002 | Role lookup failure handling | PASS | `src/lib/supabase/middleware.ts:157-176` - Hard fail in production, demo fallback only for known emails. |
| SEC-CRITICAL-04 | Profile approval field whitelist | PASS | `src/app/api/admin/profile-approvals/route.ts:9` - `ALLOWED_PROFILE_FIELDS` whitelist prevents arbitrary column updates. |
| SEC-MED-02 | CSRF protection on state-changing methods | PASS | `src/lib/auth/api-auth.ts:123-128` - `validateOrigin()` called for non-GET methods inside `withAuth`. |
| SEC-CODEX-1 | MFA enforcement for privileged roles | PASS | `src/lib/auth/api-auth.ts:141-160` - Fails closed on MFA check errors. |
| F-019 | Brute force lockout fail-closed | PASS | `src/app/api/auth/check-lockout/route.ts:36-51` - Returns `locked: true` when service is unavailable. |
| F-020 | Login attempt rate limiting | PASS | `src/app/api/auth/record-attempt/route.ts:14-23` - IP-based in-memory rate limit. |

### Sprint 3 Fixes (Performance & Tech Debt) -- VERIFIED

| Fix ID | Description | Status | Evidence |
|--------|------------|--------|----------|
| SEC-006 | Feature check fail-closed | PASS | `src/lib/auth/api-auth.ts:167-203` - Returns 503 on database errors. |
| F-022 | Server-side session timeout (HIPAA 15-min) | PASS | `src/lib/auth/api-auth.ts:66-72` - Checks `last_activity_at` against 15-minute timeout. |
| SEC-REMEDIATION | Demo mode blocked in production | PASS | `src/lib/supabase/middleware.ts:57-64` - Explicit check blocks demo mode in production. |
| SEC-REMEDIATION | Privilege escalation fix in complete-signup | PASS | `src/app/api/auth/complete-signup/route.ts:42-53` - Uses `supabase.auth.getUser()` instead of client-provided userId. |
| SEC-REMEDIATION | Cron secret validation | PASS | Both cron routes validate `CRON_SECRET` with fail-closed behavior in production. |
| SEC-REMEDIATION | Webhook idempotency | PASS | `src/app/api/subscriptions/webhook/route.ts:64-71` - Deduplicates by event ID. |
| F-028 | Consolidated audit logging | PASS | `src/lib/security/audit-log.ts` - Service role client bypasses RLS, PHI sanitized from details. |

---

## API Design Recommendations

### 1. Standardize Error Response Contract

Create a typed error response interface and use it consistently:

```typescript
interface ApiErrorResponse {
  error: string;
  code?: string;         // Machine-readable error code
  details?: string[];    // Validation errors
  requestId?: string;    // For support correlation
}
```

Currently some endpoints use `{ message: '...' }` while most use `{ error: '...' }`.

### 2. Add API Versioning Strategy

No API versioning exists. When breaking changes are needed, there is no mechanism to deprecate gracefully. Recommend adding `/api/v1/` prefix or version headers before public API consumers exist.

### 3. Add Request ID Tracking

No request ID is generated or propagated. For HIPAA incident investigation, correlating audit logs with specific API requests requires a unique request ID. Add a middleware that generates a UUID per request and includes it in audit log entries and error responses.

### 4. Implement Response Cache Headers for PHI Endpoints

No `Cache-Control` headers are set on API responses containing PHI. Browsers and CDN proxies could cache sensitive data.

**Recommendation:** Add `Cache-Control: no-store, no-cache, must-revalidate, private` to all PHI-returning responses.

### 5. Consider OpenAPI/Swagger Documentation

The codebase has well-defined Zod schemas that could be converted to OpenAPI specifications using `zod-to-openapi`. This would provide:
- Auto-generated API documentation
- Client SDK generation
- Contract testing

### 6. Add Health Check Endpoint

There is no public health check endpoint (the `system-health` route requires SUPER_ADMIN auth). Load balancers and monitoring systems need an unauthenticated `/api/health` endpoint that returns basic liveness without exposing internals.

---

## Endpoint Inventory

| Route | Methods | Auth | MFA | Validation | Audit | Notes |
|-------|---------|------|-----|-----------|-------|-------|
| `/api/patients` | GET, POST | withAuth | Yes | Zod | Yes | |
| `/api/patients/[id]` | GET, PATCH, DELETE | withAuth | Yes | Zod | Yes | |
| `/api/patients/[id]/documents` | GET, POST | withAuth | Yes | Zod + file validation | Yes | |
| `/api/patients/[id]/documents/[docId]` | GET, DELETE | withAuth | Yes | - | Yes | |
| `/api/notes` | GET, POST | withAuth | Yes | Zod | Yes | |
| `/api/notes/[id]` | GET, PATCH, DELETE | withAuth | Yes | Zod | Yes | |
| `/api/notes/[id]/sign` | POST | withAuth | Yes | - | Yes | |
| `/api/ai/chat` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/diagnose` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/generate-note` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/recommendations` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/treatment-plan` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/validate-codes` | POST | withAuth | Yes | Manual | Yes | |
| `/api/ai/smart-triage/medication-review` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/smart-triage/chart-summary` | POST | withAuth | Yes | Zod | Yes | |
| `/api/ai/smart-triage/prescribing-check` | POST | withAuth | Yes | Zod | Yes | |
| `/api/appointments` | GET, POST | withAuth | **No** | Zod | Yes | M-002 |
| `/api/appointments/[id]` | GET, PATCH, DELETE | withAuth | **No** | Zod | Yes | M-002 |
| `/api/billing` | GET, POST | withAuth | Yes | Zod | Yes | |
| `/api/billing/poll` | GET | CRON_SECRET | N/A | - | - | |
| `/api/managed-billing/claims` | GET, POST | withAuth | Yes | **Missing on POST** | Yes | H-001 |
| `/api/managed-billing/claims/[id]/submit` | POST | withAuth | Yes | - | Yes | |
| `/api/managed-billing/claims/[id]/validate` | POST | withAuth | Yes | - | Yes | |
| `/api/managed-billing/invoices` | GET, POST | withAuth | Yes | Manual | Yes | |
| `/api/managed-billing/collections` | GET | withAuth | Yes | - | Yes | |
| `/api/managed-billing/onboarding` | GET, POST | withAuth | Yes | **Missing** | Yes | M-004 |
| `/api/managed-billing/era/upload` | POST | withAuth | Yes | Manual | Yes | |
| `/api/managed-billing/admin/clearinghouse` | GET, PUT | withAuth | Yes | Manual | Yes | |
| `/api/managed-billing/admin/clearinghouse/test` | POST | withAuth | Yes | Manual | Yes | H-002 |
| `/api/ehr/audit-log` | GET | withAuth | **No** | - | - | M-001, L-002 |
| `/api/ehr/configurations` | GET, POST | withAuth | **No** | Manual | Yes | M-001 |
| `/api/ehr/consent` | GET, PUT | withAuth | **No** | Manual | Yes | M-001 |
| `/api/encounters/tracking` | POST | withAuth | **No** | Manual | Yes | M-002 |
| `/api/dashboard/stats` | GET | withAuth | **No** | - | - | M-002 |
| `/api/auth/callback` | GET | Code exchange | N/A | - | - | |
| `/api/auth/record-attempt` | POST | None (pre-auth) | N/A | Zod | Yes | Rate limited |
| `/api/auth/check-lockout` | POST | None (pre-auth) | N/A | Manual | - | Fail-closed |
| `/api/auth/complete-signup` | POST | Session auth | N/A | Manual | Yes | |
| `/api/auth/signout` | POST | Session auth | N/A | - | Yes | |
| `/api/subscriptions/status` | GET | withAuth | No | - | - | |
| `/api/subscriptions/create-checkout` | POST | withAuth | No | Manual | - | |
| `/api/subscriptions/check-feature` | GET | withAuth | No | Manual | - | |
| `/api/subscriptions/webhook` | POST | Stripe signature | N/A | Stripe SDK | - | Idempotent |
| `/api/telehealth/create-room` | POST | withAuth | **No** | Manual | Yes | M-002 |
| `/api/telehealth/end-session` | POST | withAuth | **No** | Manual | Yes | M-002, L-006 |
| `/api/risk-assessments` | GET, POST | withAuth | No | Zod (strict) | Yes | |
| `/api/screenings` | GET, POST | withAuth | Yes | Zod | Yes | |
| `/api/vitals` | GET, POST | withAuth | Yes | Zod | Yes | |
| `/api/admin/invitations` | GET, POST | withAuth | Yes | Manual | Yes | |
| `/api/admin/profile-approvals` | POST | withAuth | Yes | Whitelist | - | |
| `/api/admin/system-health` | GET | withAuth | Yes | - | - | SUPER_ADMIN only |
| `/api/auditor/batch-action` | POST | withAuth | Yes | Manual | - | L-004 |
| `/api/cron/check-trial-expirations` | GET, POST | CRON_SECRET | N/A | - | - | |
| `/api/cron/generate-invoices` | GET, POST | CRON_SECRET | N/A | - | - | |
| `/api/test-azure` | GET, POST | withAuth | No | - | - | SUPER_ADMIN only |

---

## Security Architecture Summary

### Strengths
1. **Centralized auth** via `withAuth` wrapper with CSRF, role, MFA, org, and feature checks
2. **Consistent safe-logging** that prevents PHI in server logs and error responses
3. **Comprehensive audit trail** with PHI access tracking, risk levels, and IP logging
4. **Fail-closed patterns** consistently applied for auth failures, MFA checks, and feature gates
5. **Demo mode properly isolated** -- blocked in production at middleware level
6. **Zod validation** on the vast majority of POST/PATCH endpoints
7. **Organization isolation** enforced at both application and RLS levels
8. **Security headers** properly configured with CSP, HSTS, X-Frame-Options
9. **Open redirect protection** in auth callback with `sanitizeRedirectPath()`
10. **Input sanitization** in validation schemas prevents SQL/XSS patterns

### Areas Needing Improvement
1. MFA enforcement gaps on 10+ endpoints (M-001, M-002)
2. Input validation gaps on billing claim creation (H-001)
3. In-memory rate limiting inadequate for serverless production (M-005)
4. No `Cache-Control: no-store` on PHI API responses
5. No request ID for audit log correlation

---

*End of API Designer Final Report*
