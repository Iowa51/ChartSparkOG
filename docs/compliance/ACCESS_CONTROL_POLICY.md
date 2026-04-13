# Access Control Policy — ChartSparkOG

**Version:** 1.0
**Date:** 2026-04-12
**Classification:** Internal
**Review cycle:** Annual (next review: 2027-04-12)

---

## 1. Purpose

This policy defines the role-based access control (RBAC) model for ChartSparkOG, including role definitions, access permissions, enforcement mechanisms, account lockout procedures, and multi-factor authentication requirements. It implements the HIPAA Security Rule requirements for access controls (45 CFR 164.312(a)(1)) and audit controls (45 CFR 164.312(b)).

---

## 2. Role Definitions

### 2.1 USER (Clinician/Provider)

**Description:** Licensed healthcare provider using the system for clinical documentation and patient care.

**Access scope:**
- Create, read, update patients within their organization
- Create, read, update clinical notes (SOAP notes)
- Record and manage encounters, vitals, screening scores
- Use AI Scribe (audio transcription and SOAP note generation)
- Upload and view patient documents
- View and manage billing codes and claim submissions
- Access telehealth video sessions
- Manage own profile and security settings

**Restrictions:**
- Cannot access patients or data outside their organization
- Cannot manage other user accounts
- Cannot access admin dashboards or system configuration
- Cannot view audit logs (except own activity)

### 2.2 ADMIN (Organization Administrator)

**Description:** Administrative user responsible for managing their organization's users and settings.

**Access scope:**
- All USER permissions
- Invite, create, update, and deactivate users within their organization
- Assign roles (USER, ADMIN, AUDITOR) to organization members
- View organization-level audit logs
- Manage organization settings and preferences
- Access admin dashboard (`/admin` routes)

**Restrictions:**
- Cannot access data outside their organization
- Cannot assign SUPER_ADMIN role
- Cannot modify own role (enforced by database trigger `prevent_self_role_escalation()`)
- Cannot access super-admin system management

### 2.3 AUDITOR

**Description:** Compliance reviewer with read-only access to clinical records and audit trails.

**Access scope:**
- Read-only access to clinical notes and patient records within their organization
- Full access to audit logs within their organization
- Access auditor dashboard (`/auditor` routes)

**Restrictions:**
- Cannot create, update, or delete patient data
- Cannot use AI Scribe or generate notes
- Cannot manage users or organization settings
- Read-only — no write operations on clinical data

### 2.4 SUPER_ADMIN (Platform Administrator)

**Description:** ChartSparkOG platform administrator with cross-organization system access.

**Access scope:**
- All ADMIN permissions across all organizations
- Access super-admin dashboard (`/super-admin` routes)
- System health monitoring and configuration
- Cross-organization data access for support and compliance
- Manage SUPER_ADMIN role assignments

**Restrictions:**
- All actions are audit logged at CRITICAL risk level
- Cannot modify own role (database trigger enforced)
- MFA required at all times

---

## 3. Access Permissions Matrix

| Resource | USER | ADMIN | AUDITOR | SUPER_ADMIN |
|----------|------|-------|---------|-------------|
| Patients (own org) | CRUD | CRUD | Read | CRUD (all orgs) |
| Clinical Notes | CRUD | CRUD | Read | CRUD (all orgs) |
| Encounters | CRUD | CRUD | Read | CRUD (all orgs) |
| Vitals / Screenings | CRUD | CRUD | Read | CRUD (all orgs) |
| Patient Documents | CRUD | CRUD | Read | CRUD (all orgs) |
| AI Scribe (transcribe) | Yes | Yes | No | Yes |
| Billing / Claims | CRUD | CRUD | Read | CRUD (all orgs) |
| Telehealth Sessions | Yes | Yes | No | Yes |
| User Management | No | CRUD (own org) | No | CRUD (all orgs) |
| Audit Logs | Own activity | Org-level | Org-level | All orgs |
| Organization Settings | No | CRUD | No | CRUD (all orgs) |
| System Health | No | No | No | Yes |
| `/admin` routes | No | Yes | No | Yes |
| `/auditor` routes | No | No | Yes | Yes |
| `/super-admin` routes | No | No | No | Yes |

