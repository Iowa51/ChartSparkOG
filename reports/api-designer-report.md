# API Design Audit Report - ChartSpark EHR

**Audit Date:** 2026-03-18
**Auditor Role:** API Designer
**Application:** ChartSpark - Psychiatric EHR (HIPAA-regulated)
**Stack:** Next.js 15 (App Router), Supabase, Stripe, Azure OpenAI, Daily.co

---

## Executive Summary

ChartSpark demonstrates a mature security posture for its API layer, with centralized authentication (`withAuth` wrapper), Zod-based input validation, HIPAA audit logging, and role-based access control. However, this audit identified **4 CRITICAL**, **6 HIGH**, **8 MEDIUM**, and **5 LOW** findings that should be addressed before production deployment.

The most serious issues involve: (1) a clinical note deletion endpoint that uses a service role client without organization scoping, (2) several endpoints missing Zod input validation for POST bodies, (3) a feature-access check endpoint that fails OPEN on error, and (4) an open redirect vulnerability in the auth callback.

---

## Findings by Severity

---

### CRITICAL-1: Note Deletion Bypasses Organization Isolation via Service Role Client

**File:** `/src/app/api/notes/[id]/route.ts`, lines 168-184
**Issue:** The `handleDelete` function uses `createServiceRoleClient()` (which bypasses Row-Level Security) to delete clinical notes. Critically, the delete query filters only by `id` without verifying `organization_id`. The `withAuth` wrapper provides authentication but the handler does **not** check that the note belongs to the user's organization before deleting it.

**Impact:** An authenticated user from Organization A could delete clinical notes belonging to Organization B by providing a valid note UUID. This is a cross-tenant data destruction vulnerability and a HIPAA violation.

**Remediation:**
```typescript
// Add organization check BEFORE using service role delete
const supabase = await createClient();
const { data: note } = await supabase
    .from('clinical_notes')
    .select('organization_id')
    .eq('id', id)
    .single();

if (!note || note.organization_id !== context.user.organizationId) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
}
// Then proceed with service role delete
```

---

### CRITICAL-2: Open Redirect in Auth Callback

**File:** `/src/app/api/auth/callback/route.ts`, lines 7-8, 18-20
**Issue:** The `next` query parameter is used directly in `NextResponse.redirect()` without validation. An attacker can craft a URL like `/api/auth/callback?code=...&next=https://evil.com/phish` to redirect users to a malicious site after authentication. Additionally, `x-forwarded-host` is trusted without validation in non-local environments (line 19), allowing host header injection.

**Impact:** Phishing attacks where users believe they are on the legitimate application. Combined with session token theft, this could lead to unauthorized PHI access.

**Remediation:**
```typescript
// Validate 'next' parameter is a relative path
const next = searchParams.get("next") ?? "/dashboard";
const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

// Validate x-forwarded-host against allowed hosts
const allowedHosts = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_URL].filter(Boolean);
```

---

### CRITICAL-3: Feature Access Check Fails OPEN on Error

**File:** `/src/app/api/subscriptions/check-feature/route.ts`, lines 30-33
**Issue:** When an error occurs checking feature access, the endpoint returns `{ hasAccess: true }`, granting access to gated features. This is a fail-open pattern that could grant unauthorized access to premium/restricted features on any database error.

**Impact:** Users could gain access to features they haven't paid for, or features that require additional security controls (e.g., managed billing, advanced AI capabilities). In a HIPAA context, feature gates may control access to higher-risk PHI operations.

**Remediation:**
```typescript
} catch (error) {
    logError({ action: 'FEATURE_CHECK_ERROR', error: sanitizeError(error) });
    // FAIL CLOSED - deny access on error
    return NextResponse.json({ hasAccess: false, error: 'Feature check unavailable' }, { status: 503 });
}
```

---

### CRITICAL-4: Managed Billing Claims POST Lacks Input Validation

**File:** `/src/app/api/managed-billing/claims/route.ts`, lines 61-97
**Issue:** The `handlePost` function for creating billing claims directly uses `body.patientId`, `body.providerId`, `body.billedAmount`, etc. from the raw request body without any Zod schema validation. While the billing route at `/api/billing/route.ts` has `BillingCreateSchema` validation, this managed billing claims endpoint does not.

**Impact:** An attacker could submit arbitrary data including negative `billedAmount` values, invalid UUIDs for `patientId`/`providerId`, or injection payloads in `payerName`/`diagnosisCodes`. This is a financial manipulation vector -- submitting claims with inflated or negative amounts could result in fraudulent billing. Missing UUID validation means claims could reference patients/providers in other organizations.

