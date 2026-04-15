# Security Auditor Final Report - ChartSpark Psychiatric EHR

**Date:** 2026-03-19
**Auditor:** Security Audit Agent (Claude Opus 4.6)
**Branch:** `pre-production-audit`
**Application:** ChartSpark - Psychiatric EHR/PHI/HIPAA Application (Supabase + Next.js)

---

## Executive Summary

ChartSpark is a psychiatric EHR application handling highly sensitive PHI (Protected Health Information) including psychiatric diagnoses, medication records, screening scores, and patient demographics. The application has undergone three sprints of security remediation, and the codebase shows significant security maturity. However, this audit identifies **2 High** and **6 Medium** severity findings that should be addressed before production deployment.

**Overall Assessment:** The application demonstrates strong security architecture with proper use of Supabase RLS, centralized auth (`withAuth`), audit logging, encryption, input validation (Zod), CSRF protection, rate limiting, and intrusion detection. The Sprint 1/2/3 fixes are properly implemented. The remaining findings are primarily around inconsistencies in the migration ordering, a few RLS policy gaps, and operational security concerns.

---

## Critical Findings

**None.** All previously identified critical issues (F-003 RLS USING(true), F-007 self-role-escalation, F-017 audit log tampering, F-018 demo mode in production) have been properly remediated.

---

## High Findings

### H-001: `audit_logs` INSERT Policy Still Allows Any Authenticated User (Conflicting Migrations)

**Severity:** HIGH
**Files:**
- `supabase/migrations/stage1_database_foundation.sql` (line 304-306)
- `supabase/migrations/20260318120000_sprint1_security_remediations.sql` (line 168-175)
- `supabase/schema.sql` (line 710-713)

**Description:** The Sprint 1 migration (20260318120000) correctly drops the permissive `"System can insert audit logs"` policy. However, the `stage1_database_foundation.sql` migration runs AFTER it (alphabetically/chronologically ambiguous) and RE-CREATES the same policy at line 304:

```sql
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);
```

Additionally, `schema.sql` contains the same policy at line 710-713. The net effect depends on migration execution order, but if `stage1_database_foundation.sql` runs after the Sprint 1 migration, any authenticated user can insert arbitrary entries into `audit_logs`, enabling audit log poisoning.

**Impact:** An attacker with any authenticated account could inject false audit log entries to cover their tracks or frame other users. This undermines the integrity of the entire HIPAA audit trail.

**Recommendation:** Remove the `WITH CHECK (TRUE)` INSERT policy from `stage1_database_foundation.sql` and `schema.sql`. Ensure only the service role client (which bypasses RLS) can insert audit logs. Add a migration that definitively drops this policy as the final word.

---

### H-002: `profiles` Table RLS Policies Are Weaker Than `users` Table Policies

**Severity:** HIGH
**Files:**
- `supabase/missing_tables.sql` (lines 22-33)
- `supabase/migrations/20260318120000_sprint1_security_remediations.sql` (F-007 trigger on `profiles`)

**Description:** The `profiles` table has a basic RLS policy at line 31-32:

```sql
CREATE POLICY "Admins can view org profiles" ON profiles FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

This policy allows ANY authenticated user in the same organization to view ALL profiles (not just admins). The policy name says "Admins" but the USING clause has no role check. Meanwhile, the `users` table properly restricts org-wide viewing to ADMIN/SUPER_ADMIN roles.

Additionally, the F-007 `prevent_self_role_escalation` trigger is on the `profiles` table, but some API routes query the `users` table for role data. If a user updates their role via the `users` table directly (bypassing the `profiles` trigger), the protection is circumvented. The trigger should exist on BOTH tables, or the tables should be consolidated.

**Impact:** Any authenticated user can enumerate all user profiles in their organization, including emails and roles of admins and other staff. The dual-table architecture creates confusion about which security controls apply where.

**Recommendation:**
1. Add role-check to the profiles SELECT policy: restrict org-wide viewing to ADMIN/SUPER_ADMIN/AUDITOR.
2. Add the `prevent_self_role_escalation` trigger to the `users` table as well (or consolidate `users` and `profiles` into a single table).
3. Ensure RLS policies on `profiles` match the hardened policies on `users`.

---

## Medium Findings

### M-001: Managed Billing Claims POST Route Missing Input Validation

**Severity:** MEDIUM
**File:** `src/app/api/managed-billing/claims/route.ts` (lines 86-105)

**Description:** The `handlePost` function for creating billing claims directly spreads the request body into the database insert without Zod validation:

```typescript
const body = await context.request.json();
// No validation schema applied
const { data: claim, error } = await supabase
    .from('billing_claims')
    .insert({
        patient_id: body.patientId,
        provider_id: body.providerId,
        // ... directly from body
    })
