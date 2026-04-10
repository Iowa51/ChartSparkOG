# Software Architecture Audit Report - ChartSpark EHR

**Date:** 2026-03-19
**Auditor Role:** Software Architect
**Branch:** `pre-production-audit`
**Application:** ChartSpark - Psychiatric EHR/PHI/HIPAA Platform
**Stack:** Next.js 16 / React 19 / TypeScript / Supabase / Vercel

---

## Executive Summary

ChartSpark is a multi-tenant psychiatric EHR built on Supabase with a solid security-first architecture. The application demonstrates **strong HIPAA awareness** across its data layer, auth system, and audit infrastructure. Three security remediation sprints have addressed critical vulnerabilities including RLS gaps, role escalation vectors, and demo-mode isolation. The architecture follows defense-in-depth principles with Row Level Security (RLS), application-layer auth enforcement, AES-256-GCM PHI encryption, rate limiting, intrusion detection, and comprehensive audit logging.

**Overall Architecture Grade: B+**

Key strengths: multi-layered security enforcement, organization-scoped RLS on all PHI tables, encrypted PHI fields, consolidated audit service. Key concerns: dual identity tables (users/profiles), legacy encryption backward compatibility, security alert system not fully implemented, some child PHI tables missing auditor role restrictions.

---

## Architecture Overview

### System Architecture

```
[Client Browser]
    |
    v
[Next.js Middleware] -- Rate Limiting (Upstash Redis) + IDS
    |
    v
[Next.js App Router]
    |--- (marketing) -- Public pages
    |--- (auth)      -- Login, signup, MFA challenge
    |--- (dashboard)  -- Clinician workspace
    |--- (admin)      -- Admin + Super Admin panels
    |--- api/         -- REST API routes
    |
    v
[withAuth() HOF] -- RBAC + MFA + CSRF + Session Timeout
    |
    v
[Supabase Client (RLS)] -- Anon key, per-user row isolation
[Service Role Client]    -- Bypasses RLS for audit, lockout, cron
    |
    v
[PostgreSQL + RLS Policies] -- Organization-scoped tenancy
[Azure OpenAI]              -- Clinical AI (diagnosis, SOAP notes)
[Stripe]                    -- Subscription billing
[Daily.co]                  -- Telehealth video
[Sentry]                    -- Error monitoring
[Resend]                    -- Email
```

### Data Architecture

**Core Tables (with RLS):**
- `users` / `profiles` -- User identity and roles
- `organizations` -- Multi-tenancy root
- `patients` -- Patient demographics (PHI encrypted)
- `notes` -- Clinical notes (org-scoped)
- `encounters` -- Clinical encounters
- `appointments` -- Scheduling
- `audit_logs` -- HIPAA audit trail
- `login_attempts` -- Brute force tracking

**Extended Clinical Tables (with RLS):**
- `patient_allergies`, `patient_medications`, `patient_problems`, `patient_insurance`
- `vitals`, `screening_scores`, `smart_triage_results`
- `medication_interaction_log`, `risk_assessments`

**Billing Tables (with RLS):**
- `billing`, `billing_claims`, `claim_lines`
- `era_payments`, `fee_schedule_items`, `organization_subscriptions`

**Config Tables:**
- `ai_prompts` (global, read-only for authenticated users)

### Multi-Tenancy Model

Organization-based isolation using `organization_id` as the tenant discriminator. All PHI tables are scoped via `public.get_user_organization_id()` in RLS policies. This is a well-chosen model for healthcare SaaS.

---

## Critical Findings

### CRIT-01: Dual Identity Tables Create Desynchronization Risk

**Files:**
- `supabase/migrations/20260318120000_sprint1_security_remediations.sql` (lines 140, 147 -- references `profiles`)
- `src/lib/supabase/middleware.ts` (lines 133-152 -- fallback from `users` to `profiles`)
- `src/lib/auth/api-auth.ts` (line 51 -- queries `users` table)

**Finding:** The system has TWO user identity tables: `users` and `profiles`. The middleware falls back from `users` to `profiles` on error (line 143-152). The Sprint 1 role-escalation trigger (`prevent_self_role_escalation`) is installed on `profiles` only (line 156-160), NOT on `users`. If a user's role is stored in both tables, an attacker could potentially update the `users` table directly to escalate privileges since the trigger only guards `profiles`.

**Risk:** HIGH -- Role escalation bypass if tables desynchronize.

**Recommendation:** Consolidate to a single canonical identity table. If both must exist, install the `prevent_self_role_escalation` trigger on BOTH tables, and add a database trigger to synchronize role changes between them.