**Remediation:** Create and apply a `BillingClaimCreateSchema`:
```typescript
const BillingClaimCreateSchema = z.object({
    patientId: UUIDSchema,
    providerId: UUIDSchema.optional(),
    encounterId: UUIDSchema.optional(),
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    diagnosisCodes: z.array(z.string().max(20)).max(20).optional(),
    procedureCodes: z.array(z.string().max(20)).max(20).optional(),
    billedAmount: z.number().positive('Amount must be positive').max(999999.99),
    payerName: z.string().max(200).optional(),
});
```

---

### HIGH-1: Screenings POST Endpoint Missing Zod Validation

**File:** `/src/app/api/screenings/route.ts`, lines 75-98
**Issue:** The POST handler for creating screening scores uses manual validation (`if (!patient_id || !instrument...`) instead of Zod schema validation. The `item_responses` field (which is a JSON object) is inserted directly from the request body without any type checking or size limits. Similarly, `clinical_notes` and `risk_flags` are passed through without validation.

**Impact:** An attacker could submit extremely large `item_responses` objects (DoS), inject arbitrary JSON structures, or pass invalid data types. For a clinical screening tool handling PHI data like PHQ-9 scores, this could result in corrupt clinical data that affects patient care decisions.

**Remediation:** Add a Zod schema:
```typescript
const ScreeningCreateSchema = z.object({
    patient_id: UUIDSchema,
    encounter_id: UUIDSchema.optional().nullable(),
    instrument: z.enum(['PHQ9', 'GAD7', 'CSSRS', 'AUDITC', 'DAST10', 'MDQ', 'PCL5']),
    total_score: z.number().int().min(0).max(100),
    severity: z.string().max(50).optional(),
    item_responses: z.record(z.unknown()).refine(obj => JSON.stringify(obj).length < 10000),
    clinical_notes: z.string().max(5000).optional().nullable(),
    risk_flags: z.array(z.string().max(200)).max(20).optional(),
});
```

---

### HIGH-2: Patient Update (PATCH) Endpoint Lacks Input Validation

**File:** `/src/app/api/patients/[id]/route.ts`, lines 52-71
**Issue:** The `handlePatch` function passes raw `updates` from `context.request.json()` directly to `updatePatient()` without Zod validation. While the `createPatient` endpoint uses `PatientCreateSchema`, the update endpoint does not use `PatientUpdateSchema`.

**Impact:** Mass assignment vulnerability -- an attacker could update arbitrary patient fields including `organization_id`, `status`, or any column that should be server-controlled. This could be used to transfer patients between organizations or manipulate PHI data integrity.

**Remediation:**
```typescript
const validation = validateRequest(PatientUpdateSchema, updates);
if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
}
const patient = await updatePatient(id, context.user.organizationId || '', validation.data);
```

---

### HIGH-3: Treatment Plan API Missing Zod Validation

**File:** `/src/app/api/ai/treatment-plan/route.ts`, lines 12-24
**Issue:** The treatment plan endpoint accepts `body.patientData || body.patientProfile` and `body.diagnoses` with only basic null checks and a manual length check. There is no Zod schema validation, despite `AITreatmentPlanSchema` existing in the validation schemas file. The `diagnoses` field is not validated as an array, and `patientProfile` could contain any arbitrary JSON.

**Impact:** The `patientProfile` object is passed directly to the AI service, potentially including injected prompts. Without proper validation, an attacker could inject prompt manipulation content (prompt injection) to make the AI generate harmful treatment recommendations. In a psychiatric EHR, this could lead to dangerous clinical decisions.

**Remediation:** Apply the existing `AITreatmentPlanSchema`:
```typescript
const validation = validateRequest(AITreatmentPlanSchema, body);
if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
}
```

---

### HIGH-4: PHI Logged in Treatment Plan Audit Event

**File:** `/src/app/api/ai/treatment-plan/route.ts`, line 45
**Issue:** The audit log event includes `patientName: patientProfile.name || 'Unknown'` in the `details` field. Patient names are PHI and should never be stored in audit log detail fields that may have different retention/access policies than clinical data.

**Impact:** HIPAA violation -- PHI (patient name) leaking into audit logs which may be accessed by administrators or exported without the same access controls as clinical data.

**Remediation:**
```typescript
details: {
    action: 'AI_TREATMENT_PLAN_GENERATION',
    // Remove patientName -- it's PHI
    diagnosisCount: Array.isArray(diagnoses) ? diagnoses.length : 1,
},
```

---

### HIGH-5: Encounter Tracking Lacks Input Validation and Org Scoping

