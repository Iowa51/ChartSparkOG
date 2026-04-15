# ChartSpark EHR Security Audit Report

**Date:** 2026-03-18
**Auditor:** Independent Security Review (Claude Code)
**Scope:** Full codebase review of ChartSpark psychiatric EHR application
**Branch:** `pre-production-audit`

---

## Executive Summary

This audit identified **5 CRITICAL**, **8 HIGH**, **6 MEDIUM**, and **4 LOW** severity findings across the ChartSpark EHR codebase. The most urgent issue is that **production secrets (Supabase service role key, API keys, encryption keys) are committed to version control in plaintext**. Several database tables containing PHI lack proper Row Level Security policies, allowing any authenticated user to read any patient's vitals, screening scores, and medication interaction data across all organizations. The application's `getSession()` usage in the API auth layer can be spoofed, and a note deletion endpoint bypasses RLS entirely using the service role client without verifying organization ownership.

Previous audit rounds have addressed many historical issues (MFA enforcement, privilege escalation in signup, CSRF protection, fail-closed patterns). However, the findings below represent remaining risks that must be remediated before production launch.

---

## CRITICAL Findings

### CRITICAL-1: Production Secrets Committed to Version Control

**Files:**
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/.env.local` (lines 1-38)
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/.env.vercel` (lines 1-14)
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/.env.vercel.production` (lines 1-36)

**Description:** Three `.env` files containing production secrets are committed to the Git repository. While `.gitignore` contains `.env*`, these files are already tracked in the repository (present in the working tree and committed). Exposed secrets include:

- `SUPABASE_SERVICE_ROLE_KEY` - Full admin access to database, bypasses all RLS
- `PHI_ENCRYPTION_KEY` - Key used to encrypt all PHI at rest
- `AZURE_OPENAI_API_KEY` - Two different keys for AI services
- `DAILY_API_KEY` - Telehealth video service key
- `UPSTASH_REDIS_REST_TOKEN` - Redis access token
- `RESEND_API_KEY` - Email service key
- `CRON_SECRET` - Cron job authentication secret
- `VERCEL_OIDC_TOKEN` - Vercel deployment tokens

**Impact:** Any person with repository access can extract the Supabase service role key and gain unrestricted read/write access to ALL patient data, bypassing all RLS policies. The PHI encryption key exposure means all encrypted PHI can be decrypted. This is a HIPAA breach scenario.

**Remediation:**
1. Immediately rotate ALL exposed secrets (especially `SUPABASE_SERVICE_ROLE_KEY` and `PHI_ENCRYPTION_KEY`)
2. Remove the `.env*` files from Git tracking: `git rm --cached .env.local .env.vercel .env.vercel.production`
3. Use `git filter-branch` or BFG Repo-Cleaner to purge secrets from Git history
4. Use Vercel Environment Variables or a secrets manager (HashiCorp Vault, AWS Secrets Manager) exclusively
5. Implement pre-commit hooks to prevent future secret commits (e.g., `detect-secrets`, `gitleaks`)

---

### CRITICAL-2: RLS Policies Missing on 6 PHI Tables (USING (true))

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/migrations/20260218_vitals_triage_tables.sql` (lines 188-207)

**Description:** Six tables containing sensitive clinical/PHI data have RLS policies set to `USING (true)`, meaning ANY authenticated user can read and write data across ALL organizations. The affected tables are:

1. **`vitals`** - Blood pressure, weight, heart rate, BMI, pain scores (lines 188-190)
2. **`screening_scores`** - PHQ-9, GAD-7, C-SSRS suicide screening, AUDIT-C substance abuse scores (lines 193-194)
3. **`smart_triage_results`** - AI clinical analysis results with diagnoses and treatment data (lines 197-199)
4. **`medication_interaction_log`** - Drug interaction alerts and provider overrides (lines 202-203)
5. **`ai_prompts`** - Fully open FOR ALL (line 207)

Additionally from other migrations:
6. **`claim_lines`** (billing infrastructure) - No RLS enabled at all

**Impact:** A clinician in Organization A can query and view vitals, mental health screening scores (including suicide risk assessments), and medication data for patients in Organization B. This is a direct HIPAA violation enabling unauthorized PHI access. The C-SSRS suicide screening data is particularly sensitive.