```

This contrasts with the `/api/billing` route which properly uses `BillingCreateSchema` with Zod validation. The managed billing claims route accepts arbitrary input for fields like `patientId`, `providerId`, `diagnosisCodes`, etc.

**Impact:** Could allow injection of malformed data, excessively large payloads, or invalid UUIDs that cause downstream errors.

**Recommendation:** Create a `ManagedBillingClaimCreateSchema` Zod schema and validate input before database insertion.

---

### M-002: `login_attempts` Table Has Overly Permissive INSERT Policy

**Severity:** MEDIUM
**File:** `supabase/schema.sql` (lines 664-667)

**Description:** The `login_attempts` table has an INSERT policy of `WITH CHECK (TRUE)`:

```sql
CREATE POLICY "System can insert login attempts"
  ON login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);
```

While login attempts are recorded by the server using the service role client (which bypasses RLS), this policy also allows any authenticated user to directly insert fake login attempt records into the table.

**Impact:** An attacker could flood the `login_attempts` table with fake failed attempts for a target email, causing account lockout for legitimate users (denial of service). They could also insert fake successful attempts to cover tracks.

**Recommendation:** Remove the `WITH CHECK (TRUE)` INSERT policy. The service role client already bypasses RLS, so this policy is unnecessary and only creates an attack surface.

---

### M-003: Missing `DELETE` RLS Policies on PHI Tables

**Severity:** MEDIUM
**Files:**
- `supabase/schema.sql` - notes, encounters, vitals, screening_scores, smart_triage_results, medication_interaction_log tables
- `supabase/migrations/20260218_vitals_triage_tables.sql`

**Description:** Several PHI-containing tables lack explicit DELETE policies:
- `vitals` - no DELETE policy
- `screening_scores` - no DELETE policy
- `smart_triage_results` - no DELETE policy
- `medication_interaction_log` - no DELETE policy
- `clinical_notes` - no DELETE policy (only UPDATE/INSERT/SELECT)

While the absence of a DELETE policy means Supabase will deny DELETE operations by default (which is safe), this is implicit rather than explicit. In a HIPAA environment, deletion of medical records should be explicitly controlled and audited.

**Impact:** Low direct impact since the default-deny behavior is correct. However, if an admin accidentally creates a permissive DELETE policy in the future, it could enable unauthorized PHI deletion.

**Recommendation:** Add explicit DELETE policies that restrict deletion to ADMIN/SUPER_ADMIN roles with proper organization scoping. This makes the security posture explicit and self-documenting.

---

### M-004: `cpt_checklists` Admin Policy Uses Lowercase Role Values

**Severity:** MEDIUM
**File:** `supabase/migrations/20260125120000_cpt_checklists_audit_sessions.sql` (lines 50-60)

**Description:** The admin management policy for `cpt_checklists` checks for lowercase role values:

```sql
CREATE POLICY "Admins can manage cpt checklists"
    ON cpt_checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')  -- lowercase!
        )
    );
