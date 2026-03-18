# ChartSpark Architecture Security Audit Report

**Date:** 2026-03-18
**Auditor:** Software Architecture Review
**Application:** ChartSpark - Psychiatric EHR (Electronic Health Record)
**Stack:** Next.js 16 / Supabase / Vercel / Daily.co / Stripe / Azure OpenAI
**Branch:** pre-production-audit

---

## Executive Summary

ChartSpark is a multi-tenant psychiatric EHR handling PHI/HIPAA-regulated data. The application has undergone multiple rounds of security remediation (evidenced by SEC-, CODEX-, INTEGRITY- prefixed comments). The overall architecture demonstrates security-awareness, with centralized auth, RLS policies, audit logging, and encryption in place. However, this audit identified **3 CRITICAL**, **7 HIGH**, **6 MEDIUM**, and **5 LOW** severity findings that must be addressed before production deployment.

The most severe issues are: (1) secrets committed to version control, (2) RLS policies on PHI tables that permit unrestricted cross-organization reads, and (3) an open redirect in the auth callback.

---

## CRITICAL Findings

### CRIT-1: Production Secrets Committed to Version Control

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/.env.local`
**Lines:** 1-38

**Description:** The `.env.local` file is committed to the repository and contains production secrets including:
- Supabase service role key (line 7) -- full database bypass
- Supabase anon key (line 6)
- Daily.co API key (line 8)
- Upstash Redis credentials (lines 9-10)
- Azure OpenAI API key (line 11)
- Resend API key (line 35)
- PHI encryption key (line 38)
- Vercel OIDC token (line 3)
- CRON secret (line 34)

Although `.env*` is in `.gitignore` (line 34), the file is already tracked in the repository. The `SUPABASE_SERVICE_ROLE_KEY` bypasses ALL RLS policies and grants full database access. The `PHI_ENCRYPTION_KEY` is the single key protecting all encrypted PHI.

**HIPAA Impact:** If this repository is ever made public or accessed by unauthorized persons, all patient data is immediately compromised. This constitutes a reportable breach under HIPAA.

**Remediation:**
1. Immediately rotate ALL exposed secrets (Supabase service role key, PHI encryption key, all API keys).
2. Remove `.env.local` from git tracking: `git rm --cached .env.local`
3. Force-push to remove secrets from git history, or better: rotate all secrets.
4. Use Vercel environment variables exclusively for production.
5. Implement secret scanning in CI/CD (e.g., `gitleaks`, GitHub secret scanning).

---

### CRIT-2: RLS Policies on PHI Tables Allow Unrestricted Cross-Organization Access

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/migrations/20260218_vitals_triage_tables.sql`
**Lines:** 188-207

**Description:** Multiple tables containing PHI have RLS policies that use `USING (true)`, which means ANY authenticated user can read, insert, or update ALL records across ALL organizations:

```sql
-- VITALS POLICIES
CREATE POLICY "vitals_select" ON vitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "vitals_insert" ON vitals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vitals_update" ON vitals FOR UPDATE TO authenticated USING (true);

-- SCREENING SCORES POLICIES
CREATE POLICY "screenings_select" ON screening_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "screenings_insert" ON screening_scores FOR INSERT TO authenticated WITH CHECK (true);

-- SMART TRIAGE RESULTS POLICIES
CREATE POLICY "triage_select" ON smart_triage_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "triage_insert" ON smart_triage_results FOR INSERT TO authenticated WITH CHECK (true);

-- MEDICATION INTERACTION LOG POLICIES
CREATE POLICY "interaction_log_select" ON medication_interaction_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "interaction_log_insert" ON medication_interaction_log FOR INSERT TO authenticated WITH CHECK (true);

-- AI PROMPTS POLICIES
CREATE POLICY "prompts_all" ON ai_prompts FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

All these tables have an `organization_id` column but the RLS does not enforce tenant isolation. A user from Organization A can read vitals, screening scores, medication interactions, and triage results for patients in Organization B.

**HIPAA Impact:** Complete multi-tenant isolation failure for clinical data. Any authenticated user can access PHI from any organization. This is a HIPAA breach-enabling defect.

**Remediation:** Replace all `USING (true)` policies with organization-scoped policies:
```sql
CREATE POLICY "vitals_select" ON vitals FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "vitals_insert" ON vitals FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
```
Apply this pattern to `vitals`, `screening_scores`, `smart_triage_results`, `medication_interaction_log`. The `ai_prompts` table does not contain PHI but should still restrict write access to SUPER_ADMIN.

---

### CRIT-3: Open Redirect in Auth Callback

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/callback/route.ts`
**Lines:** 4-29

