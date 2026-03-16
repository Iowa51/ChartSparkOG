# Post-Fix Report — ChartSpark EHR Security Remediation

**Date:** 2026-03-15
**Audit Reference:** SECURITY_AUDIT_2026-03-15.md
**TypeScript Check:** All modified files pass `tsc --noEmit` with zero errors

---

## Fix 1: CRITICAL-1 — Unprotected `/api/admin/system-health` endpoint

**File:** `src/app/api/admin/system-health/route.ts`

| What changed | Lines |
|---|---|
| Added `import { withAuth, AuthContext } from '@/lib/auth/api-auth'` | 3 |
| Renamed `export async function GET(req)` → `async function handleGet(context: AuthContext)` | 23 |
| Added `const req = context.request;` to preserve existing `req` references | 24 |
| Added `export const GET = withAuth(handleGet, { requiredRole: ['SUPER_ADMIN'] })` | 232–234 |

**Before:** Any unauthenticated user could call `GET /api/admin/system-health` and receive active session counts, DB status, AI endpoint config, and recent audit log events.

**After:** Only authenticated users with `SUPER_ADMIN` role can access this endpoint. All others receive `401 Unauthorized` or `403 Forbidden`.

---

## Fix 2: CRITICAL-4 — Arbitrary column update via `fieldName` injection

**File:** `src/app/api/admin/profile-approvals/route.ts`

| What changed | Lines |
|---|---|
| Added `const ALLOWED_PROFILE_FIELDS = ['first_name', 'last_name', 'specialty', 'phone', 'license_number']` | 9 |
| Added whitelist validation before `updateData[fieldName] = newValue` | 23–25 |

**Before:** A malicious admin could POST `{ fieldName: "role", newValue: "SUPER_ADMIN" }` and escalate any user's privileges, or update `is_active`, `organization_id`, or any other column.

**After:** Only `first_name`, `last_name`, `specialty`, `phone`, and `license_number` are accepted. Any other `fieldName` returns `400 Invalid or disallowed field name`.

---

## Fix 3: CRITICAL-2 + HIGH-2 + HIGH-3 — PHI logged to console

### 3a. Clinical transcript logging (CRITICAL-2)

**File:** `src/app/(app)/notes/new/page.tsx`

| What changed | Original line | Fix |
|---|---|---|
| Transcript content logged | 1338 | Replaced with comment: `// PHI removed: transcript content must never be logged` |
| Microphone permission request | 1314 | Wrapped in `process.env.NODE_ENV === 'development'` guard |
| Permission granted log | 1318 | Wrapped in dev guard |
| Recognition started | 1330 | Wrapped in dev guard |
| Speech recognition error | 1343 | Wrapped in dev guard |
| No speech detected | 1362 | Replaced with non-logging comment |
| Recognition aborted | 1383 | Replaced with non-logging comment |
| Recognition ended | 1390 | Wrapped in dev guard |
| Audio start/end, speech start/end debug handlers | 1398–1413 | Removed 4 debug handlers; kept only `onaudiostart` for UI state update |
| recognition.start() log | 1422 | Wrapped in dev guard |
| Failed to start error | 1425 | Wrapped in dev guard |
| Microphone denied error | 1431 | Wrapped in dev guard |
| Demo mode fallback log | 1446 | Wrapped in dev guard |

**Before:** Full clinical transcripts (SOAP notes, diagnoses, medications) printed to browser DevTools in production. 15 console statements with potential PHI exposure.

**After:** Transcript content is never logged. All remaining scribe logs are gated behind `process.env.NODE_ENV === 'development'` and stripped from production builds by Next.js dead-code elimination.

### 3b. Telehealth participant names (HIGH-2)

**File:** `src/components/telehealth/DailyVideoCall.tsx`

| What changed | Lines |
|---|---|
| `participant-joined` handler: removed `event?.participant?.user_name` from log | 194 |
| `participant-left` handler: removed `event?.participant?.user_name` from log | 199 |
| Both wrapped in `process.env.NODE_ENV === 'development'` guard | 194, 199 |

**Before:** Patient and provider names logged to browser console during every telehealth session.

**After:** Participant names are never logged. Join/leave events only log in development, without names.

### 3c. User email in auth warnings (HIGH-3)