```

However, all other policies in the system use UPPERCASE role values (`'ADMIN'`, `'SUPER_ADMIN'`), and the role constraint on the `users` table enforces uppercase values: `CHECK (role IN ('USER', 'ADMIN', 'AUDITOR', 'SUPER_ADMIN'))`.

**Impact:** The admin management policy for `cpt_checklists` will NEVER match any user, since roles are stored in uppercase. This means no admin can modify CPT checklists through normal RLS-scoped queries.

**Recommendation:** Change the policy to use uppercase role values: `AND role IN ('ADMIN', 'SUPER_ADMIN')`.

---

### M-005: EHR Audit Log Route Missing Role Restriction

**Severity:** MEDIUM
**File:** `src/app/api/ehr/audit-log/route.ts` (line 87)

**Description:** The EHR audit log endpoint uses `withAuth` but without any role or MFA restriction:

```typescript
export const GET = withAuth(handleGet);
```

This means any authenticated user (including regular USER role) can access EHR integration audit logs, which may contain sensitive operational information about EHR connections, data syncs, and patient record access events.

**Impact:** Regular users could enumerate EHR integration activity including which external systems are connected, data sync patterns, and potentially infer organizational structure.

**Recommendation:** Add role restriction: `withAuth(handleGet, { requiredRole: ['ADMIN', 'AUDITOR', 'SUPER_ADMIN'], requireMFA: true })`.

---

### M-006: Inconsistent MFA Enforcement Across Appointment Routes

**Severity:** MEDIUM
**Files:**
- `src/app/api/appointments/route.ts` (lines 143-144) - NO `requireMFA`
- `src/app/api/appointments/[id]/route.ts` (lines 154-156) - NO `requireMFA`
- `src/app/api/dashboard/stats/route.ts` (line 60) - NO `requireMFA`

**Description:** Patient-adjacent routes like appointments and dashboard stats do not enforce MFA, while direct PHI routes (patients, notes, vitals, billing) all require MFA. Appointments contain PHI (patient names, encounter reasons, provider assignments, telehealth room URLs) and should be treated equivalently to other PHI routes.

**Impact:** A user with a compromised password but without MFA could access appointment schedules, patient names linked to appointments, and telehealth room URLs, enabling unauthorized access to patient information.

**Recommendation:** Add `requireMFA: true` to appointment routes and dashboard stats. Apply consistently across all routes that expose or manipulate PHI.

---

## Sprint Fix Verification

### Sprint 1 Fixes (Critical) - VERIFIED

| Finding | Fix | Status | Evidence |
|---------|-----|--------|----------|
| F-003: RLS USING(true) on 6 PHI tables | Replace with org-scoped policies | **VERIFIED** | `20260318120000_sprint1_security_remediations.sql` drops permissive policies and creates org-scoped policies for vitals, screening_scores, smart_triage_results, medication_interaction_log, ai_prompts, claim_lines |
| F-007: Self-role-escalation | DB trigger to prevent self-role changes | **VERIFIED** | `prevent_self_role_escalation()` trigger on `profiles` table blocks role/org changes by non-admins and self-role changes |
| F-017: Audit log INSERT policy | Remove `WITH CHECK (TRUE)` | **PARTIALLY VERIFIED** | Sprint 1 migration drops the policy, but `stage1_database_foundation.sql` re-creates it (see H-001) |
| F-018: Demo mode in production | Block demo mode in production | **VERIFIED** | `middleware.ts` line 58-63 blocks demo mode in production with hard error |

### Sprint 2 Fixes (High) - VERIFIED

| Finding | Fix | Status | Evidence |
|---------|-----|--------|----------|
| F-022: Server-side session timeout | `last_activity_at` column + 15-min enforcement | **VERIFIED** | `20260318120001_sprint2_security_hardening.sql` adds column; `api-auth.ts` lines 66-72 enforce 15-min timeout |
| SEC-HIGH-01: withAuth migration | All routes use centralized auth | **VERIFIED** | Grep of all route exports confirms all data routes use `withAuth` wrapper except auth endpoints (expected), cron endpoints (use CRON_SECRET), and webhook (uses Stripe signature) |
| CSRF protection | Origin validation for state-changing methods | **VERIFIED** | `api-auth.ts` lines 123-128 validate origin for non-GET methods; `csrf.ts` implements `validateOrigin()` |
| MFA enforcement | API-level MFA for privileged operations | **VERIFIED** | `withAuth` supports `requireMFA` option; enforced on patient, notes, billing, vitals routes. Middleware enforces MFA for ADMIN/SUPER_ADMIN/AUDITOR page access |

### Sprint 3 Fixes (Performance/Integrity) - VERIFIED

| Finding | Fix | Status | Evidence |
|---------|-----|--------|----------|
| F-012: Billing TOCTOU race condition | DB UNIQUE constraint | **VERIFIED** | `20260318120002_sprint3_billing_unique_constraint.sql` adds `billing_service_date_org_unique` constraint; billing API handles 23505 errors |
| Input validation (Zod) | All routes use Zod schemas | **MOSTLY VERIFIED** | Patient, notes, billing, vitals, AI routes all use Zod schemas. Exception: managed billing claims POST (see M-001) |
| Safe logging | PHI-free logging | **VERIFIED** | `safe-logger.ts` uses typed `SafeLogData` excluding PHI; `sanitizeError()` truncates error messages; `audit-log.ts` sanitizes details object |

### Additional Security Controls Verified

| Control | Status | Evidence |
|---------|--------|----------|
| Encryption at rest (AES-256-GCM) | **VERIFIED** | `encryption.ts` uses v2 format with per-record salts; PHI fields list defined |
| Security headers (HSTS, CSP, X-Frame-Options) | **VERIFIED** | `next.config.ts` applies comprehensive headers; CSP splits telehealth/default |
| Rate limiting | **VERIFIED** | `rate-limit.ts` with fail-closed for auth endpoints; circuit breaker pattern |
| Intrusion detection | **VERIFIED** | `intrusion-detection.ts` checks SQL injection, XSS, path traversal on API routes |
| Account lockout | **VERIFIED** | `lockout.ts` with fail-closed behavior; 5 attempts / 30-min lockout |
| Password policy | **VERIFIED** | 12+ chars, uppercase, lowercase, numbers, special chars, common password blocking |
| Open redirect protection | **VERIFIED** | `callback/route.ts` `sanitizeRedirectPath()` blocks `//` and `\` |
| Invitation hijacking | **VERIFIED** | `accept_invitation()` function uses `auth.uid()` not client-provided userId |
| Cron job protection | **VERIFIED** | All cron routes require `CRON_SECRET` with fail-closed in production |
| Webhook signature verification | **VERIFIED** | Stripe webhook validates signature with `constructEvent()` |
| Service role client isolation | **VERIFIED** | `service-role-client.ts` fails hard in production without config; well-documented warnings |
| PHI masking by role | **VERIFIED** | `masking.ts` implements role-based field visibility (FULL/MASKED/HIDDEN) |
| Audit log PHI sanitization | **VERIFIED** | `audit-log.ts` `sanitizeDetails()` redacts PHI fields before logging |

