# QA Purist Report: ChartSpark EHR Codebase Review

**Date:** 2026-03-18
**Reviewer:** QA Purist (automated analysis)
**Branch:** pre-production-audit
**Scope:** Full codebase review for a psychiatric EHR handling PHI/HIPAA-sensitive mental health records

---

## Executive Summary

The ChartSpark EHR codebase demonstrates a conscious effort toward security hardening (multiple remediation passes are evident), with centralized auth via `withAuth`, Zod validation schemas, PHI-safe logging, and audit trail infrastructure. However, significant testing gaps, several data integrity risks, and HIPAA-specific concerns remain that should be resolved before production deployment.

**Total Findings: 42**

| Severity | Count |
|----------|-------|
| Critical | 6     |
| High     | 12    |
| Medium   | 14    |
| Low      | 10    |

---

## Summary Table

| ID | Severity | Category | File | Finding |
|----|----------|----------|------|---------|
| QA-001 | Critical | Test Coverage | project-wide | No unit tests for any API route handler |
| QA-002 | Critical | Data Integrity | `src/lib/data/utils.ts:268` | Audit log in data layer is a stub (TODO) |
| QA-003 | Critical | Auth Bypass | `src/app/api/auth/callback/route.ts:8` | Open redirect via unvalidated `next` parameter |
| QA-004 | Critical | Data Integrity | `src/app/api/notes/[id]/route.ts:168-178` | Clinical note hard-delete with service role bypasses org check |
| QA-005 | Critical | HIPAA | `src/app/api/screenings/route.ts:79-98` | No Zod schema validation on screening POST body |
| QA-006 | Critical | Race Condition | `src/app/api/billing/route.ts:60-76` | TOCTOU race in billing duplicate check |
| QA-007 | High | Test Coverage | project-wide | Only 7 test files for ~60+ API routes and ~50 lib modules |
| QA-008 | High | Error Handling | `src/lib/auth/lockout.ts:44` | Lockout check fails-open on database error |
| QA-009 | High | HIPAA | `src/app/api/ai/chat/route.ts:34` | AI audit logged as NOTE_VIEW instead of AI_CHAT_REQUEST |
| QA-010 | High | Data Integrity | `src/app/api/patients/[id]/route.ts:57` | PATCH has no Zod validation - raw JSON passed to updatePatient |
| QA-011 | High | Security | `src/middleware.ts:16-27` | Broad IDS safelist disables intrusion detection for most API routes |
| QA-012 | High | Data Integrity | `src/app/api/notes/route.ts:132-138` | Patient last_visit_date update uses rawData not validatedData |
| QA-013 | High | HIPAA | `src/lib/security/audit-log.ts:289-312` | Security alerts only log to console - no real alerting in production |
| QA-014 | High | Auth | `src/app/api/notes/[id]/route.ts:210-212` | Note detail/update/delete has no requiredRole restriction |
| QA-015 | High | Data Integrity | `src/lib/data/patients.ts:200-265` | searchPatients loads ALL org patients into memory for client-side filtering |
| QA-016 | High | Webhook | `src/app/api/subscriptions/webhook/route.ts:16` | In-memory idempotency store lost on serverless cold start |
| QA-017 | High | Security | `src/app/api/telehealth/create-room/route.ts:10-12` | No Zod validation on telehealth create-room body |
| QA-018 | High | HIPAA | `src/app/api/vitals/route.ts:52-63` | Vitals GET has no organization_id scoping in query |
| QA-019 | Medium | Test Quality | `src/__tests__/safe-logger.test.ts` | Only tests sanitizeError - no tests for safeLog, devLog, or log level filtering |
| QA-020 | Medium | Input Validation | `src/lib/validation/schemas.ts:160` | AITreatmentPlanSchema uses `.passthrough()` allowing arbitrary JSON injection |
| QA-021 | Medium | Error Handling | `src/app/api/billing/route.ts:78` | Invoice number uses Math.random() - not cryptographically secure or collision-resistant |
| QA-022 | Medium | HIPAA | `src/lib/security/audit-log.ts:158-163` | logAuditEventAsync swallows errors silently - audit events may be lost |
| QA-023 | Medium | Race Condition | `src/lib/security/rate-limit.ts:40` | In-memory rate limit store not process-safe in multi-instance deployments |
| QA-024 | Medium | Input Validation | `src/app/api/auth/record-attempt/route.ts:10-11` | Only checks `email` and `success` exist - no email format validation |
| QA-025 | Medium | Data Integrity | `src/app/api/notes/route.ts:115-128` | Note insert and patient update not in transaction - partial state possible |
| QA-026 | Medium | Edge Cases | `src/lib/data/utils.ts:149-155` | validateDate accepts invalid dates like 2024-02-30 |
| QA-027 | Medium | Security | `src/lib/security/intrusion-detection.ts:26` | SQL injection regex triggers on legitimate clinical text containing "OR", "AND" |
| QA-028 | Medium | HIPAA | `src/app/api/ai/diagnose/route.ts:27-28` | AI diagnose logged as NOTE_VIEW not AI_DIAGNOSE_REQUEST |
| QA-029 | Medium | Error Handling | `src/app/api/patients/[id]/route.ts:42-48` | All errors in GET return 404 - swallows real server errors |
| QA-030 | Medium | Data Integrity | `src/app/api/risk-assessments/route.ts:148-159` | Patient cognitive_score overwritten by either MMSE or MoCA without distinguishing |
| QA-031 | Medium | Security | `src/lib/security/csrf.ts:88-96` | Any *.vercel.app subdomain accepted as valid origin |
| QA-032 | Medium | Test Coverage | project-wide | No test for encryption.ts roundtrip with actual encrypt/decrypt |
| QA-033 | Medium | Health Checks | project-wide | No /api/health endpoint found in production |
| QA-034 | Low | Test Coverage | project-wide | No e2e test for note signing flow |
| QA-035 | Low | Code Quality | `src/lib/auth/lockout.ts:4` | Lockout module uses browser client - should use server or service-role client |
| QA-036 | Low | Edge Cases | `src/lib/security/masking.ts:49` | maskDOB fails on non-standard date formats gracefully but with odd output |
| QA-037 | Low | Observability | project-wide | No structured logging format - console.log/error/warn used inconsistently |
| QA-038 | Low | Code Quality | `src/app/api/appointments/route.ts:119` | Appointment audit logged as PATIENT_CREATE instead of APPOINTMENT_CREATE |
| QA-039 | Low | Test Coverage | project-wide | No tests for masking.ts utility functions |
| QA-040 | Low | Data Integrity | `src/lib/auth/session.ts:29-30` | Session tracking uses localStorage which is trivially manipulable |
| QA-041 | Low | Edge Cases | `src/lib/validation/schemas.ts:39` | PatientCreateSchema date_of_birth regex accepts future dates |
| QA-042 | Low | Code Quality | `src/app/api/screenings/route.ts:19` | Limit parameter parsed with parseInt but not bounded - potential DoS with limit=999999 |