**File:** `/src/app/api/encounters/tracking/route.ts`, lines 14-47
**Issue:** (A) The `action` field is not validated against an allowed set of values and is used in constructing audit log actions (`encounter_${action}`), which could be used for log injection. (B) The `encounterId` is not validated as a UUID. (C) There is no verification that the encounter belongs to the user's organization -- the tracking event is inserted with the user's org ID, but the encounter itself is not checked.

**Impact:** A user could submit tracking events for encounters belonging to other organizations, polluting their audit trail. The unvalidated `action` field could inject misleading entries into audit logs, undermining HIPAA audit integrity.

**Remediation:**
```typescript
const TrackingSchema = z.object({
    encounterId: UUIDSchema,
    action: z.enum(['started', 'paused', 'resumed', 'captured', 'completed']),
    metadata: z.record(z.unknown()).optional(),
    patientId: UUIDSchema.optional(),
});
// Verify encounter belongs to organization before tracking
```

---

### HIGH-6: Auditor Batch Action Missing Organization Scoping

**File:** `/src/app/api/auditor/batch-action/route.ts`, lines 20-28
**Issue:** The batch approve/flag operations use `.in('id', submissionIds)` without filtering by `organization_id`. While the route requires AUDITOR/ADMIN/SUPER_ADMIN roles, an auditor in one organization could approve or flag submissions belonging to a different organization by providing their UUIDs.

**Impact:** Cross-organization data manipulation. An auditor could approve billing submissions from another practice, bypassing quality controls.

**Remediation:**
```typescript
.in('id', submissionIds)
.eq('organization_id', context.user.organizationId) // Add org scoping
.eq('status', 'pending_audit');
```

---

### MEDIUM-1: Notes GET Returns All Fields (Over-fetching PHI)

**File:** `/src/app/api/notes/route.ts`, lines 39-47
**Issue:** The notes listing endpoint uses `SELECT *` on `clinical_notes`, returning all fields including full note content, SOAP sections, and all PHI data in the list view. The list view typically only needs metadata (id, patient name, date, status, type).

**Impact:** HIPAA minimum necessary principle violation. API responses contain more PHI than needed for the list view, increasing the attack surface if the response is intercepted or cached.

**Remediation:** Select only necessary fields for the list view:
```typescript
.select(`
    id, patient_id, status, created_at, updated_at, template_id,
    patient:patients(id, first_name, last_name)
`)
```

---

### MEDIUM-2: No Pagination on Appointments GET

**File:** `/src/app/api/appointments/route.ts`, lines 37-54
**Issue:** The appointments listing endpoint returns all appointments without pagination, using only optional `status` and `date` filters. Unlike the patients and notes endpoints which limit results with `page/limit`, appointments returns all matching rows.

**Impact:** For organizations with many appointments, this could return thousands of records containing PHI (patient names, appointment details). Large payloads increase latency and exposure risk. Also enables enumeration of the full appointment schedule.

**Remediation:** Add pagination:
```typescript
const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
query = query.range((page-1)*limit, page*limit - 1);
```

---

### MEDIUM-3: No Pagination on Billing GET

**File:** `/src/app/api/billing/route.ts`, lines 9-23
**Issue:** The billing listing endpoint returns all billing records without pagination.

**Impact:** Same as MEDIUM-2 -- potential exposure of large numbers of billing records containing patient financial and clinical data.

**Remediation:** Add pagination parameters and `.range()`.

---

### MEDIUM-4: Clearinghouse Config Uses Encrypted Values as Raw API Keys

**File:** `/src/app/api/managed-billing/admin/clearinghouse/test/route.ts`, lines 46-68
**Issue:** The field names `api_key_encrypted` and `api_secret_encrypted` suggest these values should be encrypted at rest, but they are used directly as API keys/secrets in HTTP requests (e.g., `Authorization: Basic ${Buffer.from(config.api_key_encrypted + ':')}...`). If these values are actually encrypted, this would fail. If they are stored in plaintext despite the column name, the column naming is misleading and the values are not actually encrypted.

**Impact:** Either (a) API keys for clearinghouses (Claim.MD, Availity) are stored in plaintext, or (b) the test endpoint would not work. Either case represents a security concern for HIPAA BAA-covered integrations.

**Remediation:** Implement actual encryption/decryption for clearinghouse credentials using AES-256 or similar, and decrypt before use in API calls.

---

### MEDIUM-5: Managed Billing Onboarding Accepts Raw NPI/Tax ID Without Validation