---

## 4. Enforcement Mechanisms

### 4.1 Route-Level Protection (Middleware)

**File:** `src/middleware.ts`

The Next.js middleware enforces role-based route access before any page or API handler executes:

```
Protected route mappings:
  /super-admin/*  → SUPER_ADMIN only
  /admin/*        → SUPER_ADMIN, ADMIN
  /auditor/*      → SUPER_ADMIN, AUDITOR
  /dashboard/*    → All authenticated users
  /patients/*     → All authenticated users
  /encounters/*   → All authenticated users
  /notes/*        → All authenticated users
  /templates/*    → All authenticated users
  /billing/*      → All authenticated users
  /references/*   → All authenticated users
  /submissions/*  → All authenticated users
  /settings/*     → All authenticated users
```

Unauthenticated requests are redirected to `/login`. Unauthorized role access returns a 403 response.

### 4.2 API-Level Authorization (withAuth)

**File:** `src/lib/auth/api-auth.ts`

Every API route handler is wrapped with `withAuth()`, which:

1. Validates the Supabase session token
2. Checks the 15-minute inactivity timeout (`SESSION_TIMEOUT_MS`)
3. Checks the 8-hour absolute session timeout
4. Verifies the user's role against `requiredRole` parameter
5. Confirms organization membership
6. Updates `last_activity_at` timestamp
7. Returns authenticated user context to the handler

Example: `withAuth({ requiredRole: 'ADMIN' })` rejects any request from a USER or AUDITOR.

### 4.3 Database-Level Isolation (Supabase RLS)

**Enforcement point:** PostgreSQL Row-Level Security policies

All PHI tables enforce organization-scoped access:

```sql
-- Standard RLS pattern on PHI tables:
CREATE POLICY "org_isolation" ON table_name
  USING (organization_id = public.get_user_organization_id());
```

**Tables with RLS enforced:**
- `patients`
- `clinical_notes`
- `encounters`
- `vitals`
- `screening_scores`
- `patient_allergies`, `patient_medications`, `patient_problems`, `patient_insurance`
- `patient_documents`
- `smart_triage_results`
- `medication_interaction_log`
- `audit_logs`

**Key function:** `get_user_organization_id()` resolves the current authenticated user's organization from the JWT claims, ensuring queries are automatically scoped.

**Remediation note:** Migration `20260318120000_sprint1_security_remediations.sql` fixed overly permissive `USING(true)` policies on 6 tables (vitals, screening_scores, smart_triage_results, medication_interaction_log, ai_prompts, claim_lines) to proper organization-scoped policies.

### 4.4 Role Escalation Prevention

**File:** Migration `20260318120000_sprint1_security_remediations.sql`

A database trigger `prevent_self_role_escalation()` fires on UPDATE to the `profiles` table:

- Blocks any user from changing their own `role` column
- Prevents escalation from USER → ADMIN or ADMIN → SUPER_ADMIN
- Only a higher-privileged user can promote another user
- Trigger executes at the database level, bypassing any application-layer bugs

### 4.5 CSRF Protection

**File:** `src/lib/security/csrf.ts`

All state-changing HTTP methods (POST, PUT, PATCH, DELETE) validate the `Origin` header against the expected application domain. Requests with mismatched or missing origins are rejected with 403.

---

## 5. Account Lockout Policy

### 5.1 Configuration

**File:** `src/lib/auth/lockout.ts`

| Parameter | Value |
|-----------|-------|
| Maximum failed login attempts | 5 |
| Lockout duration | 30 minutes |
| Attempt tracking window | 15 minutes |
| Tracking granularity | Per email address + IP address |
| Failure behavior | **Fail-closed** (locked on DB errors) |

### 5.2 Implementation

**Tracking table:** `login_attempts`
- Columns: `email`, `ip_address`, `user_agent`, `success` (boolean), `created_at`
- Created by migration `20260127120002_login_attempts.sql`

**API endpoints:**
- `POST /api/auth/check-lockout` — called before login attempt; returns `{ locked: true/false, remainingAttempts }`. Uses Supabase service role client (pre-authentication operation).
- `POST /api/auth/record-attempt` — called after login attempt; records success or failure with IP and user agent.