**Description:** The auth callback reads the `next` query parameter and redirects to it without validation:

```typescript
const next = searchParams.get("next") ?? "/dashboard";
// ...
return NextResponse.redirect(`${origin}${next}`);
```

An attacker can craft a malicious callback URL like:
`/api/auth/callback?code=VALID_CODE&next=//evil.com`

The browser will interpret `//evil.com` as a protocol-relative URL and navigate to `evil.com`. More sophisticated payloads like `next=/\x09/evil.com` or encoded variants can also bypass simple checks.

Additionally, when `x-forwarded-host` is present (line 19), the redirect uses that host directly:
```typescript
return NextResponse.redirect(`https://${forwardedHost}${next}`);
```
An attacker who can control the `X-Forwarded-Host` header can redirect to any domain.

**HIPAA Impact:** Session tokens could be exfiltrated via phishing. The auth code could be intercepted by a malicious redirect target.

**Remediation:**
1. Validate `next` is a relative path starting with `/` and does not contain `//`, `\`, or encoded variants.
2. Allowlist valid redirect paths or validate against a pattern.
3. Do not trust `X-Forwarded-Host` directly; validate it against configured domains.
```typescript
// Validate redirect path
const isValidRedirect = (path: string) => {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
};
const next = searchParams.get("next") ?? "/dashboard";
const safeNext = isValidRedirect(next) ? next : "/dashboard";
```

---

## HIGH Findings

### HIGH-1: Note Deletion Uses Service Role Client Without Organization Scoping

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/notes/[id]/route.ts`
**Lines:** 161-208

**Description:** The `handleDelete` function uses `createServiceRoleClient()` (which bypasses ALL RLS) to delete notes, but it never verifies that the note belongs to the requesting user's organization:

```typescript
const adminClient = createServiceRoleClient();
const { error, data: deletedData } = await adminClient
    .from('clinical_notes')
    .delete()
    .eq('id', id)  // Only filters by ID, no org check
    .select();
```

There is no `requiredRole` restriction on the DELETE export (line 212), and no organization verification before deletion. Any authenticated user can delete any clinical note by ID.

**HIPAA Impact:** Unauthorized destruction of clinical records. Any user can delete notes from any organization.

**Remediation:** Add organization scoping to the delete query and restrict to appropriate roles:
```typescript
.eq('id', id)
.eq('organization_id', context.user.organizationId)
```
Additionally, update the export to require specific roles:
```typescript
export const DELETE = withAuth(handleDelete, { requiredRole: ['ADMIN', 'SUPER_ADMIN'] });
```

---

### HIGH-2: Lockout Check Uses Browser Client (Client-Side Bypass)

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/auth/lockout.ts`
**Lines:** 1, 24-76

**Description:** The `lockout.ts` module imports `createClient` from `@/lib/supabase/client` (the browser client). The lockout check and login attempt recording happen client-side, meaning:

1. The lockout check can be bypassed by directly calling the Supabase auth API.
2. The login_attempts RLS policy `WITH CHECK (TRUE)` for INSERT means any authenticated user can insert false login attempts.
3. The `recordLoginAttempt` function (line 104) deletes all failed attempts on successful login using the browser client, which RLS may restrict.

**HIPAA Impact:** Brute force protection can be trivially bypassed by calling Supabase auth directly, bypassing the client-side lockout check.

**Remediation:** Move lockout checking to a server-side API route or middleware. Use the service role client for querying and recording login attempts. The lockout verification should be a server-side gate that cannot be bypassed.

---

### HIGH-3: Patient Update Endpoint Accepts Arbitrary Fields

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/patients/[id]/route.ts`
**Lines:** 52-71

**Description:** The `handlePatch` function passes raw request JSON directly to `updatePatient`:

```typescript
const updates = await context.request.json();
const patient = await updatePatient(id, context.user.organizationId || '', updates);
```

And `updatePatient` in `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/data/patients.ts` (line 448-453) passes the input directly to Supabase:

```typescript
const { data: patient, error } = await supabase
    .from('patients')
    .update(input)  // Raw input from client
    .eq('id', patientId)
    .select()
    .single();