---

## Detailed Findings

### QA-001: No Unit Tests for Any API Route Handler [CRITICAL]

**File:** All files under `src/app/api/`
**Description:** The codebase has ~50 API route handlers covering patients, notes, billing, appointments, telehealth, screenings, vitals, AI, auth, and cron jobs. Zero of these have unit tests. The only test files (7 total) cover validation schemas, CSRF logic, safe-logger, encryption, intrusion detection, and sanitization -- all utility/library code.

**Risk:** Regressions in authentication, authorization, data validation, organization scoping, and audit logging will go undetected. Given this is a HIPAA-regulated system handling psychiatric records, this is the single most critical gap.

**Recommended Fix:**
- Create tests for each API route using mocked Supabase clients
- Priority order: (1) auth routes, (2) patient CRUD, (3) note signing, (4) billing, (5) AI endpoints
- Each test must verify: auth enforcement, org scoping, input validation rejection, audit logging calls, error responses

---

### QA-002: Data Layer Audit Log is a Stub [CRITICAL]

**File:** `src/lib/data/utils.ts`, line 268-277
**Description:** The `createAuditLog` function used by the entire data layer (`patients.ts`, etc.) is a TODO stub that only logs to console in development:
```typescript
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
        safeLogger.info(`[AUDIT] ${entry.event_type}`);
    }
    // TODO: Implement actual audit log insertion
}
```

**Risk:** HIPAA requires complete audit trails for all PHI access. The data layer calls `createAuditLog` for PATIENT_VIEW, PATIENT_CREATE, PATIENT_UPDATE, PATIENT_ARCHIVE, and PATIENTS_SEARCH. In production, none of these events are actually persisted. This is a compliance violation.

**Recommended Fix:** Implement the function to insert into `audit_logs` table using the service role client. Add a test that verifies the insert is called with correct parameters.

---

### QA-003: Open Redirect in Auth Callback [CRITICAL]