**File:** `/src/app/api/managed-billing/onboarding/route.ts`, lines 54-76
**Issue:** The onboarding POST endpoint accepts `body.practiceNpi` and `body.practiceTaxId` without Zod validation. NPI numbers have a specific format (10 digits with Luhn check) and Tax IDs are 9 digits with format XX-XXXXXXX.

**Impact:** Invalid or malicious NPI/Tax ID data could be stored, potentially causing downstream billing failures or regulatory issues. Tax IDs are PII that should be validated and handled carefully.

**Remediation:**
```typescript
const OnboardingSchema = z.object({
    practiceNpi: z.string().regex(/^\d{10}$/, 'NPI must be 10 digits'),
    practiceTaxId: z.string().regex(/^\d{2}-\d{7}$/, 'Tax ID must be XX-XXXXXXX format'),
});
```

---

### MEDIUM-6: Session Timeout Enforced Only Client-Side

**File:** `/src/lib/auth/session.ts`, lines 27-50
**Issue:** Session inactivity timeout (15 minutes) and absolute timeout (8 hours) are tracked using `localStorage` on the client. There is no server-side session timeout enforcement. A user could clear localStorage or modify the stored timestamp to bypass the timeout.

**Impact:** HIPAA requires automatic session termination after periods of inactivity. Client-only enforcement is bypassable, meaning a session could remain active indefinitely if the user (or an attacker with the session cookie) manipulates localStorage.

**Remediation:** Implement server-side session validation that checks `last_activity_at` timestamps stored in the database or Supabase session metadata. The `withAuth` wrapper should verify the session has not exceeded the inactivity or absolute timeout.

---

### MEDIUM-7: EHR Audit Log GET Has No Organization Filter

**File:** `/src/app/api/ehr/audit-log/route.ts`, lines 24-40
**Issue:** The endpoint queries `audit_logs` with a `.like('action', 'EHR_%')` filter but does not filter by `organization_id`. The comment says "RLS will filter by organization for non-super-admins" but the `withAuth` wrapper does not enforce `requireOrganization: true`, and if RLS is not configured for audit_logs, users could see EHR audit entries from other organizations.

**Impact:** Cross-organization audit log exposure. An authenticated user could see EHR integration activity from other practices.

**Remediation:** Add explicit organization filtering:
```typescript
.eq('organization_id', context.user.organizationId)
```
Or add `requireOrganization: true` to the `withAuth` options.

---

### MEDIUM-8: Rate Limiting Uses Exact Pathname as Key

**File:** `/src/lib/security/rate-limit.ts`, lines 125-128
**Issue:** The in-memory rate limit key is `${identifier}:${pathname}`, using the exact pathname. This means `/api/patients/uuid-1` and `/api/patients/uuid-2` each get their own rate limit counter. An attacker could iterate through different UUIDs to bypass rate limits while effectively brute-forcing patient IDs.

**Impact:** Rate limiting is less effective for dynamic routes, allowing enumeration attacks on patient IDs, note IDs, and appointment IDs without triggering rate limits.

**Remediation:** Normalize the pathname by replacing dynamic segments:
```typescript
const normalizedPath = pathname.replace(/\/[0-9a-f-]{36}/gi, '/:id');
const key = `${identifier}:${normalizedPath}`;
```

---

### LOW-1: Intrusion Detection Safelists Broad API Paths

**File:** `/src/middleware.ts`, lines 16-27
**Issue:** The intrusion detection safelist includes broad paths like `/api/patients`, `/api/notes`, `/api/appointments`, `/api/billing`, and `/api/ai/`. This means SQL injection and XSS checks in the URL are skipped for the majority of API endpoints. The safelist was added because legitimate path patterns (like "create-room") trigger false positives, but the approach is too broad.

**Impact:** Reduced effectiveness of the WAF-like protection. An attacker could embed injection payloads in URL paths of these safelisted endpoints without detection at the middleware level.

**Remediation:** Narrow the safelist to only the specific paths that trigger false positives, not entire API trees. For body-level injection detection, rely on Zod validation rather than URL pattern matching.

---

### LOW-2: CSP Includes `unsafe-eval` for Daily.co SDK

**File:** `/next.config.ts`, line 35
**Issue:** The Content Security Policy includes `'unsafe-eval'` in the `script-src` directive to support the Daily.co SDK. While this is a known requirement for Daily.co, it weakens XSS protections site-wide.

**Impact:** If an XSS vulnerability exists elsewhere in the application, `unsafe-eval` allows the attacker to execute arbitrary JavaScript via `eval()`, which would be blocked by a stricter CSP.