### CRIT-02: Security Alert System is Stub Implementation

**File:** `src/lib/security/audit-log.ts` (lines 304-328)

**Finding:** The `triggerSecurityAlert()` function for CRITICAL events (data breaches, unauthorized access) is a console.error stub. In production, critical security events would only be logged to stdout/stderr with no real notification pipeline.

```typescript
// Lines 307-313: TODO comments, no actual implementation
// In production, this would:
// 1. Send email to security team
// 2. Send SMS for critical alerts
// 3. Trigger SIEM integration
// 4. Create incident ticket
```

**Risk:** CRITICAL for HIPAA -- Breach detection and notification is a regulatory requirement (HIPAA Breach Notification Rule, 45 CFR 164.400-414).

**Recommendation:** Implement at minimum email notifications via Resend (already a dependency) for CRITICAL events before production launch.

---

## High Findings

### HIGH-01: Child PHI Tables Missing Auditor Role Write Restrictions

**File:** `supabase/migrations/20260203120001_patient_extended_schema.sql` (lines 230-458)

**Finding:** The extended patient tables (`patient_allergies`, `patient_medications`, `patient_problems`, `patient_insurance`) have RLS policies that allow ALL authenticated users in the organization to INSERT, UPDATE, and DELETE. The AUDITOR role restriction (read-only) applied to `patients`, `notes`, and `encounters` is NOT applied to these child tables. An auditor could create, modify, or delete allergy/medication/problem/insurance records.

**Recommendation:** Add role-based write restrictions matching the parent table pattern:
```sql
AND public.get_user_role() IN ('USER', 'ADMIN', 'SUPER_ADMIN')
```

### HIGH-02: Legacy Encryption Static Salt Still Active

**File:** `src/lib/security/encryption.ts` (line 12)

**Finding:** The legacy encryption format uses a hardcoded static salt (`chartspark-salt`). While new records use v2 format with per-record salts, the legacy decryption path remains active for backward compatibility. If any PHI data was encrypted with the legacy format, it uses a weaker key derivation that is vulnerable to precomputed rainbow table attacks.

**Recommendation:** Run a data migration to re-encrypt all legacy-format PHI using `migrateEncryption()` (already implemented at line 200-216), then remove the legacy decryption path. Create a migration script and schedule it.

### HIGH-03: Session Timeout Partially Client-Side

**File:** `src/lib/auth/session.ts` (lines 27-42)

**Finding:** Session activity tracking uses `localStorage` on the client side. While server-side enforcement exists via `last_activity_at` in `api-auth.ts` (lines 66-72), the client-side `hasSessionExpired()` function relies on localStorage which can be manipulated by a malicious user. The server-side check is the authoritative one, but the dual implementation creates confusion.

**Recommendation:** Ensure all session timeout decisions are authoritative on the server. The client-side code should only drive UX (warning modals), never security decisions.

### HIGH-04: Encounter_id FK Missing on billing_claims

**File:** `supabase/migrations/20260319120000_billing_infrastructure.sql` (line 24)

**Finding:** `encounter_id UUID, -- no FK: encounters table may not exist` -- The billing_claims table has an `encounter_id` column without a foreign key constraint. This means orphaned references can exist, and there's no referential integrity between billing and clinical encounters. This could lead to billing fraud scenarios where claims reference non-existent encounters.

**Recommendation:** Add a conditional FK or at minimum an application-level validation that verifies encounter existence before claim creation.

---

## Medium Findings

### MED-01: IDS SQL Injection Pattern Over-Broad

**File:** `src/lib/security/intrusion-detection.ts` (lines 25-33)

**Finding:** The SQL injection regex patterns match single keywords like `SELECT`, `INSERT`, `DELETE` in isolation (line 26). This would trigger false positives on legitimate clinical note content containing these common English words (e.g., "SELECT the appropriate medication", "DELETE the duplicate entry"). The middleware safelists specific API paths (middleware.ts lines 16-27), but any new API path would be subject to these false positives.

**Recommendation:** Refine patterns to require SQL-specific syntax combinations (e.g., `SELECT.*FROM`, `INSERT\s+INTO`) rather than isolated keywords.

### MED-02: CSRF Bypass for Vercel Preview Deployments

**File:** `src/lib/security/csrf.ts` (lines 88-94)

**Finding:** Any `*.vercel.app` origin is accepted as a valid CSRF origin. An attacker who deploys their own app to Vercel could craft cross-site requests that bypass CSRF protection.