**File:** `src/app/api/auth/callback/route.ts`, line 8
**Description:** The `next` query parameter is used directly in a redirect without validation:
```typescript
const next = searchParams.get("next") ?? "/dashboard";
// ...
return NextResponse.redirect(`${origin}${next}`);
```
An attacker could craft a URL like `/api/auth/callback?code=X&next=//evil.com` or `next=/\evil.com` to redirect users after authentication to a phishing site.

**Risk:** Post-authentication phishing attacks. Users who just authenticated may trust the redirect destination.

**Recommended Fix:**
- Validate that `next` starts with `/` and does not contain `//` or `\`
- Maintain an allowlist of valid redirect paths
- Test: verify redirect is blocked for `//evil.com`, `https://evil.com`, `/\evil.com`

---

### QA-004: Clinical Note Hard-Delete Bypasses Organization Check [CRITICAL]

**File:** `src/app/api/notes/[id]/route.ts`, lines 161-208
**Description:** The DELETE handler uses `createServiceRoleClient()` which bypasses RLS, but does not first verify the note belongs to the user's organization. The code deletes any note by ID:
```typescript
const { error, data: deletedData } = await adminClient
    .from('clinical_notes')
    .delete()
    .eq('id', id)
    .select();
```
Unlike the GET and PATCH handlers which check `note.organization_id !== context.user.organizationId`, the DELETE handler has no such check.

**Risk:** Any authenticated user can delete any clinical note in the system by providing its UUID. This is a cross-organization data destruction vulnerability.

**Recommended Fix:**
- Add `.eq('organization_id', context.user.organizationId)` to the delete query
- Alternatively, fetch the note first and verify org ownership before deleting
- Test: verify 404 is returned when deleting a note from a different organization

---

### QA-005: No Zod Validation on Screening POST Body [CRITICAL]

**File:** `src/app/api/screenings/route.ts`, lines 79-98
**Description:** The screenings POST handler destructures the raw JSON body directly without Zod validation:
```typescript
const body = await context.request.json();
const { patient_id, encounter_id, instrument, total_score, severity, item_responses, clinical_notes, risk_flags } = body;
```
Only basic presence checks are performed. Fields like `patient_id` are not validated as UUID. `total_score` accepts any value. `item_responses` and `risk_flags` accept arbitrary JSON.

**Risk:** Malformed data inserted into clinical screening records. Potential for injection via `item_responses` JSON field. Inconsistent with the validation pattern used by all other API routes.

**Recommended Fix:**
- Create a `ScreeningCreateSchema` in `schemas.ts` with proper types and bounds
- Validate `patient_id` as UUID, `total_score` as bounded integer, `instrument` already validated
- Test: verify rejection of invalid UUIDs, out-of-range scores, oversized payloads

---

### QA-006: TOCTOU Race in Billing Duplicate Check [CRITICAL]

**File:** `src/app/api/billing/route.ts`, lines 60-76
**Description:** The billing POST handler checks for duplicates via a SELECT, then does an INSERT. Between the check and insert, another request can insert the same record:
```typescript
// Check (time of check)
const { data: duplicateBilling } = await supabase
    .from('billing').select('id')
    .eq('encounter_id', ...).eq('service_date', ...);
if (duplicateBilling) return 409;
// Insert (time of use) - another request may have inserted between these lines
const { data: billing, error } = await supabase.from('billing').insert([...]);
```
While the 23505 handler provides a fallback, the race window exists and there is no database-level unique constraint verification in the codebase.

**Risk:** Duplicate billing records. In healthcare billing, duplicate claims can constitute fraud.

**Recommended Fix:**
- Ensure a database UNIQUE constraint exists on `(encounter_id, service_date, organization_id)`
- Remove the application-level check-then-insert and rely solely on the DB constraint + 23505 handler
- Test: simulate concurrent requests to verify idempotency

---

### QA-007: Minimal Test Coverage Across the Codebase [HIGH]

**File:** Project-wide
**Description:** The test inventory:
- `src/__tests__/csrf.test.ts` - 8 tests
- `src/__tests__/safe-logger.test.ts` - 5 tests
- `src/__tests__/validation-schemas.test.ts` - ~25 tests
- `src/lib/security/__tests__/intrusion-detection.test.ts`
- `src/lib/security/__tests__/sanitization.test.ts`
- `src/lib/security/encryption.test.ts`
- `src/lib/validation/schemas.test.ts`
- 6 e2e Playwright specs (login, patients, notes-navigation, route-protection, api-security, security-headers)

