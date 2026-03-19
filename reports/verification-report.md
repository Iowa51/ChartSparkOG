# Security Verification Report — Sprint 1 & Sprint 2 Fixes

**Date:** 2026-03-19
**Branch:** `pre-production-audit`
**Reviewers:** Security Auditor, Architect, API Designer (parallel sweep)

---

## Executive Summary

**7 of 10 fixes verified correct. 3 fixes have issues requiring remediation.**

| # | Fix | Verdict | Severity |
|---|-----|---------|----------|
| 1 | RLS policies on PHI tables | **PASS** | — |
| 2 | getSession() → getUser() | **PASS** | — |
| 3 | Note DELETE org_id check | **PASS** | — |
| 4 | Open redirect fix | **PASS** (minor concern) | Low |
| 5 | Feature gate fails closed | **ISSUE** | Medium |
| 6 | Audit log wired to real logger | **PASS** (caveat) | Low |
| 7 | Demo mode blocked in production | **ISSUE** | High |
| 8 | Patient PATCH Zod validation | **PASS** | — |
| 9 | MFA on PHI API routes | **ISSUE** | High |
| 10 | Audit logging on billing routes | **ISSUE** | High |

---

## Detailed Findings

### 1. RLS Policies on PHI Tables — PASS

**Files:**
- `supabase/migrations/20260318120000_sprint1_security_remediations.sql` (lines 12-115)
- `supabase/migrations/20260319120001_create_claim_lines.sql` (lines 50-83)

All 6 tables verified:

| Table | SELECT | INSERT | UPDATE | Scoping Method |
|-------|--------|--------|--------|----------------|
| `vitals` | org-scoped | org-scoped | org-scoped | `get_user_organization_id()` |
| `screening_scores` | org-scoped | org-scoped | N/A | `get_user_organization_id()` |
| `smart_triage_results` | org-scoped | org-scoped | org-scoped | `get_user_organization_id()` |
| `medication_interaction_log` | org-scoped | org-scoped | N/A | `get_user_organization_id()` |
| `ai_prompts` | `is_active = TRUE` | service_role only | service_role only | Read-only global config |
| `claim_lines` | parent join | parent join | parent join | JOIN to `billing_claims.organization_id` |

Old `USING (true)` policies correctly dropped. `get_user_organization_id()` is `SECURITY DEFINER` with hardened `search_path`. Implicit deny on DELETE for all tables (correct for PHI).

**Minor concern:** Migration ordering — `claim_lines` RLS (20260318) references a table created in a later migration (20260319). Verify these run in the correct order in your migration pipeline.

---

### 2. getSession() Replaced with getUser() — PASS

**File:** `src/lib/auth/api-auth.ts` (line 43)

```typescript
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
```

`getUser()` performs server-side JWT verification. A codebase-wide grep confirms **zero** remaining uses of `supabase.auth.getSession()`. Fully remediated.

---

### 3. Note DELETE Has organization_id Check — PASS

**File:** `src/app/api/notes/[id]/route.ts` (lines 161-213)

The delete query at line 174-178 includes `.eq('organization_id', context.user.organizationId)`. Additional protections:
- Role restricted to `ADMIN` / `SUPER_ADMIN`
- `requireOrganization: true` and `requireMFA: true`
- Returns 404 if no row matched (prevents enumeration)
- PHI deletion logged as high-risk audit event

---

### 4. Open Redirect Fixed — PASS (minor concern)

**File:** `src/app/api/auth/callback/route.ts` (lines 8-16)

`sanitizeRedirectPath()` correctly:
- Defaults to `/dashboard`
- Requires path starts with `/`
- Blocks `//` (protocol-relative) and `\` (backslash traversal)

**Low-risk concern:** `x-forwarded-host` (line 27) is trusted without allowlist validation. Safe on Vercel (which controls this header), but could be exploitable behind other proxies. Consider adding an `ALLOWED_HOSTS` allowlist check if deploying outside Vercel.

---

### 5. Feature Gate Fails Closed on Error — ISSUE (Medium)

**Files:**
- `src/lib/auth/api-auth.ts` (lines 168-199) — server-side
- `src/hooks/useFeature.ts` (lines 59-66, 81-87) — client-side

**What's correct:** Both implementations return deny/false on database errors and exceptions. Server-side catch block explicitly comments `// SEC-006: FAIL CLOSED`.

**What's wrong:** In `api-auth.ts` lines 171-194, the feature check is wrapped in `if (supabase)`. If `createClient()` returns a falsy value (null/undefined), the entire feature gate block is **skipped** and execution falls through to the handler — effectively **fail-open**. The catch block only handles thrown errors, not a null client.

**Recommendation:** Add an explicit `else` branch after `if (supabase)` that returns 503 when the Supabase client is unavailable.

---

### 6. Audit Log Stub Wired to Real Logger — PASS (caveat)

**Files:**
- `src/lib/security/audit-log.ts` — primary audit logger
- `src/lib/audit/audit-service.ts` — re-export shim (no stubs)

The audit logger uses `createServiceRoleClient()` to write to the `audit_logs` database table. Includes PHI sanitization (lines 101-124) to redact sensitive fields. Structured event types with risk levels.

**Caveats:**
- Falls back to `console.log` if service role client is unavailable (silent degradation in production)
- `triggerSecurityAlert()` (lines 304-327) is still a stub — logs to console only, not wired to email/SMS/SIEM

---

### 7. Demo Mode Blocked in Production — ISSUE (High)

**Files:**
- `src/lib/config/environment.ts` (lines 28-44) — centralized `isDemoMode()`
- `src/app/api/auth/check-lockout/route.ts` (line 24) — **VULNERABLE**