**Rate limiting on login:**
- IP-based: 5 requests per 15 minutes (fail-closed)
- Email-based: 10 requests per 15 minutes (fail-closed)

### 5.3 Lockout Behavior

1. After 5 failed attempts within 15 minutes, the account is locked for 30 minutes
2. During lockout, all login attempts are rejected immediately with a generic error message (does not reveal whether the account exists)
3. Successful login resets the failure counter
4. If the database is unreachable during lockout check, the system **fails closed** — the login is denied
5. Lockout events are recorded in the `audit_logs` table as `LOGIN_FAILURE` with risk level MEDIUM

### 5.4 Unlocking

- **Automatic:** Lockout expires after 30 minutes of no failed attempts
- **Manual:** A SUPER_ADMIN can clear lockout records via direct database access (no UI currently)
- **Password reset:** Initiating a password reset flow does not bypass lockout (rate limited separately: 3 requests per hour)

---

## 6. Multi-Factor Authentication (MFA) Requirements

### 6.1 MFA Method

**Method:** TOTP (Time-based One-Time Password)
**Provider:** Supabase Auth MFA
**Setup path:** `/settings/security/mfa`

### 6.2 Role-Based MFA Requirements

| Role | MFA Required | Enforcement Point |
|------|-------------|-------------------|
| USER | Recommended (not enforced) | — |
| ADMIN | **Required** | `src/lib/supabase/middleware.ts` |
| AUDITOR | **Required** | `src/lib/supabase/middleware.ts` |
| SUPER_ADMIN | **Required** | `src/lib/supabase/middleware.ts` |

### 6.3 MFA Enforcement

**File:** `src/lib/supabase/middleware.ts` (lines 38, 201-217)

The middleware checks the Supabase Auth assurance level:
- **AAL1:** User has authenticated with password only (or MFA enrolled but not verified this session)
- **AAL2:** User has completed MFA verification this session

For ADMIN, AUDITOR, and SUPER_ADMIN roles:
- If assurance level is AAL1 and MFA is enrolled, redirect to `/settings/security/mfa` for verification
- If MFA is not enrolled, redirect to MFA setup page
- API requests from privileged roles without AAL2 return 403

### 6.4 MFA Verification

**Endpoint:** `POST /api/auth/verify-mfa` (`src/app/api/auth/verify-mfa/route.ts`)

| Parameter | Value |
|-----------|-------|
| Rate limit | 5 attempts per 15 minutes per user |
| Failure behavior | Fail-closed |
| Error codes | `MFA_INVALID_CODE`, `MFA_EXPIRED`, `MFA_PROVIDER_ERROR` |

### 6.5 MFA Audit Events

All MFA-related actions are logged:
- `MFA_ENABLED` — user enrolls in MFA
- `MFA_DISABLED` — user unenrolls from MFA
- `MFA_CHALLENGE_SUCCESS` — successful TOTP verification
- `MFA_CHALLENGE_FAILURE` — failed TOTP verification

---

## 7. Session Management

| Control | Value | Implementation |
|---------|-------|----------------|
| Inactivity timeout | 15 minutes | `src/lib/auth/api-auth.ts` — checks `profiles.last_activity_at` |
| Absolute session timeout | 8 hours | `src/lib/auth/api-auth.ts` — checks JWT `last_sign_in_at` |
| Session token storage | HTTP-only cookies | Supabase Auth SSR (`src/lib/supabase/server.ts`) |
| Token refresh | Automatic | `src/lib/supabase/middleware.ts` refreshes expired tokens |
| Cache control | `no-store, no-cache` | All API responses include anti-caching headers |

---

## 8. Access Review and Deprovisioning

### 8.1 User Deactivation

- ADMIN users can deactivate organization members
- Deactivated users cannot authenticate
- Deactivation is logged as `USER_DEACTIVATED` audit event
- Active sessions are invalidated on deactivation

### 8.2 Access Review Schedule

- Organization ADMINs should review user access lists quarterly
- SUPER_ADMINs should review cross-organization access monthly
- Role changes must be logged and reviewable in audit logs (`ROLE_CHANGED` event, risk level HIGH)

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-12 | Security & Compliance Team | Initial access control policy |