**Remediation:** Replace all `USING (true)` policies with organization-scoped policies:
```sql
-- Example for vitals:
DROP POLICY "vitals_select" ON vitals;
CREATE POLICY "vitals_select" ON vitals
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
         OR public.get_user_role() = 'SUPER_ADMIN');
```
Apply the same pattern to all six tables. Also enable RLS on `claim_lines` and `acknowledgements` tables.

---

### CRITICAL-3: Note Deletion Bypasses RLS Without Organization Verification

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/notes/[id]/route.ts` (lines 161-208)

**Description:** The `handleDelete` function uses `createServiceRoleClient()` (which bypasses ALL RLS) to delete clinical notes, but does NOT verify that the note belongs to the requesting user's organization before deletion. The only check is that the user is authenticated (via `withAuth`), but no `requiredRole` is specified and no org check is performed.

```typescript
// Line 169-178: Uses service role client with no org check
const adminClient = createServiceRoleClient();
const { error, data: deletedData } = await adminClient
    .from('clinical_notes')
    .delete()
    .eq('id', id)  // Only checks note ID - no org filter!
    .select();
```

Compare this to the `handlePatch` function in the same file (line 88-102) which correctly verifies `currentNote?.organization_id !== context.user.organizationId`.

**Impact:** Any authenticated user can delete any clinical note in any organization by providing its UUID. This enables cross-organization data destruction of medical records, which violates HIPAA's data integrity requirements and could constitute destruction of medical evidence.

**Remediation:**
1. Add organization ownership verification before the service role delete
2. Restrict to ADMIN/SUPER_ADMIN roles
3. Use the authenticated client with org filter instead of service role:
```typescript
const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.user.organizationId);
```

---

### CRITICAL-4: API Auth Uses getSession() Instead of getUser()

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/auth/api-auth.ts` (line 40)

**Description:** The `getAuthenticatedUser()` function, which protects ALL API routes via the `withAuth` wrapper, uses `supabase.auth.getSession()` to verify authentication:

```typescript
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
```

Per Supabase's official security documentation, `getSession()` reads the session from cookies/localStorage without re-validating the JWT with the Supabase Auth server. This means a tampered or expired JWT in a cookie could be accepted as valid. The Supabase docs explicitly state: "Use `getUser()` instead of `getSession()` inside server code" because `getUser()` sends the JWT to the Supabase Auth server for validation.

Note: The middleware correctly uses `getUser()` (line 107 of middleware.ts), but the API auth layer does not.

**Impact:** An attacker who obtains or crafts a JWT that was previously valid (or tampers with the JWT claims) could potentially bypass API authentication. Since this function protects all API endpoints handling PHI, this is a critical authentication bypass risk.

**Remediation:** Replace `getSession()` with `getUser()`:
```typescript
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
if (authError || !authUser) return null;
// Then use authUser.id for the subsequent user lookup
```

---

### CRITICAL-5: Open Redirect in Auth Callback

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/callback/route.ts` (lines 4-29)

**Description:** The auth callback endpoint accepts a `next` query parameter and redirects to it without validation:

```typescript
const next = searchParams.get("next") ?? "/dashboard";
// ...
return NextResponse.redirect(`${origin}${next}`);
```

An attacker can craft a URL like `/api/auth/callback?code=VALID_CODE&next=//evil.com` or `/api/auth/callback?code=VALID_CODE&next=/../..//evil.com`. The `forwardedHost` branch (line 19) is also exploitable: if an attacker can set the `x-forwarded-host` header, the redirect will go to an attacker-controlled domain.

**Impact:** After successful authentication, users can be redirected to a phishing site that mimics ChartSpark, capturing their freshly-authenticated session tokens or additional credentials. In a healthcare context, this could lead to credential theft for accounts with access to PHI.

**Remediation:**
1. Validate that `next` starts with `/` and does not contain `//` or external URLs
2. Validate `forwardedHost` against an allowlist of known deployment domains
```typescript
const next = searchParams.get("next") ?? "/dashboard";
// Validate redirect path
const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
```

---

## HIGH Findings