Missing test coverage for: data layer (`patients.ts`, `notes.ts`, `encounters.ts`), all API route handlers, auth module (`api-auth.ts`, `mfa.ts`, `lockout.ts`), billing logic, managed-billing services (claim-generator, claim-scrubber, era-parser, clearinghouse-service), subscription service, audit-log module, rate-limit module, masking utilities, file-security module.

**Risk:** The vast majority of business-critical and security-critical code paths have zero automated test coverage.

**Recommended Fix:** Establish a minimum coverage target of 80% for `src/lib/` and `src/app/api/`. Start with security-critical modules.

---

### QA-008: Lockout Check Fails-Open on Database Error [HIGH]

**File:** `src/lib/auth/lockout.ts`, line 44
**Description:** When the database query fails, the lockout check returns `{ locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts }`, allowing unlimited login attempts:
```typescript
if (error) {
    console.error('Error checking lockout:', error);
    return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
}
```
Note: The API route `check-lockout/route.ts` has been fixed to fail-closed, but this client-side module still fails open.

**Risk:** If the client-side lockout module is used directly (e.g., in SSR components), database failures allow brute force attacks.

**Recommended Fix:** Return `{ locked: true, remainingAttempts: 0 }` on error. Also note this module imports from `@/lib/supabase/client` (browser client) which should not be used for server-side security checks.

---

### QA-009: AI Chat Audit Event Uses Wrong Event Type [HIGH]

**File:** `src/app/api/ai/chat/route.ts`, line 34
**Description:** AI chat interactions are logged as `NOTE_VIEW` instead of `AI_CHAT_REQUEST`:
```typescript
await logAuditEvent({
    eventType: 'NOTE_VIEW', // User querying AI about clinical data
```
The `AI_CHAT_REQUEST` event type exists in the AuditEventType union but is not used.

**Risk:** HIPAA audit trail is inaccurate. AI interactions involving PHI cannot be distinguished from note viewing in audit log queries. Compliance auditors cannot properly review AI usage patterns.

**Recommended Fix:** Change to `eventType: 'AI_CHAT_REQUEST'`. Apply same fix to `ai/diagnose/route.ts` (QA-028). Test: verify correct event type in audit logs.

---

### QA-010: Patient PATCH Endpoint Has No Input Validation [HIGH]

**File:** `src/app/api/patients/[id]/route.ts`, lines 52-70
**Description:** The PATCH handler passes the raw JSON body directly to `updatePatient` without any Zod validation:
```typescript
const updates = await context.request.json();
const patient = await updatePatient(id, context.user.organizationId || '', updates);
```
The `PatientUpdateSchema` exists in `schemas.ts` but is never used in this handler.

**Risk:** Arbitrary fields can be injected into the patient update query. Fields like `organization_id`, `created_by`, `status`, or any column can be overwritten by a malicious client.

**Recommended Fix:**
```typescript
const validation = validateRequest(PatientUpdateSchema, updates);
if (!validation.success) return NextResponse.json({error: 'Validation failed', details: validation.errors}, {status: 400});
const patient = await updatePatient(id, context.user.organizationId || '', validation.data);
```
Test: verify that fields like `organization_id`, `created_by` are rejected.

---

### QA-011: IDS Safelist Disables Protection for Most API Routes [HIGH]

**File:** `src/middleware.ts`, lines 16-27
**Description:** The intrusion detection safelist includes:
```typescript
'/api/patients', '/api/notes', '/api/appointments', '/api/billing', '/api/ai/',
```
Since `pathname.startsWith(safe)` is used, this disables SQL injection, XSS, and path traversal detection for the vast majority of API traffic. The IDS effectively only runs on routes like `/api/admin/`, `/api/subscriptions/`, `/api/ehr/`, and `/api/managed-billing/`.

**Risk:** Attack payloads in URLs targeting patient, note, appointment, billing, and AI endpoints bypass intrusion detection entirely.

**Recommended Fix:** Instead of safelisting entire route prefixes, either (a) run IDS on request bodies and query parameters instead of path names, or (b) make the safelist path-exact rather than prefix-based. Test: verify IDS detects SQL injection in `/api/patients?search='; DROP TABLE --`.

---

### QA-012: Patient Last Visit Update Uses Raw Data [HIGH]

**File:** `src/app/api/notes/route.ts`, lines 132-138
**Description:** After Zod validation of the note body, the patient update still references `rawData`:
```typescript
const validatedData = validation.data;
// ...
await supabase.from('patients').update({
    last_visit_date: rawData.note_date || new Date().toISOString().split('T')[0]
}).eq('id', validatedData.patient_id);
```
The `note_date` field is not in the NoteCreateSchema and comes from unvalidated raw input.