```typescript
if (url.hostname.endsWith('.vercel.app')) {
    return true;
}
```

**Recommendation:** Restrict to the project's specific Vercel deployment pattern (e.g., `chartspark-*.vercel.app`) or use an explicit allowlist.

### MED-03: In-Memory Rate Limiting in Production

**File:** `src/lib/security/rate-limit.ts` (lines 246-252)

**Finding:** If Upstash Redis is not configured, the system falls back to in-memory rate limiting with only a console warning. In a multi-instance Vercel deployment, each serverless function instance has its own memory, making in-memory rate limiting ineffective. An attacker could bypass limits by hitting different instances.

**Recommendation:** Make Upstash Redis a required configuration for production. Fail closed if not available in production.

### MED-04: PHI Encryption Key Not Rotated

**File:** `src/lib/security/encryption.ts` (lines 14-45)

**Finding:** The encryption system supports a single `PHI_ENCRYPTION_KEY`. There is no key rotation mechanism. HIPAA requires periodic key rotation. While the v2 format uses per-record salts (which is excellent), the master key itself has no rotation story.

**Recommendation:** Implement a key versioning scheme (e.g., `PHI_ENCRYPTION_KEY_V1`, `PHI_ENCRYPTION_KEY_V2`) with a migration path for re-encrypting data under new keys.

### MED-05: MFA Check Creates Extra Supabase Client

**File:** `src/lib/auth/api-auth.ts` (lines 141-159)

**Finding:** When `requireMFA: true`, the code creates a second Supabase client (`supabaseMfa`) solely to check MFA level. The original auth check already creates a client. This doubles the connection overhead per MFA-protected request.

**Recommendation:** Reuse the existing Supabase client by extracting MFA checks into the initial auth flow.

### MED-06: Audit Log Query Missing Organization Scoping

**File:** `src/lib/security/audit-log.ts` (lines 333-411)

**Finding:** The `queryAuditLogs()` function uses the service role client (bypasses RLS) and accepts an optional `organizationId` parameter. If not provided, it returns audit logs from ALL organizations. While this is intended for Super Admins, there's no authorization check within the function itself -- the caller must enforce it.

**Recommendation:** Add an explicit authorization parameter or require organizationId for non-super-admin queries.

---

## Sprint Fix Verification

### Sprint 1 (20260318120000_sprint1_security_remediations.sql)

| Fix ID | Description | Status | Notes |
|--------|-------------|--------|-------|
| F-003 | RLS USING(true) on 6 PHI tables | VERIFIED | Vitals, screening_scores, smart_triage_results, medication_interaction_log, ai_prompts, claim_lines all org-scoped |
| F-007 | Block self-role-escalation | PARTIALLY VERIFIED | Trigger on `profiles` only, not `users` -- see CRIT-01 |
| F-017 | Restrict audit_logs INSERT to service_role | VERIFIED | Permissive INSERT policy dropped; service role client used in audit-log.ts |

### Sprint 2 (20260318120001_sprint2_security_hardening.sql)

| Fix ID | Description | Status | Notes |
|--------|-------------|--------|-------|
| F-022 | Server-side session tracking | VERIFIED | `last_activity_at` column added, server-side timeout enforcement in api-auth.ts (15 min) |

### Sprint 3 (20260318120002_sprint3_billing_unique_constraint.sql)

| Fix ID | Description | Status | Notes |
|--------|-------------|--------|-------|
| F-012 | Billing TOCTOU race condition | VERIFIED | UNIQUE constraint on `(service_date, organization_id)` prevents duplicate claims at DB level |

### Additional Sprint Fixes Verified in Application Code

| Fix ID | Description | Status | File |
|--------|-------------|--------|------|
| SEC-003 | Fail closed if Supabase not configured in prod | VERIFIED | `src/lib/supabase/middleware.ts:67-78` |
| SEC-006 | Feature flag fail-closed | VERIFIED | `src/lib/auth/api-auth.ts:168-203` |
| SEC-010 | Distributed rate limiting | VERIFIED | `src/lib/security/rate-limit.ts` (Upstash + circuit breaker) |
| SEC-011 | Security headers (HSTS, CSP, etc.) | VERIFIED | `next.config.ts:5-87` |
| F-018 | Demo mode blocked in production | VERIFIED | `src/lib/supabase/middleware.ts:57-64` |
| F-021 | CSP without unsafe-eval (except telehealth) | VERIFIED | `next.config.ts:33-67` |
| F-028 | Consolidated audit logging | VERIFIED | `src/lib/security/audit-log.ts` + `src/lib/audit/audit-service.ts` re-exports |
| F-036 | Lockout fail-closed | VERIFIED | `src/lib/auth/lockout.ts:29-35` |
| SEC-MFA | MFA enforcement for privileged roles | VERIFIED | `src/lib/supabase/middleware.ts:197-219` + `src/lib/auth/api-auth.ts:141-159` |