### HIGH-1: Patient Update Endpoint Lacks Input Validation

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/patients/[id]/route.ts` (lines 52-70)

**Description:** The `handlePatch` function passes raw request body directly to `updatePatient()` without Zod validation:

```typescript
const updates = await context.request.json();
const patient = await updatePatient(id, context.user.organizationId || '', updates);
```

The `updatePatient` function in the data layer (patients.ts line 450) then passes `input` directly to Supabase's `.update(input)`:

```typescript
const { data: patient, error } = await supabase
    .from('patients')
    .update(input)  // Arbitrary fields accepted
    .eq('id', patientId)
```

Compare this to the POST endpoint which correctly uses `PatientCreateSchema` for Zod validation.

**Impact:** Mass assignment vulnerability - an attacker could modify protected fields like `organization_id`, `created_by`, `status`, or any other column on the patients table by including them in the PATCH body. This could be used to transfer patients between organizations or bypass deletion controls.

**Remediation:** Apply `PatientUpdateSchema` validation:
```typescript
const validation = validateRequest(PatientUpdateSchema, rawData);
if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
}
const patient = await updatePatient(id, context.user.organizationId || '', validation.data);
```

---

### HIGH-2: Patient Delete Lacks Role Restriction

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/patients/[id]/route.ts` (line 109)

**Description:** The DELETE handler is exported with only `requireOrganization: true` but no `requiredRole`:

```typescript
export const DELETE = withAuth(handleDelete, { requireOrganization: true });
```

This means any authenticated user (including the basic USER role) can archive/delete patients. The RLS policy in the database restricts deletes to ADMIN/SUPER_ADMIN, but the API does not enforce this. If the service role client is ever used (as in CRITICAL-3 for notes), the RLS protection would be bypassed.

**Impact:** Regular clinician users could archive patient records, potentially hiding patient data from other providers. While currently protected at the database layer by RLS, this relies on a defense-in-depth principle that has already been violated elsewhere (CRITICAL-3).

**Remediation:**
```typescript
export const DELETE = withAuth(handleDelete, {
    requireOrganization: true,
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
});
```

---

### HIGH-3: Audit Log Insert Allows Any Authenticated User to Write (RLS USING(true))

**Files:**
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/schema.sql` (line 713)
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/migrations/stage1_database_foundation.sql` (lines 304-306)

**Description:** The audit_logs and login_attempts tables have INSERT policies with `WITH CHECK (TRUE)`, meaning any authenticated user can insert arbitrary audit log entries:

```sql
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);
```

**Impact:** An attacker could flood the audit log with fake entries to:
1. Obscure their actual malicious activity
2. Create false evidence of other users' actions
3. Trigger alert fatigue by generating fake CRITICAL events
4. Frame other users for policy violations

This undermines HIPAA's audit trail integrity requirements (45 CFR 164.312(b)).

**Remediation:** Restrict INSERT to service_role only, and route all audit log writes through server-side code:
```sql
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT TO service_role
  WITH CHECK (TRUE);
```

---

### HIGH-4: Demo Mode Bypasses Authentication in Production

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/supabase/middleware.ts` (lines 118-122)

**Description:** When `NEXT_PUBLIC_DEMO_MODE=true`, the middleware allows unauthenticated access to all protected routes:

```typescript
if (isDemoMode && !user) {
    console.log('[MIDDLEWARE] Demo mode - allowing unauthenticated access to:', path);
    return supabaseResponse;
}
```

The `.env.vercel` file (committed to the repo) has `NEXT_PUBLIC_DEMO_MODE="true"`. The `.env.vercel.production` file has `NEXT_PUBLIC_DEMO_MODE="false\r\n"` -- note the `\r\n` suffix which may cause string comparison issues on some platforms.

While there are checks at line 57-65 that require Supabase to be configured even in demo mode, the actual auth bypass at line 119 allows access if the user is not authenticated at all, regardless of Supabase configuration.

**Impact:** If demo mode is accidentally enabled in production (which it currently is in the Vercel environment config), any user can access all protected routes including admin panels, patient data, and billing without authentication. The `\r\n` in the production env value is also a potential bug.

**Remediation:**
1. Remove demo mode capability from production builds entirely
2. Use a separate build flag that is stripped at build time
3. Fix the `\r\n` in `.env.vercel.production`
4. Add a startup check that halts the application if demo mode is enabled in production

---

### HIGH-5: Lockout Check Fails Open on Missing Service Role Client

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/check-lockout/route.ts` (lines 32-44)