```

There is no Zod validation on the PATCH endpoint (unlike POST which uses `PatientCreateSchema`). A malicious user could set `organization_id` to a different org, change `status` to bypass soft-delete, or inject unexpected fields.

**HIPAA Impact:** Potential for data manipulation, organization boundary bypass, and unauthorized patient record modification.

**Remediation:** Add `PatientUpdateSchema` validation to the PATCH handler:
```typescript
const validation = validateRequest(PatientUpdateSchema, rawData);
if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
}
```
Explicitly exclude `organization_id`, `id`, `created_by` from allowed update fields.

---

### HIGH-4: Session Timeout Enforcement is Client-Side Only

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/auth/session.ts`
**Lines:** 1-131

**Description:** The HIPAA session timeout (15-minute inactivity, 8-hour absolute) is implemented entirely with `localStorage` in the browser:

```typescript
export function recordActivity(): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_CONFIG.storageKey, Date.now().toString());
    }
}
```

There is no server-side session timeout enforcement. The Supabase session JWT remains valid regardless of the client-side activity tracking. A user (or attacker with a stolen token) can:
1. Clear localStorage to reset the timeout
2. Manually set the activity timestamp to the future
3. Use the JWT directly in API calls without any timeout enforcement

The middleware (`updateSession`) refreshes the Supabase session but does not enforce inactivity timeout.

**HIPAA Impact:** HIPAA requires automatic session termination after inactivity. Client-side-only enforcement does not meet this requirement.

**Remediation:** Implement server-side session tracking:
1. Store last-activity timestamp in Supabase (e.g., `users.last_activity_at`).
2. In the middleware or `withAuth` wrapper, check if `last_activity_at` exceeds the timeout threshold.
3. Reject requests and force re-authentication when the timeout is exceeded.
4. Consider using Supabase's `sessionTimeout` configuration if available.

---

### HIGH-5: `getSession()` Used Instead of `getUser()` for Auth Validation

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/auth/api-auth.ts`
**Line:** 40

**Description:** The `getAuthenticatedUser` function uses `supabase.auth.getSession()`:

```typescript
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
```

Per Supabase security documentation, `getSession()` reads from local storage/cookies and does NOT validate the JWT against the Supabase server. `getUser()` makes a server-side call to verify the token is still valid. Using `getSession()` means:
1. Revoked tokens still work until they expire
2. Deactivated users can continue accessing the API until their JWT expires
3. A stolen JWT cannot be invalidated

Note: The middleware correctly uses `getUser()` (line 107 of middleware.ts), but API routes all go through `getAuthenticatedUser` which uses the insecure `getSession()`.

**HIPAA Impact:** Terminated employees or compromised accounts cannot be immediately locked out of API access. Supabase JWTs typically have a 1-hour expiry, creating a window of unauthorized access.

**Remediation:** Replace `getSession()` with `getUser()` in `getAuthenticatedUser`:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
```

---

### HIGH-6: MFA Not Required for API Routes Accessing PHI

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/patients/route.ts` (and all PHI API routes)
**Lines:** 142-148

**Description:** While MFA is enforced in the middleware for page navigation (for ADMIN, SUPER_ADMIN, AUDITOR roles), API route handlers do not require MFA. The `withAuth` options include a `requireMFA` flag, but it is not used on any PHI-accessing endpoint:

```typescript
export const GET = withAuth(handleGet, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    // No requireMFA: true
});
```

A user with MFA required can:
1. Authenticate with password only (aal1)
2. Be blocked from navigating in the UI
3. But directly call `/api/patients`, `/api/notes`, etc. and access PHI

Additionally, MFA is not required for regular `USER` role at all (only ADMIN/SUPER_ADMIN/AUDITOR), even though all users access PHI.

**HIPAA Impact:** MFA enforcement has a bypass path through direct API access.

**Remediation:**
1. Add `requireMFA: true` to all PHI-accessing API routes for privileged roles.
2. Consider requiring MFA for all users accessing PHI, not just admin roles.
3. Implement MFA validation in the `withAuth` wrapper by default for routes with `requireOrganization: true`.

---

### HIGH-7: Audit Log Insert Policy Allows Any Authenticated User to Write

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/schema.sql`
**Lines:** 710-713

**Description:** The audit_logs table has an overly permissive INSERT policy:

```sql
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);
```

Similarly for login_attempts (line 664-667):
```sql
CREATE POLICY "System can insert login attempts"
  ON login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);
```

Any authenticated user can insert arbitrary audit log entries, potentially:
1. Flooding the audit log to mask real security events
2. Injecting false audit entries to frame other users
3. Inserting misleading PHI access records

**HIPAA Impact:** Audit log integrity is compromised. HIPAA requires that audit logs be tamper-proof.