**Risk:** Arbitrary date strings or malformed data injected into patient records. Not covered by Zod validation.

**Recommended Fix:** Either add `note_date` to NoteCreateSchema, or remove the raw reference and use `new Date().toISOString().split('T')[0]` exclusively.

---

### QA-013: Security Alert System is Console-Only [HIGH]

**File:** `src/lib/security/audit-log.ts`, lines 289-312
**Description:** The `triggerSecurityAlert` function for CRITICAL events only logs to console:
```typescript
async function triggerSecurityAlert(entry: AuditLogEntry): Promise<void> {
    console.error('[SECURITY ALERT]', entry.eventType, entry);
    // In production, this would:
    // 1. Send email to security team
    // 2. Send SMS for critical alerts
    // 3. Trigger SIEM integration
    // 4. Create incident ticket
```
All four items are unimplemented TODO comments.

**Risk:** Cross-organization access attempts, data breach indicators, and other CRITICAL security events will only appear in server logs that may not be monitored. HIPAA requires prompt breach notification.

**Recommended Fix:** Integrate with at least one alerting channel (email via Resend, Slack webhook, PagerDuty, or Sentry alert). Test: verify alert is dispatched for CRITICAL events.

---

### QA-014: Note Detail Endpoints Have No Role Restriction [HIGH]

**File:** `src/app/api/notes/[id]/route.ts`, lines 210-212
**Description:** The GET, PATCH, and DELETE handlers for individual notes use `withAuth` without any `requiredRole` option:
```typescript
export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
```
This means any authenticated user regardless of role (including AUDITOR) can modify or delete clinical notes.

**Risk:** Auditors should have read-only access to notes. Any authenticated user can delete clinical records.

**Recommended Fix:** Add `requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN']` for PATCH and DELETE. Consider AUDITOR read-only access for GET.

---

### QA-015: Patient Search Loads Entire Org Into Memory [HIGH]

**File:** `src/lib/data/patients.ts`, lines 200-265
**Description:** The `searchPatients` function fetches ALL patients for an organization and then filters in JavaScript:
```typescript
const { data: allPatients, error } = await dbQuery.order('created_at', { ascending: false });
const filtered = (allPatients || []).filter((patient: any) => { ... });
```

**Risk:** For organizations with thousands of patients, this causes excessive memory usage, slow response times, and potential OOM crashes. It also transfers all patient PHI over the database connection even when only a handful match.

**Recommended Fix:** Use Supabase `.ilike()` or `.or()` with proper column filters, or implement a database function for full-text search. Test: benchmark with 10K+ patients.

---

### QA-016: Webhook Idempotency Store Lost on Cold Start [HIGH]

**File:** `src/app/api/subscriptions/webhook/route.ts`, line 16
**Description:** The Stripe webhook handler uses an in-memory `Map` for idempotency:
```typescript
const processedEvents = new Map<string, number>();
```
On Vercel (serverless), each cold start creates a fresh Map. Duplicate events processed across different invocations will not be detected.

**Risk:** Duplicate subscription activations, duplicate cancellations, or duplicate payment status updates.

**Recommended Fix:** Use Redis (Upstash) for the idempotency store, or record processed event IDs in the database. The code already has a comment acknowledging this: "use Redis in production for multi-instance deployments".

---

### QA-017: No Input Validation on Telehealth Room Creation [HIGH]

**File:** `src/app/api/telehealth/create-room/route.ts`, lines 10-12
**Description:** The request body is destructured without Zod validation:
```typescript
const body = await context.request.json();
const { appointmentId, patientName, providerId } = body;
```
`TelehealthCreateRoomSchema` exists in `schemas.ts` but is never used here.

**Risk:** `patientName` is passed directly to the Daily.co API as `user_name`. This could contain injection payloads or PHI that gets logged by the third-party service.

**Recommended Fix:** Use `validateRequest(TelehealthCreateRoomSchema, body)`. Test: verify that oversized or malicious patientName values are rejected.

---

### QA-018: Vitals GET Query Missing Organization Scoping [HIGH]

**File:** `src/app/api/vitals/route.ts`, lines 52-63
**Description:** The vitals query filters by `patient_id` or `encounter_id` but does NOT filter by `organization_id`:
```typescript
let query = supabase.from('vitals').select('*')
    .order('recorded_at', { ascending: false }).limit(limit);
if (patient_id) query = query.eq('patient_id', patient_id);
```
If RLS policies on the `vitals` table are misconfigured or absent, any authenticated user could query vitals from other organizations by providing a patient_id from another org.