**Description:** When the service role client is not available or throws an error, the lockout check returns `locked: false`, allowing unlimited login attempts:

```typescript
try {
    supabase = createServiceRoleClient();
} catch (err: unknown) {
    console.warn('Lockout check: Service role client not configured.', err);
    return NextResponse.json({ locked: false, remainingAttempts: 5 });  // FAILS OPEN
}
if (!supabase) {
    console.warn('Lockout check: Supabase not configured, allowing login');
    return NextResponse.json({ locked: false, remainingAttempts: 5 });  // FAILS OPEN
}
```

**Impact:** If there is a transient database error or misconfiguration, brute-force protection is silently disabled, allowing unlimited credential guessing attacks against any account. Note that the comment at line 66 correctly implements fail-closed for database errors, but the service client initialization path does not.

**Remediation:** Return `locked: true` when the lockout check infrastructure is unavailable in production:
```typescript
if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ locked: true, error: 'Security service unavailable' }, { status: 503 });
    }
    return NextResponse.json({ locked: false, remainingAttempts: 5 });
}
```

---

### HIGH-6: Record Login Attempt API is Unauthenticated

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/record-attempt/route.ts`

**Description:** The `/api/auth/record-attempt` endpoint accepts POST requests without any authentication and writes directly to the database using the service role client. Any anonymous user can call this endpoint.

**Impact:** An attacker can:
1. Flood the login_attempts table with fake failed attempts for any email address, locking legitimate users out of their accounts
2. Inject false successful login records, corrupting the audit trail
3. Perform a denial-of-service by filling the database table with junk records

**Remediation:**
1. Add rate limiting specific to this endpoint (already partially in place via middleware)
2. Validate that the email corresponds to a legitimate lockout check (correlation token)
3. Consider recording attempts server-side only (triggered by the auth callback, not a client-callable API)

---

### HIGH-7: CSP Allows unsafe-eval

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/next.config.ts` (line 35)

**Description:** The Content Security Policy includes `'unsafe-eval'` in the `script-src` directive:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co
```

**Impact:** `unsafe-eval` allows execution of strings as code (via `eval()`, `Function()`, `setTimeout('string')`, etc.), which significantly weakens XSS protections. While this was added for Daily.co SDK compatibility, it applies to ALL pages, not just telehealth pages.

**Remediation:**
1. Only include `unsafe-eval` on telehealth routes (the current headers config already has separate telehealth headers but both include the same CSP)
2. Investigate if Daily.co SDK can work with `nonce`-based CSP instead
3. At minimum, restrict `unsafe-eval` to only the telehealth-specific header configuration

---

### HIGH-8: Users Can Self-Modify Their Role via Profile Update

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/schema.sql` (lines 244-248) and `fix_rls_complete.sql` (lines 77-82)

**Description:** The RLS policy allows users to update their own row in the users table without restricting which columns can be modified:

```sql
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

A user could issue a Supabase client update to change their `role` from 'USER' to 'SUPER_ADMIN', or change their `organization_id` to access another organization's data.

**Impact:** Direct privilege escalation -- any authenticated user can promote themselves to SUPER_ADMIN and gain full system access including all patient data across all organizations.

**Remediation:** Add column-level restrictions to the update policy:
```sql
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
```
Or use a trigger to prevent role/org changes from non-admin users.

---

## MEDIUM Findings

### MEDIUM-1: Patient Search Loads All Org Patients Into Memory

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/data/patients.ts` (lines 200-212)

**Description:** The `searchPatients` function loads ALL patients for an organization into memory and performs client-side filtering:

```typescript
const { data: allPatients, error } = await dbQuery
    .order('created_at', { ascending: false });
// Client-side search across name, email, phone fields
const filtered = (allPatients || []).filter(...)
```

**Impact:** For organizations with large patient panels (thousands of patients), this creates:
1. Memory exhaustion potential (DoS vector)
2. All patient PHI is loaded into server memory unnecessarily
3. Slower response times

**Remediation:** Use Supabase's `ilike` or full-text search for server-side filtering.