**Remediation:** Audit log insertion should only be allowed via the service role client. Remove the `WITH CHECK (TRUE)` policy for authenticated users. Use `service_role` for audit log insertions:
```sql
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO service_role
  USING (true)
  WITH CHECK (true);
```
Update the application code to use the service role client for all audit log writes.

---

## MEDIUM Findings

### MED-1: CSP Includes `unsafe-eval` and `unsafe-inline`

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/next.config.ts`
**Lines:** 33-48

**Description:** The Content Security Policy includes both `'unsafe-inline'` and `'unsafe-eval'` in the script-src directive:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co
```

While `unsafe-eval` is noted as required by the Daily.co SDK, this significantly weakens XSS protection. `unsafe-inline` is present for Tailwind CSS.

**Remediation:**
1. Use nonce-based CSP for scripts instead of `unsafe-inline`.
2. Investigate if Daily.co has updated their SDK to work without `unsafe-eval`.
3. If `unsafe-eval` is truly required, restrict it to telehealth routes only.

---

### MED-2: In-Memory Rate Limiting and Idempotency Not Suitable for Production

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/security/rate-limit.ts` (line 40)
**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/subscriptions/webhook/route.ts` (line 16)

**Description:** Both the rate limiter and the Stripe webhook idempotency handler use in-memory stores:
```typescript
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();
const processedEvents = new Map<string, number>();
```

On Vercel serverless, each function invocation may have a fresh memory space. This means:
1. Rate limits are not enforced across instances
2. Stripe webhook events may be processed multiple times

While Upstash Redis is configured for rate limiting, the webhook idempotency has no Redis fallback.

**Remediation:**
1. Ensure Upstash Redis is always available in production for rate limiting.
2. Move webhook idempotency to Redis or a database table.
3. Add startup validation that Redis is configured in production.

---

### MED-3: PHI Encryption Not Applied at Data Layer

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/data/patients.ts`
**Lines:** 275-420

**Description:** While the encryption module (`encryption.ts`) defines `PHI_ENCRYPTED_FIELDS` including `date_of_birth`, `phone`, `email`, `ssn`, `insurance_id`, etc., the patient data layer does NOT call `encryptPHIFields()` before inserting or `decryptPHIFields()` after reading:

```typescript
// createPatient - no encryption
const { data: patient, error: patientError } = await supabase
    .from('patients')
    .insert({
        phone: input.phone || null,       // Stored in plaintext
        email: input.email || null,       // Stored in plaintext
        date_of_birth: input.date_of_birth || null,  // Stored in plaintext
    })
```

PHI fields are stored in plaintext in the database despite the encryption infrastructure being built.

**HIPAA Impact:** PHI is not encrypted at rest at the application level. While Supabase provides database-level encryption (TDE), application-level encryption provides defense-in-depth and protects against database admin access.

**Remediation:**
1. Call `encryptPHIFields()` in `createPatient` and `updatePatient` before writing.
2. Call `decryptPHIFields()` in `getPatientById` and `getPatients` after reading.
3. Run a data migration to encrypt existing plaintext PHI.

---

### MED-4: `searchPatients` Fetches All Org Patients Client-Side

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/data/patients.ts`
**Lines:** 185-266

**Description:** The `searchPatients` function loads ALL patients for an organization into memory, then filters client-side:

```typescript
const { data: allPatients, error } = await dbQuery
    .order('created_at', { ascending: false });
// Client-side search across name, email, phone fields
const filtered = (allPatients || []).filter((patient: any) => { ... });
```

For organizations with many patients, this:
1. Transfers all patient records over the network
2. Loads all PHI into server memory
3. Creates a performance bottleneck
4. Increases attack surface (more data in memory)

**Remediation:** Use Supabase's `ilike` or `textSearch` for server-side search:
```typescript
.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
```

---

### MED-5: Claim Submission Has No Role Restriction

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/managed-billing/claims/[id]/submit/route.ts`
**Line:** 63

**Description:** The claim submission endpoint has no role restriction:
```typescript
export const POST = withAuth(handlePost);  // No requiredRole
```

Any authenticated user (including regular `USER` role) can submit insurance claims, which is a high-risk financial operation that should be restricted to billing staff or admin roles.

**Remediation:** Add appropriate role restrictions:
```typescript
export const POST = withAuth(handlePost, { requiredRole: ['ADMIN', 'SUPER_ADMIN'] });
```

---

### MED-6: Note Sign Endpoint Has No Role Restriction

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/notes/[id]/sign/route.ts`
**Line:** 157