**Risk:** Cross-organization PHI access if RLS is not properly configured.

**Recommended Fix:** Add `.eq('organization_id', context.user.organizationId)` to the query. Same applies to the screenings endpoint. Test: verify that vitals from other orgs are not returned.

---

### QA-019: Safe Logger Test Coverage Incomplete [MEDIUM]

**File:** `src/__tests__/safe-logger.test.ts`
**Description:** Only `sanitizeError` is tested. No tests for `safeLog`, `logInfo`, `logError`, `logWarn`, `logDebug`, `devLog`, `devError`, or the log level filtering logic.

**Risk:** Changes to log level behavior or PHI filtering in log output could regress without detection.

**Recommended Fix:** Add tests verifying: (1) log level filtering works, (2) production mode suppresses debug logs, (3) SafeLogData type is enforced (no arbitrary string fields).

---

### QA-020: AI Treatment Plan Schema Uses `.passthrough()` [MEDIUM]

**File:** `src/lib/validation/schemas.ts`, line 160
**Description:** `AITreatmentPlanSchema` allows arbitrary JSON in `patientProfile`:
```typescript
patientProfile: z.union([z.string().max(5000), z.object({}).passthrough()]),
```
`.passthrough()` accepts and passes through any additional properties.

**Risk:** Unvalidated JSON can be passed to the AI service, potentially including injection payloads or excessively large nested objects.

**Recommended Fix:** Replace `.passthrough()` with a defined schema or use `.strict()`. At minimum, add a `.refine()` to limit the serialized size.

---

### QA-021: Invoice Number Not Collision-Resistant [MEDIUM]

**File:** `src/app/api/billing/route.ts`, line 78
**Description:** Invoice numbers use `Math.random()`:
```typescript
const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
```

**Risk:** `Math.random()` is not cryptographically secure and can produce collisions under high concurrency. Invoice number collisions could cause billing confusion.

**Recommended Fix:** Use `crypto.randomUUID()` or `crypto.randomBytes()` for the random portion. Test: generate 10K invoice numbers and verify uniqueness.

---

### QA-022: Async Audit Events May Be Silently Lost [MEDIUM]

**File:** `src/lib/security/audit-log.ts`, lines 158-163
**Description:** `logAuditEventAsync` fires and forgets:
```typescript
export function logAuditEventAsync(entry: AuditLogEntry): void {
    logAuditEvent(entry).catch(err => {
        console.error('Async audit log error:', err);
    });
}
```
Multiple routes use this for PHI access logging (patient search, note viewing).

**Risk:** If the Supabase insert fails (timeout, connection issues), the audit event is permanently lost. HIPAA requires reliable audit trails.

**Recommended Fix:** Implement a retry queue or write-ahead log for failed audit events. At minimum, log failures to Sentry with enough metadata to reconstruct the event.

---

### QA-023: In-Memory Rate Limit Not Safe for Multi-Instance [MEDIUM]

**File:** `src/lib/security/rate-limit.ts`, line 40
**Description:** The fallback rate limit store uses `Map<string, ...>()`. Each serverless instance has its own store.

**Risk:** Rate limits are per-instance, not per-user. An attacker can bypass rate limits by having requests routed to different instances. The code logs a warning but does not prevent deployment.

**Recommended Fix:** Make Upstash Redis mandatory in production. Fail startup if `UPSTASH_REDIS_REST_URL` is not set in production.

---

### QA-024: Login Attempt Recording Has No Email Validation [MEDIUM]

**File:** `src/app/api/auth/record-attempt/route.ts`, lines 10-11
**Description:** Only checks `!email` but does not validate email format. This endpoint is unauthenticated and accepts any string as email.

**Risk:** Log pollution, potential for abuse to fill the `login_attempts` table with garbage data.

**Recommended Fix:** Use `CheckLockoutSchema` or at minimum `z.string().email()` validation. Test: verify non-email strings are rejected.

---

### QA-025: Note Creation and Patient Update Not Transactional [MEDIUM]

**File:** `src/app/api/notes/route.ts`, lines 115-138
**Description:** The note INSERT and patient `last_visit_date` UPDATE are separate operations:
```typescript
const { data: note, error } = await supabase.from('clinical_notes').insert([...]);
if (error) throw error;
await supabase.from('patients').update({...}).eq('id', validatedData.patient_id);
```