---

### MEDIUM-2: Email Address Logged in Middleware Warnings

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/supabase/middleware.ts` (lines 166, 181, 216)

**Description:** User email addresses are logged in console warnings:

```typescript
console.warn('Middleware: Unknown user in demo mode', user.email);
console.warn('Middleware: Deactivated account attempted access', user.email);
console.warn('Middleware: MFA required but not enrolled', user.email);
```

**Impact:** Email addresses in logs could be considered PHI when associated with a psychiatric healthcare application. Under HIPAA's minimum necessary standard, logs should not contain identifying information unless required for the log's purpose.

**Remediation:** Log user IDs instead of email addresses, or use the safe logger utility.

---

### MEDIUM-3: AI Chat Error Logging Potentially Includes PHI

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/ai/chat/route.ts` (line 70)

**Description:** When AI chat errors occur, the error message (which may contain the clinical question being asked) is logged in the audit event details:

```typescript
details: { error: error instanceof Error ? error.message : 'Unknown' },
```

Error messages from Azure OpenAI may echo back portions of the request content, which could include patient symptoms, diagnoses, or medication queries.

**Impact:** PHI could leak into audit logs accessible to auditors who should not have access to the specific clinical content.

**Remediation:** Use `sanitizeError(error)` (which truncates to 100 chars) instead of the raw error message.

---

### MEDIUM-4: Claim Lines and Acknowledgements Tables Missing RLS

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/supabase/migrations/20260129_billing_core_infrastructure.sql` (lines 188-276)

**Description:** The `claim_lines` and `acknowledgements` tables do not have RLS enabled at all. While `claim_lines` references `billing_claims` which has RLS, direct access to these tables bypasses claim-level security.

**Impact:** Any authenticated user could query claim line-level billing details across organizations.

**Remediation:** Enable RLS and add organization-scoped policies for both tables.

---

### MEDIUM-5: Webhook Handler Uses createClient() Instead of Service Role

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/subscriptions/webhook/route.ts` (lines 96, 136)

**Description:** The Stripe webhook handler uses `createClient()` (which creates a user-session-based client) for database operations. Since webhooks have no user session, this may fail or use incorrect permissions:

```typescript
const supabase = await createClient();
```

**Impact:** Subscription status updates from Stripe may silently fail if the client cannot authenticate, leaving subscriptions in incorrect states. Users may retain access to features after their subscription expires.

**Remediation:** Use `createServiceRoleClient()` for webhook handlers, as they are server-side operations without a user session.

---

### MEDIUM-6: Invitation Token Returned in API Response

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/admin/invitations/route.ts` (line 200)

**Description:** The invite URL (containing the secret token) is returned in the API response:

```typescript
const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chart-spark-og.vercel.app'}/auth/accept-invite?token=${token}`;
return NextResponse.json({ ..., inviteUrl, ... });
```

**Impact:** The invitation token is exposed to the admin's browser and could be logged by browser extensions, proxy servers, or browser history. If the admin's session is compromised, all pending invitation tokens are exposed.

**Remediation:** Only return the invite URL if the email was not successfully sent. Consider showing only a masked version in the UI.

---

## LOW Findings

### LOW-1: Rate Limit Headers Expose Internal Configuration

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/security/rate-limit.ts` (lines 277-285)

**Description:** Rate limit responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers, which expose the exact rate limiting configuration to potential attackers.

**Impact:** An attacker can precisely calibrate their attack speed to stay just under the rate limit threshold.

**Remediation:** Consider only returning `Retry-After` header, not the detailed breakdown.

---

### LOW-2: Lockout Duration Mismatch Between Client and Server

**Files:**
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/lib/auth/lockout.ts` (line 8): `lockoutDuration: 30 * 60 * 1000` (30 minutes)
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/check-lockout/route.ts` (line 11): `lockoutDuration: 5 * 60 * 1000` (5 minutes)

**Description:** The lockout duration is 30 minutes in the client-side utility but only 5 minutes in the server-side API route that actually enforces lockout.

**Impact:** Inconsistent security enforcement -- the actual lockout period is 5 minutes (trivially short for brute-force protection), while the client-side code suggests 30 minutes.

**Remediation:** Align both to 30 minutes and centralize the configuration.