---

## Architecture Recommendations

### 1. Consolidate Identity Tables (Priority: HIGH)

Merge `users` and `profiles` into a single canonical table. The current dual-table design creates:
- Risk of desynchronization between role/org data
- Inconsistent trigger coverage (CRIT-01)
- Middleware fallback logic complexity
- Developer confusion about which table to query

### 2. Implement Security Alert Pipeline (Priority: CRITICAL)

Before production launch, implement `triggerSecurityAlert()` with real notification:
- Email via Resend (already in dependencies) for CRITICAL events
- Webhook to Sentry for incident tracking
- Consider PagerDuty or OpsGenie integration for on-call rotation

### 3. Complete Auditor Role Isolation (Priority: HIGH)

Apply AUDITOR read-only restrictions to ALL child PHI tables:
- `patient_allergies`
- `patient_medications`
- `patient_problems`
- `patient_insurance`
- Any future PHI tables

### 4. Enforce Redis in Production (Priority: MEDIUM)

Add a startup check that fails the build/deploy if `UPSTASH_REDIS_REST_URL` is not set in production. In-memory rate limiting is not effective for serverless deployments.

### 5. Add Database-Level Audit Trigger (Priority: MEDIUM)

Supplement application-level audit logging with PostgreSQL triggers on PHI tables. This provides defense-in-depth -- even if application code bypasses the audit service (e.g., direct service role queries), changes are still logged.

```sql
CREATE OR REPLACE FUNCTION audit_phi_change() RETURNS trigger AS $$
BEGIN
    INSERT INTO audit_logs (event_type, resource_type, resource_id, ...)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, ...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6. Implement Encryption Key Rotation (Priority: MEDIUM)

Design a key versioning scheme:
- Store key version in encrypted data prefix (e.g., `v2:kv1:salt:iv:tag:data`)
- Support decryption with multiple key versions
- Provide a migration script that re-encrypts under new keys
- Schedule quarterly key rotation per HIPAA best practices

### 7. Add Foreign Key for billing_claims.encounter_id (Priority: MEDIUM)

Either add a proper FK constraint or implement a database trigger that validates encounter existence. This prevents orphaned billing records and strengthens data integrity for compliance audits.

### 8. Consider Connection Pooling (Priority: LOW)

The current architecture creates new Supabase clients per request. For high-traffic production use, consider:
- Supabase connection pooling via PgBouncer (already available in Supabase)
- Reducing duplicate client creation (MED-05)
- Monitoring connection counts in production

---

## Architecture Strengths

1. **Defense-in-Depth Security:** Three layers of access control -- middleware (rate limiting + IDS), application (withAuth HOF), database (RLS policies).

2. **Organization-Scoped RLS:** All PHI tables use `get_user_organization_id()` for tenant isolation, preventing cross-organization data leakage at the database level.

3. **PHI Encryption at Rest:** AES-256-GCM with per-record salts (v2 format) for sensitive fields. Encryption happens before database write.

4. **Comprehensive Audit Logging:** 60+ event types covering auth, PHI access, billing, AI usage, and security events. PHI is sanitized before logging.

5. **Fail-Closed Security Posture:** Auth endpoints, feature flags, lockout checks, and MFA all fail closed on errors -- denying access rather than allowing it.

6. **HIPAA-Compliant Session Management:** 15-minute inactivity timeout, 8-hour absolute timeout, server-side enforcement via `last_activity_at`.

7. **Input Validation Pipeline:** Zod schemas for API input, intrusion detection in middleware, CSRF protection for state-changing requests.

8. **Well-Structured Security Headers:** HSTS with preload, CSP (strict for most routes, relaxed only for telehealth), X-Frame-Options DENY, no X-Powered-By.

---

## Summary

ChartSpark's architecture is well-designed for a HIPAA-compliant psychiatric EHR. The three remediation sprints have significantly hardened the security posture. The two most urgent items to address before production are:

1. **CRIT-02:** Implement real security alert notifications (not just console.error)
2. **CRIT-01:** Resolve the users/profiles table duality to prevent role desynchronization

After addressing these, the focus should shift to HIGH items: child PHI table auditor restrictions, legacy encryption migration, and billing_claims referential integrity.