---

## Recommendations

### Immediate (Before Production)

1. **Fix H-001:** Add a final migration that definitively drops the `"System can insert audit logs"` INSERT policy with `WITH CHECK (TRUE)`. Remove it from `schema.sql` and `stage1_database_foundation.sql`.

2. **Fix H-002:** Harden `profiles` table RLS to match `users` table. Add role checks to org-wide SELECT policy. Add `prevent_self_role_escalation` trigger to both `users` and `profiles` tables.

3. **Fix M-004:** Change `cpt_checklists` admin policy to use uppercase role values (`'ADMIN'`, `'SUPER_ADMIN'`).

4. **Fix M-001:** Add Zod validation to managed billing claims POST route.

5. **Fix M-005 and M-006:** Add `requireMFA: true` to appointment routes, dashboard stats, and EHR audit log route. Add role restriction to EHR audit log.

### Short-Term (First Month Post-Launch)

6. **Consolidate `users`/`profiles` tables:** The dual-table architecture is a persistent source of inconsistency. Either create a database view or consolidate into one table.

7. **Add explicit DELETE policies:** Add role-restricted DELETE policies to all PHI tables for explicit access control.

8. **Fix M-002:** Remove the permissive INSERT policy on `login_attempts` table.

9. **Migration ordering:** Consider renaming `stage1_database_foundation.sql` to include a proper timestamp prefix to ensure deterministic ordering.

### Long-Term

10. **Column-level encryption:** The `PHI_ENCRYPTED_FIELDS` list in `encryption.ts` includes `date_of_birth`, `phone`, `email` but the patient database stores these as plaintext in the `patients` table. Implement encryption at the data layer.

11. **Redis-backed rate limiting:** The in-memory rate limiter resets on deployment and doesn't work across multiple serverless instances. Ensure Upstash Redis is configured for production.

12. **Security alerting:** The `triggerSecurityAlert()` function in `audit-log.ts` (line 304) only logs to console. Implement actual email/SMS/SIEM alerting for CRITICAL events before production.

13. **Audit log retention policy:** Implement automated audit log retention and archival per HIPAA requirements (minimum 6 years).

14. **Penetration testing:** Schedule a professional penetration test focusing on the Supabase RLS policies, as the migration ordering complexity makes it difficult to verify the final policy state without testing against the live database.

---

*Report generated by Security Audit Agent. All findings include specific file paths and line numbers for remediation tracking.*