**Description:** While the handler checks that the signer is the note's provider (or SUPER_ADMIN), the endpoint has no `requiredRole` in the `withAuth` options:
```typescript
export const POST = withAuth(handlePost);  // No requiredRole
```

The AUDITOR role can potentially sign notes, which should be a clinician-only operation.

**Remediation:** Add role restriction: `requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN']`

---

## LOW Findings

### LOW-1: SQL Injection Pattern Detection Has False Positives in IDS

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/security/intrusion-detection.ts`
**Lines:** 25-33

**Description:** The SQL injection patterns match common words like `SELECT`, `CREATE`, `UPDATE`, `DELETE` as single words. The safelist approach in middleware.ts mitigates this, but the IDS patterns themselves are overly broad. A clinical note containing the word "select" or "create" in the URL would trigger false positives if the path is not safelisted.

**Remediation:** Refine IDS patterns to require SQL syntax context (e.g., `SELECT ... FROM`, `' OR '1'='1`).

---

### LOW-2: Inconsistent Table References Between `notes` and `clinical_notes`

**File:** Multiple API routes

**Description:** The codebase references both `notes` and `clinical_notes` tables:
- `schema.sql` defines a `notes` table
- API routes reference `clinical_notes` table
- `chart-summary/route.ts` queries `notes` table (line 89)
- `notes/route.ts` queries `clinical_notes` table (line 42)

This suggests a schema migration renamed the table, but not all code was updated consistently. This could cause runtime errors.

**Remediation:** Audit all table references and ensure consistency.

---

### LOW-3: Signout Route References `profiles` Table Instead of `users`

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/signout/route.ts`
**Line:** 23-26

**Description:** The signout handler queries the `profiles` table for user info, but the main users table is `users`. This may fail silently, resulting in incomplete audit logs.

**Remediation:** Change to query the `users` table.

---

### LOW-4: No DELETE Policy Defined for Several PHI Tables

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/schema.sql`

**Description:** The `patients`, `encounters`, and `notes` tables do not have explicit DELETE RLS policies. In Supabase, if no DELETE policy is defined, DELETE operations are denied by default (which is safe), but this should be made explicit and documented.

**Remediation:** Add explicit DELETE policies or document that deletion is intentionally service-role only.

---

### LOW-5: No Data Retention/Deletion Policy Implemented

**Description:** HIPAA requires defined data retention policies. The application implements soft-delete (archiving) for patients but has no:
1. Automated data retention enforcement
2. Hard-delete capability for expired records
3. Data retention period configuration
4. Right-to-delete workflow

**Remediation:** Implement configurable retention policies with automated cleanup.

---

## Architecture Assessment Summary

### Strengths
- **Centralized auth wrapper (`withAuth`)**: Provides consistent authentication, CSRF protection, feature gating, and role checking across API routes.
- **Comprehensive audit logging**: HIPAA audit events are well-categorized with PHI access tracking, risk levels, and sanitization of details.
- **Encryption infrastructure**: AES-256-GCM with per-record salts, versioned format, and migration path from legacy encryption.
- **Input validation**: Zod schemas provide structured validation for most endpoints.
- **Security headers**: Strong CSP, HSTS, X-Frame-Options, and Permissions-Policy configured.
- **MFA architecture**: TOTP-based MFA with Supabase integration, enforced for privileged roles in middleware.
- **Safe logging**: PHI-aware logging that redacts sensitive fields.
- **Rate limiting**: Tiered rate limiting with fail-closed for auth endpoints and circuit breaker pattern.
- **File upload security**: MIME type validation, extension blocking, path traversal prevention, and secure file naming.

### Areas Requiring Improvement
- **RLS policy consistency**: Core tables have proper org-scoped policies, but newer tables (vitals, screenings, triage) use `USING (true)`.
- **Defense-in-depth gaps**: API routes rely on RLS as the only database-level guard, but some tables have broken RLS (CRIT-2).
- **Secret management**: Secrets in version control (CRIT-1) is the most urgent fix.
- **Server-side session enforcement**: Session timeout is client-side only (HIGH-4).
- **PHI encryption adoption**: Encryption code exists but is not integrated into the data access layer (MED-3).

### Recommended Priority Order
1. **Immediate (before any deployment):** CRIT-1 (rotate secrets), CRIT-2 (fix RLS), CRIT-3 (open redirect)
2. **Before production:** HIGH-1 through HIGH-7
3. **Within first sprint:** MED-1 through MED-6
4. **Scheduled:** LOW-1 through LOW-5

---

*Report generated by architecture security review on 2026-03-18.*