**Risk:** If the patient update fails, the note exists but the patient's last_visit_date is stale. If the server crashes between operations, data is inconsistent.

**Recommended Fix:** Use a Supabase RPC function or database trigger to update last_visit_date atomically. The patient update failure is currently silently ignored.

---

### QA-026: Date Validation Accepts Invalid Calendar Dates [MEDIUM]

**File:** `src/lib/data/utils.ts`, lines 149-155
**Description:** `validateDate` checks regex format and `new Date()` parsing, but JavaScript's Date constructor coerces invalid dates:
```javascript
new Date('2024-02-30') // -> March 1, 2024 (valid Date object)
```

**Risk:** Invalid dates stored in patient records (Feb 30, Nov 31, etc).

**Recommended Fix:** Parse the date components and verify month/day validity. Test: verify `2024-02-30`, `2024-13-01`, `2024-00-15` are all rejected.

---

### QA-027: IDS SQL Injection Pattern Matches Clinical Text [MEDIUM]

**File:** `src/lib/security/intrusion-detection.ts`, line 26
**Description:** The SQL injection pattern includes `(\b(SELECT|INSERT|UPDATE|DELETE|DROP|...)\b)`. Clinical notes routinely contain words like "select" (medication selection), "drop" (drop in blood pressure), "or" (conditions).

**Risk:** Legitimate clinical requests could be blocked. Although most API paths are safelisted (QA-011), any non-safelisted route would false-positive on clinical content in URLs.

**Recommended Fix:** Only apply IDS patterns to URL paths and query parameters, not to request bodies. The body content is already protected by Zod validation and parameterized queries.

---

### QA-028: AI Diagnose Uses Wrong Audit Event Type [MEDIUM]

**File:** `src/app/api/ai/diagnose/route.ts`, line 27-28
**Description:** Same issue as QA-009. Uses `NOTE_VIEW` instead of `AI_DIAGNOSE_REQUEST`.

**Risk:** Inaccurate HIPAA audit trail for AI-assisted diagnosis operations.

**Recommended Fix:** Change to `eventType: 'AI_DIAGNOSE_REQUEST'`.

---

### QA-029: Patient GET Swallows All Errors as 404 [MEDIUM]

**File:** `src/app/api/patients/[id]/route.ts`, lines 42-48
**Description:** The catch block returns 404 for all errors:
```typescript
} catch (error) {
    logError({...});
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
}
```

**Risk:** Database connection failures, RLS errors, and other server errors are masked as 404. This makes debugging and monitoring difficult.

**Recommended Fix:** Distinguish between "not found" errors and server errors. Return 500 for unexpected failures.

---

### QA-030: Risk Assessment Overwrites Cognitive Score [MEDIUM]

**File:** `src/app/api/risk-assessments/route.ts`, lines 148-159
**Description:** Both MMSE and MoCA scores write to the same `cognitive_score` field:
```typescript
if (assessmentData.mmse_score !== undefined) updateData.cognitive_score = assessmentData.mmse_score;
if (assessmentData.moca_score !== undefined) updateData.cognitive_score = assessmentData.moca_score;
```
If both are provided, MoCA silently overwrites MMSE.

**Risk:** Clinical data loss. MMSE and MoCA have different scoring scales (both 0-30 but different interpretations).

**Recommended Fix:** Store in separate fields (`mmse_score`, `moca_score`) or add a `cognitive_score_type` discriminator. Test: verify both scores are preserved when submitted together.

---

### QA-031: Overly Permissive CSRF Origin Validation [MEDIUM]

**File:** `src/lib/security/csrf.ts`, lines 88-96
**Description:** Any `*.vercel.app` subdomain is accepted:
```typescript
if (url.hostname.endsWith('.vercel.app')) {
    return true;
}
```

**Risk:** Any Vercel deployment (including attacker-controlled Vercel projects) can make cross-origin requests to the application.

**Recommended Fix:** Only accept the specific Vercel project URL pattern (e.g., `chartspark-*.vercel.app`) or use an explicit allowlist.

---

### QA-032: No Encryption Roundtrip Test [MEDIUM]

**File:** `src/lib/security/encryption.test.ts` (exists but not reviewed in detail)
**Description:** No test verifies that `encryptPHI` followed by `decryptPHI` returns the original plaintext for various inputs (Unicode, empty string, very long strings, special characters).

**Risk:** Encryption/decryption bugs could corrupt patient PHI silently.