---

### LOW-3: Test Files Contain Authentication Logic

**Files:**
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/test-login.js`
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/test-rls.js`
- `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/test-delete.js`

**Description:** Test files in the project root may contain hardcoded credentials or test logic that reveals security implementation details.

**Impact:** Minor information disclosure risk.

**Remediation:** Move test files to the `e2e/` directory and ensure they don't contain real credentials.

---

### LOW-4: API Signout Route Not Reviewed

**File:** `/c/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/api/auth/signout/route.ts`

**Description:** The signout route should invalidate the session server-side and clear all session-related data. Without review, it is unclear if session invalidation is properly implemented.

**Impact:** If sessions are not properly invalidated, logged-out users' sessions could be reused.

**Remediation:** Verify the signout route calls `supabase.auth.signOut()` and clears all cookies.

---

## Positive Security Controls Observed

The following security controls are correctly implemented and should be maintained:

1. **MFA Enforcement:** Properly required for ADMIN, SUPER_ADMIN, and AUDITOR roles with fail-closed behavior
2. **CSRF Protection:** Origin validation implemented for all state-changing API requests via `withAuth`
3. **Safe Logger:** HIPAA-compliant logging utility that prevents PHI from leaking into logs
4. **Input Validation:** Comprehensive Zod schemas for most API endpoints
5. **PHI Encryption:** AES-256-GCM encryption with per-record salts for sensitive fields
6. **Security Headers:** HSTS, X-Frame-Options DENY, CSP (with caveats), and other headers configured
7. **Session Management:** 15-minute inactivity timeout with 8-hour absolute timeout
8. **Intrusion Detection:** SQL injection, XSS, and path traversal pattern matching in middleware
9. **Audit Logging:** Comprehensive PHI access audit trail with risk levels
10. **Service Role Client:** Proper fail-closed behavior in production when credentials missing

---

## Remediation Priority

| Priority | Finding | Effort | HIPAA Impact |
|----------|---------|--------|--------------|
| P0 (Immediate) | CRITICAL-1: Secrets in VCS | Medium | Breach notification required if exploited |
| P0 (Immediate) | CRITICAL-2: RLS USING(true) on PHI tables | Low | Direct unauthorized PHI access |
| P0 (Immediate) | HIGH-8: Self-role-escalation via RLS | Low | Complete system compromise |
| P0 (Immediate) | CRITICAL-4: getSession vs getUser | Low | Auth bypass risk |
| P1 (Before launch) | CRITICAL-3: Note delete bypasses RLS | Low | Cross-org data destruction |
| P1 (Before launch) | CRITICAL-5: Open redirect | Low | Credential phishing |
| P1 (Before launch) | HIGH-1: Patient update no validation | Low | Mass assignment |
| P1 (Before launch) | HIGH-4: Demo mode in production | Low | Full auth bypass |
| P2 (Soon after launch) | HIGH-2: Delete role restriction | Low | Unauthorized data modification |
| P2 (Soon after launch) | HIGH-3: Audit log INSERT USING(true) | Low | Audit trail corruption |
| P2 (Soon after launch) | HIGH-5: Lockout fails open | Low | Brute force enablement |
| P2 (Soon after launch) | HIGH-6: Unauthenticated record-attempt | Medium | Account lockout attacks |
| P2 (Soon after launch) | HIGH-7: CSP unsafe-eval | Medium | XSS risk amplification |
| P3 (Post-launch) | MEDIUM-1 through MEDIUM-6 | Varies | Various |
| P4 (Maintenance) | LOW-1 through LOW-4 | Low | Minor |

---

## Conclusion

ChartSpark has implemented many security best practices but has critical gaps that must be addressed before production deployment. The most urgent items are rotating compromised secrets, fixing the wide-open RLS policies on clinical data tables, preventing self-role-escalation, and switching from `getSession()` to `getUser()` in the API auth layer. These four items alone represent the highest risk to patient data and HIPAA compliance.

The codebase shows evidence of multiple security remediation passes, which is encouraging. However, each pass has introduced new tables or endpoints that did not receive the same level of scrutiny as the original tables. A systematic check that every new table gets proper RLS and every new endpoint gets proper validation should be added to the development workflow.