**File:** `src/lib/auth/api-auth.ts`

| What changed | Lines |
|---|---|
| Deactivated account warning: `user.email` → `user.id` | 57 |
| Unauthorized access warning: `user.email` → `user.id` | 113 |

**Before:** User email addresses logged in server console on every deactivated-account attempt and unauthorized role access.

**After:** Logs use opaque user ID instead. Email is a quasi-identifier under HIPAA; UUID is not.

---

## Fix 4: HIGH-5 — Unvalidated POST body on `/api/appointments`

**File:** `src/app/api/appointments/route.ts`

| What changed | Lines |
|---|---|
| Added imports: `z` from `zod`, `UUIDSchema` and `validateRequest` from schemas | 7–8 |
| Added `AppointmentPostSchema` with typed fields matching DB columns | 10–20 |
| Replaced raw `await context.request.json()` with `validateRequest(AppointmentPostSchema, rawBody)` | 85–89 |
| Returns `400` with validation errors on failure | 87 |

**Before:** Raw request body spread directly into `.insert([{ ...appointmentData }])` — any arbitrary fields accepted (including `organization_id` override, `id` injection, or junk data).

**After:** Only whitelisted fields are accepted: `patient_id` (UUID, required), `provider_id` (UUID, optional), `appointment_datetime` (string, required), `appointment_type` (string, max 100), `status` (enum), `notes` (max 2000), `duration_minutes` (1–480), `is_telehealth` (boolean), `reason` (max 500). All other fields are stripped.

---

## Fix 5: HIGH-6 — Unvalidated POST body on `/api/vitals`

**File:** `src/app/api/vitals/route.ts`

| What changed | Lines |
|---|---|
| Added imports: `z`, `UUIDSchema`, `validateRequest` | 8–9 |
| Added `VitalsCreateSchema` with clinical range validation | 11–29 |
| Replaced raw destructuring with `validateRequest(VitalsCreateSchema, rawBody)` | 93–98 |
| Changed `|| null` to `?? null` in insert for consistency with schema output | 136–154 |

**Before:** Accepted any values without type or range checking — negative blood pressure, impossible SpO2 values, non-numeric fields all passed through.

**After:** Each vital sign has clinically meaningful range validation:
- `bp_systolic`: 40–300 mmHg
- `bp_diastolic`: 20–200 mmHg
- `heart_rate`: 20–300 bpm
- `temperature`: 85–115°F
- `respiratory_rate`: 4–60 breaths/min
- `spo2`: 50–100%
- `weight`: 0.1–1500 (lbs or kg)
- `height`: 1–120 (inches or cm)
- `pain_scale`: 0–10

---

## Fix 6: HIGH-7 — Missing org isolation + unvalidated PATCH on `/api/appointments/[id]`

**File:** `src/app/api/appointments/[id]/route.ts`

| What changed | Lines |
|---|---|
| Added imports: `canAccessOrganization`, `logAuditEvent`, `logError`, `sanitizeError`, `z`, `validateRequest` | 5–10 |
| Added `AppointmentUpdateSchema` (`.strict()` to reject unknown fields) | 12–21 |
| **GET:** Added org isolation check after fetch — verifies `appointment.organization_id` matches user's org via `canAccessOrganization()` | 36–48 |
| **GET:** Reduced `patient:patients(*)` to `patient:patients(id, first_name, last_name)` (minimum necessary) | 28 |
| **GET:** Logs `UNAUTHORIZED_ACCESS` audit event with `CRITICAL` risk on cross-org attempt | 38–47 |
| **PATCH:** Added pre-fetch of existing appointment to check org ownership | 63–66 |
| **PATCH:** Added org isolation check with `CRITICAL` audit logging | 68–79 |
| **PATCH:** Added `validateRequest(AppointmentUpdateSchema, rawBody)` for input validation | 82–86 |
| **PATCH:** Uses `.strict()` schema — rejects unknown/extra fields entirely | 12 |
| **DELETE:** Added pre-fetch + org isolation check with `CRITICAL` audit logging | 100–116 |
| **All handlers:** Added `requireOrganization: true` to `withAuth` options | 126–128 |
| **All handlers:** Added proper error logging with `logError` + `sanitizeError` | 93, 121 |