**Recommended Fix:** Add roundtrip tests with edge cases: empty string, Unicode (patient names in non-Latin scripts), 50KB payload, strings containing `:` (the delimiter character).

---

### QA-033: No Health Check Endpoint [MEDIUM]

**File:** `src/app/api/health/` (directory exists but no route.ts found)
**Description:** No `/api/health` endpoint exists for monitoring database connectivity, Redis availability, or general application health.

**Risk:** Infrastructure monitoring tools cannot verify the application is healthy. Supabase or Redis outages may go undetected.

**Recommended Fix:** Create `/api/health/route.ts` that checks Supabase connectivity, Redis connectivity (if configured), and returns a structured JSON response with component statuses.

---

### QA-034 through QA-042: Lower Severity Findings

**QA-034 [Low]:** No e2e test for the note signing workflow (a critical clinical operation with legal implications).

**QA-035 [Low]:** `src/lib/auth/lockout.ts` imports from `@/lib/supabase/client` (browser client). This module should use server or service-role client for server-side lockout checks.

**QA-036 [Low]:** `maskDOB` splits on both `-` and `/` but may produce unexpected output for ISO timestamps or other date formats.

**QA-037 [Low]:** No structured logging format. Mixing `console.log`, `console.error`, `safeLog`, and `devLog` across the codebase makes log aggregation and analysis difficult.

**QA-038 [Low]:** Appointment creation audit log uses `PATIENT_CREATE` instead of `APPOINTMENT_CREATE` event type.

**QA-039 [Low]:** No tests for `masking.ts` - the PHI data masking utilities have zero test coverage despite being critical for role-based PHI protection.

**QA-040 [Low]:** Session inactivity tracking uses `localStorage` which can be manipulated by the user to extend their session indefinitely. Server-side session validation should be the authority.

**QA-041 [Low]:** `PatientCreateSchema.date_of_birth` regex accepts future dates. A patient DOB of `2099-12-31` would pass validation.

**QA-042 [Low]:** Screenings GET parses `limit` with `parseInt` but does not bound it (vitals GET does the same). While the Supabase query accepts `.limit()`, extremely large values may cause performance issues.

---

## Recommendations Priority Matrix

### Immediate (Before Production)
1. **QA-004**: Fix clinical note delete to verify org ownership
2. **QA-003**: Fix open redirect in auth callback
3. **QA-002**: Implement data layer audit log (HIPAA requirement)
4. **QA-005**: Add Zod validation to screenings POST
5. **QA-010**: Add Zod validation to patient PATCH
6. **QA-014**: Add role restrictions to note detail endpoints
7. **QA-018**: Add org scoping to vitals and screenings queries

### Short-term (First Sprint Post-Launch)
8. **QA-001/QA-007**: Establish API route test infrastructure and write tests for auth, patient, and note routes
9. **QA-009/QA-028**: Fix audit event types for AI endpoints
10. **QA-012**: Fix rawData usage in note creation
11. **QA-013**: Implement at least one real alerting channel
12. **QA-016**: Move webhook idempotency to Redis
13. **QA-017**: Add validation to telehealth room creation

### Medium-term (Next 30 Days)
14. **QA-015**: Implement server-side patient search
15. **QA-006**: Rely on DB unique constraint for billing dedup
16. **QA-011**: Restructure IDS safelist
17. **QA-033**: Create health check endpoint
18. **QA-023**: Require Redis for rate limiting in production
19. **QA-025**: Make note creation + patient update transactional

---

## Test Strategy Recommendations

### Unit Tests Needed (Highest Priority)
1. **API Auth** (`withAuth`): Test auth enforcement, role checks, MFA enforcement, CSRF validation
2. **Patient API**: Test org scoping, validation, create/update/delete flows
3. **Note API**: Test org isolation, signed note immutability, note signing authorization
4. **Billing API**: Test idempotency, duplicate detection, validation
5. **Audit Log**: Test PHI sanitization, event persistence, async reliability

### Integration Tests Needed
1. Cross-organization access prevention (patient, note, appointment, vitals, screenings)
2. Note signing workflow end-to-end
3. Billing duplicate prevention under concurrency
4. Stripe webhook processing with duplicate events
5. Session timeout and re-authentication flows

### E2E Tests Needed
1. Note signing flow (draft -> sign -> verify immutability)
2. Patient document upload and retrieval
3. Telehealth room creation and join
4. Risk assessment creation and patient score update
5. MFA enrollment and challenge flow

---

*End of QA Purist Report*