**What's correct:** The centralized `isDemoMode()` properly returns `false` when `NODE_ENV === 'production'`. Most callers (`record-attempt`, `complete-signup`, `server.ts`, `client.ts`) correctly check both `NODE_ENV` and `NEXT_PUBLIC_DEMO_MODE`.

**What's wrong:** `check-lockout/route.ts` line 24 checks only:
```typescript
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
```
Missing the `NODE_ENV !== 'production'` guard. If `NEXT_PUBLIC_DEMO_MODE=true` is accidentally set in production, **brute-force protection is disabled**.

**Recommendation:** Replace the inline check with the centralized `isDemoMode()` import from `@/lib/config/environment`.

---

### 8. Patient PATCH Has Zod Validation — PASS

**Files:**
- `src/app/api/patients/[id]/route.ts` (lines 53-86)
- `src/lib/validation/schemas.ts` (lines 136-159)

`handlePatch` calls `validateRequest(PatientUpdateSchema, body)` before processing. The schema covers all patient fields with length limits and format validation. Protected fields (`organization_id`, `created_by`, `id`, `created_at`, `updated_at`) are explicitly stripped at lines 67-71, preventing mass assignment.

---

### 9. MFA Required on PHI API Routes — ISSUE (High)

**File:** `src/lib/auth/api-auth.ts` (lines 141-159)

**What's correct:** MFA enforcement logic is solid — checks `aal2` level, fails closed on error (returns 503). PHI routes with `requireMFA: true` include: patients, notes, vitals, screenings, patient documents, and all AI routes.

**What's wrong:** Billing routes contain PHI (patient names, diagnosis codes, insurance info) but **do not require MFA**:

| Route | `requireMFA` |
|-------|-------------|
| `/api/billing` | **Missing** |
| `/api/managed-billing/claims` | **Missing** |
| `/api/managed-billing/claims/[id]/submit` | **Missing** |
| `/api/managed-billing/claims/[id]/validate` | **Missing** |
| `/api/managed-billing/collections` | **Missing** |
| `/api/managed-billing/invoices` | **Missing** |
| `/api/managed-billing/era/upload` | **Missing** |
| `/api/managed-billing/admin/clearinghouse` | **Missing** |

**Recommendation:** Add `requireMFA: true` to all billing and managed-billing route `withAuth` configurations.

---

### 10. Audit Logging on Billing Routes — ISSUE (High)

**Files:**
- `src/app/api/billing/route.ts` — has audit logging
- `src/app/api/managed-billing/claims/route.ts` — **no audit logging**
- `src/lib/managed-billing/audit-logger.ts` — exists but mostly unused

**What's correct:** Core `/api/billing` route logs `BILLING_RECORD_VIEW` (GET) and `BILLING_RECORD_CREATE` (POST) with full context. Managed-billing onboarding POST uses `logBillingAction`.

**What's wrong:** 12 of 14 managed-billing endpoints have **zero audit logging**:

| Route | Audit Logging |
|-------|:------------:|
| `GET /api/billing` | Yes |
| `POST /api/billing` | Yes |
| `POST /api/managed-billing/onboarding` | Yes |
| `GET /api/managed-billing/onboarding` | **No** |
| `GET /api/managed-billing/claims` | **No** |
| `POST /api/managed-billing/claims` | **No** |
| `POST /api/managed-billing/claims/[id]/submit` | **No** |
| `POST /api/managed-billing/claims/[id]/validate` | **No** |
| `GET /api/managed-billing/collections` | **No** |
| `GET /api/managed-billing/invoices` | **No** |
| `POST /api/managed-billing/invoices` | **No** |
| `POST /api/managed-billing/era/upload` | **No** |
| `GET /api/managed-billing/admin/clearinghouse` | **No** |
| `PUT /api/managed-billing/admin/clearinghouse` | **No** |
| `POST /api/managed-billing/admin/clearinghouse/test` | **No** |

Additionally, two separate audit logging systems exist (`logAuditEvent` vs `logBillingAction`) writing to different tables, which fragments the audit trail.

**Recommendation:** Add `logAuditEvent` calls to all managed-billing endpoints. Consolidate on a single audit logging system so all events appear in one queryable table.

---

## Priority Remediation List

### Critical (fix before production)

1. **Demo mode check-lockout bypass** — `src/app/api/auth/check-lockout/route.ts:24`
   Replace inline demo check with centralized `isDemoMode()` import.

2. **MFA missing on billing routes** — All `/api/billing` and `/api/managed-billing/*` routes
   Add `requireMFA: true` to `withAuth` config.

3. **Managed-billing audit logging gap** — 12 unaudited endpoints
   Add `logAuditEvent` calls to all managed-billing handlers.

### Medium (fix before GA)

4. **Feature gate null-client fail-open** — `src/lib/auth/api-auth.ts:171`
   Add `else` branch returning 503 when `supabase` is falsy.

### Low (track for follow-up)

5. **x-forwarded-host not validated** — `src/app/api/auth/callback/route.ts:27`
   Add allowlist if deploying outside Vercel.

6. **Audit logger console.log fallback** — `src/lib/security/audit-log.ts:182-186`
   In production, fail loudly or queue for retry instead of silent degradation.

7. **Security alert stub** — `src/lib/security/audit-log.ts:304-327`
   Wire `triggerSecurityAlert()` to real alerting (email/SMS/SIEM).

8. **Migration ordering** — `claim_lines` RLS migration (20260318) vs table creation (20260319)
   Verify migration runner handles this ordering correctly.