**Before:** Any authenticated user could read, modify, or cancel ANY appointment across ALL organizations by guessing/enumerating appointment IDs. PATCH accepted arbitrary fields including `organization_id`.

**After:**
- All three handlers (GET/PATCH/DELETE) verify the appointment belongs to the user's organization before proceeding
- Cross-org access attempts are logged as `CRITICAL` audit events
- PATCH body is validated against a strict schema (only appointment-relevant fields accepted)
- GET returns minimal patient/provider fields instead of `patients(*)`
- `requireOrganization: true` ensures user must have an org assignment

---

## Verification

```
$ npx tsc --noEmit 2>&1 | grep -E "system-health|profile-approvals|appointments|vitals|api-auth|DailyVideoCall|notes/new"
(no output — zero errors)
```

All 6 modified files pass TypeScript type-checking with no errors introduced.

---

## Summary

| ID | Severity | Status | File |
|----|----------|--------|------|
| CRITICAL-1 | CRITICAL | FIXED | `src/app/api/admin/system-health/route.ts` |
| CRITICAL-4 | CRITICAL | FIXED | `src/app/api/admin/profile-approvals/route.ts` |
| CRITICAL-2 | CRITICAL | FIXED | `src/app/(app)/notes/new/page.tsx` |
| HIGH-2 | HIGH | FIXED | `src/components/telehealth/DailyVideoCall.tsx` |
| HIGH-3 | HIGH | FIXED | `src/lib/auth/api-auth.ts` |
| HIGH-5 | HIGH | FIXED | `src/app/api/appointments/route.ts` |
| HIGH-6 | HIGH | FIXED | `src/app/api/vitals/route.ts` |
| HIGH-7 | HIGH | FIXED | `src/app/api/appointments/[id]/route.ts` |

**Total findings remediated: 8** (4 CRITICAL, 4 HIGH)
**Files modified: 7**
**TypeScript errors introduced: 0**

---

## Codex Independent Review — Additional Fixes

**Date:** 2026-03-16
**Reviewer:** Independent Codex audit (not part of original 2026-03-15 audit)
**TypeScript Check:** All modified files pass `tsc --noEmit` with zero new errors

---

### CODEX-1 (CRITICAL): MFA API Gap — `requireMFA` enforcement for privileged roles

**Files modified:**

| File | What changed | Lines |
|---|---|---|
| `src/lib/auth/api-auth.ts` | Added `requireMFA?: boolean` to `AuthOptions` interface | 25 |
| `src/lib/auth/api-auth.ts` | Added MFA enforcement block: checks `session.aal === 'aal2'`; fails closed on error | 119–132 |
| `src/app/api/admin/profile-approvals/route.ts` | Added `requireMFA: true` to `withAuth` options | 89 |
| `src/app/api/admin/invitations/route.ts` | Added `requireMFA: true` to both GET and POST `withAuth` options | 226, 231 |
| `src/app/api/auditor/batch-action/route.ts` | Added `requireMFA: true` to `withAuth` options | 94 |

**Before:** ADMIN, SUPER_ADMIN, and AUDITOR routes only checked role — a compromised session without MFA could access privileged operations (profile approvals, invitations, batch audit actions).

**After:** All three privileged routes require AAL2 (Authenticator Assurance Level 2) on the Supabase session. If MFA has not been completed, the request is rejected with `403 MFA required`. The check fails closed on error (returns 503).

---

### CODEX-2 (HIGH): Cross-patient PHI leak to OpenAI — Notes query missing patient filter

**File:** `src/app/api/ai/smart-triage/chart-summary/route.ts`

| What changed | Lines |
|---|---|
| Added `.eq('patient_id', patient_id)` to notes query before org filter | 90 |

**Before:** The notes query at line 87–92 filtered only by `organization_id`, meaning ALL notes from the entire organization were fetched and embedded in the AI prompt. A chart summary for Patient A could include clinical SOAP notes from Patients B, C, D, etc.

**After:** Notes are scoped to the specific `patient_id` first, then `organization_id`. Only the target patient's clinical notes are sent to the AI model.

**Medication-review route:** Verified — `src/app/api/ai/smart-triage/medication-review/route.ts` does not have a notes query. All data fetches (medications, problems, allergies) are already correctly scoped by `patient_id`. No fix needed.

---