**Remediation:** Consider using Daily.co's iframe-based integration which does not require `unsafe-eval` in the parent page's CSP. If not feasible, document this as an accepted risk with compensating controls (Zod validation, output encoding).

---

### LOW-3: In-Memory Rate Limiting and Idempotency Stores Not Suitable for Production

**File:** `/src/lib/security/rate-limit.ts` (in-memory store), `/src/app/api/subscriptions/webhook/route.ts` (in-memory processedEvents)
**Issue:** Both the rate limiting fallback and the Stripe webhook idempotency check use in-memory `Map` objects. In a multi-instance deployment (Vercel serverless), each instance has its own memory, making these checks ineffective.

**Impact:** Rate limits can be bypassed by hitting different server instances. Stripe webhook events could be processed multiple times across instances, potentially causing duplicate subscription activations.

**Remediation:** Use Redis (Upstash is already configured for rate limiting -- ensure it is active in production). For webhook idempotency, store processed event IDs in the database.

---

### LOW-4: Medication Review Endpoint Returns 200 on Error

**File:** `/src/app/api/ai/smart-triage/medication-review/route.ts`, lines 213-218
**Issue:** When the medication review endpoint catches an error, it returns HTTP 200 with demo data rather than an error status code. This makes it impossible for clients to distinguish between a successful response and a fallback due to an error.

**Impact:** Client applications cannot detect when the AI medication review has failed and is returning demo/mock data. Clinicians could unknowingly rely on demo data for medication safety decisions.

**Remediation:** Return a non-200 status code (e.g., 503) with the demo data, or include a clear `error: true` flag that the client must check.

---

### LOW-5: Missing CORS Configuration

**File:** `/src/middleware.ts`, `/next.config.ts`
**Issue:** There is no explicit CORS configuration in the middleware or Next.js config. Next.js defaults allow same-origin requests only, but the CSRF validation in `csrf.ts` accepts any `*.vercel.app` subdomain (line 92-93), which could include preview deployments from other Vercel accounts.

**Impact:** A malicious application hosted on `evil.vercel.app` would pass the CSRF origin check and could make authenticated API requests if the user has an active session.

**Remediation:** Restrict the Vercel app hostname check to only your project's deployment pattern:
```typescript
if (url.hostname.endsWith('.vercel.app')) {
    // Only allow your project's deployments
    return url.hostname.includes('chart-spark');
}
```

---

## Summary of Positive Security Patterns

The following security measures are well-implemented and should be preserved:

1. **Centralized `withAuth` Wrapper** - All API routes consistently use the `withAuth` higher-order function for authentication, role-based authorization, CSRF protection, and MFA enforcement.

2. **Zod Validation Schemas** - A comprehensive schema library exists at `/src/lib/validation/schemas.ts` and is used by most endpoints (patients, notes, billing, AI endpoints).

3. **HIPAA Audit Logging** - All PHI access events are logged with user identity, IP address, user agent, and risk level via `logAuditEvent` and `logPHIAccess`.

4. **Safe Error Handling** - The `sanitizeError()` function strips PHI from error messages before logging, and error responses never leak internal details.

5. **Organization Isolation** - Most endpoints properly scope queries with `organization_id` and check cross-org access attempts.

6. **Note Signing Protection** - Race condition prevention using `.eq('is_signed', false)` in the update query for note signing.

7. **Service Role Client Isolation** - The service role client is clearly documented as server-only with warnings against client usage.

8. **Security Headers** - Comprehensive security headers including HSTS, CSP, X-Frame-Options, and Permissions-Policy.

9. **File Upload Security** - Robust file validation with MIME type checking, dangerous extension blocking, double extension detection, and secure path generation.

10. **MFA Enforcement** - Privileged roles (ADMIN, SUPER_ADMIN, AUDITOR) require MFA with fail-closed behavior.

---

## Remediation Priority

| Priority | Findings | Estimated Effort |
|----------|----------|-----------------|
| P0 - Immediate | CRITICAL-1 (note deletion org bypass), CRITICAL-2 (open redirect) | 2-4 hours |
| P0 - Immediate | CRITICAL-3 (feature check fail-open), CRITICAL-4 (claims no validation) | 2-3 hours |
| P1 - This Sprint | HIGH-1 through HIGH-6 (validation gaps, PHI leakage, org scoping) | 1-2 days |
| P2 - Next Sprint | MEDIUM-1 through MEDIUM-8 (over-fetching, pagination, session mgmt) | 2-3 days |
| P3 - Backlog | LOW-1 through LOW-5 (hardening, CORS, monitoring) | 1-2 days |

---

*Report generated by API Designer audit on 2026-03-18*