### CODEX-3 (HIGH): Note signing without provider ownership check

**File:** `src/app/api/notes/[id]/sign/route.ts`

| What changed | Lines |
|---|---|
| Added `provider_id` to the `clinical_notes` SELECT query | 24 |
| Added ownership check: `currentNote.provider_id !== context.user.id` with SUPER_ADMIN bypass | 30–46 |
| Added `UNAUTHORIZED_ACCESS` audit event (risk: HIGH) on non-owner sign attempt | 32–44 |

**Before:** Any authenticated user within the same organization could sign any clinical note, regardless of whether they were the note's authoring provider. This violated clinical documentation integrity rules.

**After:** Only the note's `provider_id` (the authoring clinician) can sign the note. `SUPER_ADMIN` users are exempt for administrative override scenarios. Non-owner attempts are rejected with 403 and logged as HIGH-risk audit events.

---

### CODEX-4 (HIGH): Telehealth room creation without appointment validation

**File:** `src/app/api/telehealth/create-room/route.ts`

| What changed | Lines |
|---|---|
| Changed appointment lookup from soft-fail to hard-fail (returns 400 on null/error) | 21–27 |
| Added organization ownership check on the appointment record | 29–36 |
| Added appointment status validation — only `scheduled` or `confirmed` allowed | 38–45 |
| Added `status` to the appointment SELECT query | 23 |
| Removed `appointmentVerified` soft-flag variable and demo-mode fallthrough | 21–47 |

**Before:** If the appointment lookup failed or returned null, the route logged a warning but continued to create a Daily.co room anyway. No status check — cancelled, completed, or no-show appointments could spawn telehealth rooms. Org check was conditional on `context.user.organizationId` being truthy.

**After:** Appointment lookup failure is a hard 400 error. Organization ownership is enforced (SUPER_ADMIN exempt). Only appointments with status `scheduled` or `confirmed` can create telehealth rooms. Invalid statuses return 400 with a descriptive message.

---

### CODEX-5 (MEDIUM): Billing idempotency — duplicate record prevention

**File:** `src/app/api/billing/route.ts`

| What changed | Lines |
|---|---|
| Added `Idempotency-Key` header check — if present, looks up existing record by key and returns it (200) instead of creating duplicate | 28–41 |
| Added uniqueness check on `encounter_id` + `service_date` + `organization_id` before insert — returns 409 if duplicate found | 43–55 |
| Attaches `idempotency_key` to insert payload when header is provided | 62–64 |

**Before:** Repeated POST requests (from network retries, double-clicks, or client bugs) would create duplicate billing records for the same encounter and service date. No idempotency mechanism existed.

**After:** Two layers of protection:
1. **Idempotency-Key header:** If the client sends an `Idempotency-Key` header, the server checks for an existing billing record with that key. If found, returns the existing record with `{ duplicate: true }` (HTTP 200) instead of inserting.
2. **Encounter + date uniqueness:** Even without the header, if `encounter_id` and `service_date` are provided and a matching record already exists for the organization, the insert is blocked with HTTP 409 and the existing invoice number is returned.

---

### Verification

```
$ npx tsc --noEmit 2>&1 | grep -E "api-auth|profile-approvals|invitations|batch-action|chart-summary|medication-review|sign/route|create-room|billing/route"
(no output — zero errors in modified files)
```

### Summary

| ID | Severity | Status | File(s) |
|----|----------|--------|---------|
| CODEX-1 | CRITICAL | FIXED | `src/lib/auth/api-auth.ts`, `src/app/api/admin/profile-approvals/route.ts`, `src/app/api/admin/invitations/route.ts`, `src/app/api/auditor/batch-action/route.ts` |
| CODEX-2 | HIGH | FIXED | `src/app/api/ai/smart-triage/chart-summary/route.ts` |
| CODEX-3 | HIGH | FIXED | `src/app/api/notes/[id]/sign/route.ts` |
| CODEX-4 | HIGH | FIXED | `src/app/api/telehealth/create-room/route.ts` |
| CODEX-5 | MEDIUM | FIXED | `src/app/api/billing/route.ts` |

**Total additional findings remediated: 5** (1 CRITICAL, 3 HIGH, 1 MEDIUM)
**Files modified: 7**
**TypeScript errors introduced: 0**
