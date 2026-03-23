# ChartSpark EHR - Technical Debt Accountant Report

**Date:** 2026-03-18
**Codebase:** ChartSpark Psychiatric EHR
**Branch:** pre-production-audit
**Auditor:** Tech Debt Accountant (Claude Opus 4.6)

---

## Executive Summary

ChartSpark is a Next.js 16 + Supabase psychiatric EHR handling PHI/HIPAA-sensitive mental health records. The codebase has undergone multiple rapid security remediation passes, which introduced their own form of debt: duplicated abstractions, orphaned code, and inconsistent patterns. The total estimated remediation effort is **~22-30 developer-days**.

---

## Summary Table

| # | Finding | Severity | Category | Est. Effort | Interest Rate |
|---|---------|----------|----------|-------------|---------------|
| 1 | Hardcoded credentials in test files | **Critical** | Security | 2h | Extreme |
| 2 | `.env.local` files tracked / present with real tokens | **Critical** | Security | 1h | Extreme |
| 3 | Duplicate audit logging systems (3 implementations) | High | Code Duplication | 2d | High |
| 4 | Duplicate validation frameworks (3 systems) | High | Code Duplication | 2d | High |
| 5 | Duplicate safe-logger implementations (3 systems) | High | Code Duplication | 1d | High |
| 6 | Duplicate database type definitions (2 files) | High | Code Duplication | 4h | Medium |
| 7 | `azureOpenAIService` vs `safeAzureOpenAI` ghost import | High | Dead Code / Broken Ref | 2h | Medium |
| 8 | SOAP note prompt duplicated verbatim in streaming/non-streaming | Medium | Code Duplication | 2h | Low |
| 9 | Root-level orphaned test/debug scripts | Medium | Dead Code | 1h | Low |
| 10 | Incomplete SFTP adapter (stub with TODOs) | Medium | Migration Debt | 1d | Medium |
| 11 | `createAuditLog` in `data/utils.ts` is a no-op stub | **High** | HIPAA Compliance | 4h | High |
| 12 | Billing route missing audit logging | High | HIPAA Compliance | 2h | High |
| 13 | Inconsistent demo mode checks across codebase | Medium | Configuration Debt | 1d | Medium |
| 14 | 116 uses of `any` type across 30 source files | Medium | Type Safety | 2d | Medium |
| 15 | ESLint `continue-on-error: true` in CI | Medium | Missing Infrastructure | 2h | Medium |
| 16 | Missing `AUDITOR` role in `src/types/database.ts` User interface | Medium | Inconsistent Patterns | 1h | Medium |
| 17 | Inconsistent naming conventions (camelCase vs snake_case) in schemas | Medium | Inconsistent Patterns | 1d | Low |
| 18 | `@azure/openai` package unused (migrated to `openai`) | Low | Outdated Dependencies | 30m | Low |
| 19 | Encryption legacy format compatibility shim (`LEGACY_SALT`) | Medium | Migration Debt | 1d | Medium |
| 20 | `lockout.ts` uses browser client for server-side operation | High | Architectural Debt | 4h | High |
| 21 | Telehealth route bypasses centralized audit logging | Medium | HIPAA Compliance | 2h | Medium |
| 22 | Magic numbers in session/rate-limit config | Low | Configuration Debt | 2h | Low |
| 23 | `FLAG_TEMPLATES` duplicated across auditor components | Low | Code Duplication | 1h | Low |
| 24 | Missing automated formatting (no Prettier config) | Low | Missing Infrastructure | 1h | Low |
| 25 | `test-ai` page exposes internal AI service in production | Medium | Security | 2h | Medium |
| 26 | `office-ally-sftp.ts` uses base64 as "decryption" | **High** | Security | 4h | High |

---

## Detailed Findings

---

### FINDING 1: Hardcoded Credentials in Test Files (CRITICAL)

**Severity:** Critical
**Category:** Security / HIPAA Compliance
**Files:**
- `/test-login.js` (line 5) - Hardcoded Supabase service role JWT
- `/test-rls.js` (line 6) - Hardcoded Supabase anon key
- Both files contain hardcoded Supabase URL, demo password `Demo123!!`

**Description:** Two root-level test scripts contain hardcoded Supabase JWTs (service role and anon keys) and demo credentials in plain text. These are committed to git history. Even though `.gitignore` excludes `.env*`, these JS files bypass that protection entirely. The service role key in `test-login.js` grants RLS-bypassing access to all data.

**Interest Rate:** Extreme - Every day these exist in git history is a day they could leak via a repo exposure. Service role keys grant full database access bypassing all RLS policies.

**Estimated Effort:** 2 hours (delete files, rotate all exposed keys, scrub from git history)

**Remediation:**
1. Delete `test-login.js`, `test-rls.js`, `test-delete.js`, and `verify-billing.ts` from the repository
2. Rotate ALL Supabase keys (service role and anon) immediately
3. Use `git filter-branch` or BFG Repo Cleaner to scrub credentials from git history
4. Add `test-*.js` and `verify-*.ts` to `.gitignore`

---

### FINDING 2: Environment Files With Real Tokens Present

**Severity:** Critical
**Category:** Security
**Files:**
- `/.env.local` - Contains real Vercel OIDC token, Supabase URL
- `/.env.vercel` - Present in working directory
- `/.env.vercel.production` - Present in working directory

**Description:** While `.gitignore` has `.env*` listed, the `.env.local` file contains a real Vercel OIDC JWT token and Supabase project URL. The `.gitignore` pattern uses `.env*` which should exclude them from git, but these files existing in the project root with real credentials is a risk if any file sharing or backup occurs outside git.

**Interest Rate:** Extreme if these files ever enter version control.

**Estimated Effort:** 1 hour

**Remediation:**
1. Verify these files are NOT tracked by git (`git ls-files -- '.env*'`)
2. Add explicit entries to `.gitignore`: `.env.local`, `.env.vercel`, `.env.vercel.production`
3. Rotate the Vercel OIDC token visible in `.env.local`

---

### FINDING 3: Three Competing Audit Logging Systems

**Severity:** High
**Category:** Code Duplication / HIPAA Compliance
**Files:**
- `/src/lib/security/audit-log.ts` - 392 lines, uses `createClient()` (user-scoped Supabase)
- `/src/lib/audit/audit-service.ts` - 192 lines, uses `createServiceRoleClient()` (RLS-bypassing)
- `/src/lib/data/utils.ts` lines 252-277 - Stub `createAuditLog()` that only logs to console

**Description:** The codebase has THREE separate audit logging implementations with different type systems (`AuditEventType` vs `AuditAction`), different Supabase clients (user-scoped vs service-role), and different interfaces. API routes inconsistently import from different systems. The `data/utils.ts` version is a no-op stub that never actually writes to the database.

The `audit-log.ts` version uses the user-scoped client, which means audit writes are subject to RLS policies and could silently fail if the user lacks insert permissions on `audit_logs`. The `audit-service.ts` version correctly uses the service role client.

**Interest Rate:** High - Every new feature or API route must choose which system to use, compounding confusion. The stub in `data/utils.ts` means some operations may silently skip audit logging entirely, creating HIPAA compliance gaps.

**Estimated Effort:** 2 days

**Remediation:**
1. Consolidate into a single audit service using `createServiceRoleClient()` (the `audit-service.ts` approach is correct)
2. Unify the event type enums into one canonical type
3. Remove the stub in `data/utils.ts`
4. Update all 30+ call sites to use the consolidated service
5. Add integration test verifying audit logs are actually written

---

### FINDING 4: Three Competing Validation Frameworks

**Severity:** High
**Category:** Code Duplication / Inconsistent Patterns
**Files:**
- `/src/lib/security/validation.ts` - Zod schemas with custom sanitization (PatientSchema, NoteSchema, etc. using camelCase field names)
- `/src/lib/validation/schemas.ts` - Zod schemas for API routes (PatientCreateSchema, NoteCreateSchema, etc. using snake_case field names)
- `/src/lib/utils/validation.ts` - Manual validation functions (isValidEmail, isValidPhone, etc.)

**Description:** Three separate validation systems exist with overlapping but inconsistent schemas. `security/validation.ts` uses camelCase (`firstName`), while `validation/schemas.ts` uses snake_case (`first_name`). Both define `PatientSchema` and `NoteSchema` with different field sets, different validation rules, and different enum values (e.g., gender enums differ). The `utils/validation.ts` file provides yet another set of manual validators that duplicate what Zod already does.

Both `security/validation.ts` and `validation/schemas.ts` export a `validateRequest` function with different signatures (async vs sync).

**Interest Rate:** High - New developers will pick whichever validation system they find first, creating inconsistency. Schema drift between the two Zod files will cause subtle bugs.

**Estimated Effort:** 2 days

**Remediation:**
1. Choose `validation/schemas.ts` as the canonical source (it has more complete schemas and matches DB column names)
2. Merge unique sanitization logic from `security/validation.ts` into the canonical file
3. Remove `security/validation.ts` or reduce it to a re-export wrapper
4. Replace manual validators in `utils/validation.ts` with Zod-based equivalents where used in forms
5. Standardize on snake_case for all API-facing schemas (matching database columns)

---

### FINDING 5: Three Safe-Logger Implementations

**Severity:** High
**Category:** Code Duplication
**Files:**
- `/src/lib/logging/safe-logger.ts` - Primary logger used by most API routes (imports: `logError`, `sanitizeError`, `devLog`)
- `/src/lib/utils/safe-logger.ts` - PHI-redacting structured logger with pattern-based redaction
- `/src/lib/data/utils.ts` lines 16-50 - Inline `safeLogger` object with `sanitizePHI()`

**Description:** Three separate PHI-safe logging implementations exist. Each has its own approach to PHI redaction: `logging/safe-logger.ts` uses a safe-by-omission approach (SafeLogData type restricts fields), `utils/safe-logger.ts` uses pattern-based redaction (regex matching), and `data/utils.ts` uses string replacement. The `data/utils.ts` safeLogger is exported and potentially used by data layer code.

**Interest Rate:** High - PHI could leak through whichever logger is least restrictive.

**Estimated Effort:** 1 day

**Remediation:**
1. Consolidate into `logging/safe-logger.ts` as the single source of truth
2. Incorporate the pattern-based PHI redaction from `utils/safe-logger.ts` as an additional safety layer
3. Remove `utils/safe-logger.ts` and the inline logger from `data/utils.ts`
4. Update all imports across the codebase

---

### FINDING 6: Duplicate Database Type Definitions

**Severity:** High
**Category:** Code Duplication
**Files:**
- `/src/types/database.ts` - 207 lines, has FeatureCode types, simpler Patient/Note types
- `/src/lib/types/database.ts` - 326 lines, has full Patient/Note/Encounter types with input/error types

**Description:** Two separate `database.ts` type files exist with overlapping but divergent definitions. The `Organization`, `User`, `Patient`, `Note`, and `Encounter` interfaces are defined in BOTH files with different field sets. For example:
- `src/types/database.ts` Patient has `dob`, `mrn`, `allergies` as direct fields
- `src/lib/types/database.ts` Patient has `date_of_birth`, `phone`, `email`, `created_by` and a different `status` enum

This creates type confusion where importing from the wrong path silently gives you the wrong interface.

**Interest Rate:** Medium - As the schema evolves, only one file gets updated, causing drift.

**Estimated Effort:** 4 hours

**Remediation:**
1. Merge into a single canonical types file at `src/lib/types/database.ts`
2. Remove `src/types/database.ts`
3. Move feature-related types (FeatureCode, etc.) to a dedicated `src/lib/types/features.ts`
4. Update all imports

---

### FINDING 7: Ghost Import - `azureOpenAIService` vs `safeAzureOpenAI`

**Severity:** High
**Category:** Dead Code / Broken Reference
**Files:**
- `/src/app/api/test-azure/route.ts` line 7 - imports `azureOpenAIService` (does not exist as a file)
- `/src/app/(app)/test-ai/page.tsx` - imports `azureOpenAIService`
- Only `/src/services/safeAzureOpenAI.ts` exists in `/src/services/`

**Description:** Two files import from `@/services/azureOpenAIService` but only `safeAzureOpenAI.ts` exists. This means the `test-azure` API route and `test-ai` page are importing a non-existent module. These routes would crash at runtime when accessed.

**Interest Rate:** Medium - Broken routes that may not be caught until a user hits them.

**Estimated Effort:** 2 hours

**Remediation:**
1. Update imports to use `safeAzureOpenAI` or create an alias export
2. Consider removing the `test-azure` and `test-ai` routes from production builds

---

### FINDING 8: Duplicated SOAP Note Prompt (Verbatim Copy-Paste)

**Severity:** Medium
**Category:** Code Duplication
**File:** `/src/services/safeAzureOpenAI.ts`
- Lines 333-351 (`generateSOAPNoteStream`) and lines 394-412 (`generateSOAPNote`)

**Description:** The SOAP note generation prompt is copy-pasted verbatim between the streaming and non-streaming methods. The system prompt, user prompt template, temperature, and max_tokens are identical. Any update to the prompt requires changing both locations.

**Interest Rate:** Low - Prompt changes are infrequent but when they happen, forgetting one location creates inconsistent AI output.

**Estimated Effort:** 2 hours

**Remediation:** Extract the prompt template and parameters into a shared constant or method, then have both `generateSOAPNote` and `generateSOAPNoteStream` reference it.

---

### FINDING 9: Root-Level Orphaned Test/Debug Scripts

**Severity:** Medium
**Category:** Dead Code
**Files:**
- `/test-delete.js` - Debug script for testing note deletion via service role
- `/test-login.js` - Debug script for testing auth (contains hardcoded credentials - see Finding 1)
- `/test-rls.js` - Debug script for testing RLS policies (contains hardcoded credentials)
- `/verify-billing.ts` - Billing verification script

**Description:** Four ad-hoc test/debug scripts sit in the project root. They are not part of any test suite, not referenced in `package.json` scripts, and contain manual database operations. These appear to be developer scratch files that were never cleaned up.

**Interest Rate:** Low - They clutter the root directory and create confusion about which tests are official.

**Estimated Effort:** 1 hour

**Remediation:** Delete all four files. If the test scenarios are valuable, rewrite them as proper Vitest or Playwright tests.

---

### FINDING 10: Incomplete SFTP Adapter (Stub With TODOs)

**Severity:** Medium
**Category:** Migration Debt
**File:** `/src/lib/managed-billing/office-ally-sftp.ts`
- Lines 44-51: `uploadClaim` throws "SFTP Client dependency not yet installed"
- Lines 72, 89: `downloadERAs` and `getAcknowledgements` return empty arrays with TODO comments

**Description:** The Office Ally SFTP adapter is a mock/stub that cannot perform real SFTP operations. The non-mock path immediately throws an error. The `ssh2-sftp-client` dependency is not installed. This means the entire clearinghouse integration is non-functional in production.

**Interest Rate:** Medium - Blocks production deployment of managed billing features.

**Estimated Effort:** 1 day

**Remediation:**
1. Install `ssh2-sftp-client` dependency
2. Implement the actual SFTP connection, upload, and download logic
3. Add integration tests with a mock SFTP server

---

### FINDING 11: `createAuditLog` in `data/utils.ts` Is a No-Op Stub

**Severity:** High
**Category:** HIPAA Compliance
**File:** `/src/lib/data/utils.ts` lines 268-277

**Description:** The `createAuditLog` function exported from `data/utils.ts` only logs to console in development and has a TODO comment saying "Implement actual audit log insertion." Any data layer code that calls this function via `import { createAuditLog } from '@/lib/data'` is NOT creating audit records. This is a HIPAA compliance gap because PHI access events routed through this function are never persisted.

**Interest Rate:** High - HIPAA requires demonstrable audit trails for all PHI access. Silent failure to log is worse than no logging at all.

**Estimated Effort:** 4 hours

**Remediation:**
1. Replace the stub with a call to the real audit service (`lib/audit/audit-service.ts`)
2. Or remove this export entirely and update callers to use the real audit service directly

---

### FINDING 12: Billing Route Missing Audit Logging

**Severity:** High
**Category:** HIPAA Compliance
**File:** `/src/app/api/billing/route.ts`

**Description:** The billing API route has no audit logging calls. Both the GET and POST handlers lack any `logAuditEvent`, `logPHIAccess`, or `createAuditLog` calls. Billing records contain patient financial data (patient_id, insurance_claim_id, amounts) which is considered PHI under HIPAA. Compare with the patients and notes routes which both have comprehensive audit logging.

**Interest Rate:** High - Billing activity is completely invisible to compliance auditors.

**Estimated Effort:** 2 hours

**Remediation:** Add audit logging to both GET and POST handlers following the pattern used in the patients route (`logAuditEventAsync` for reads, `logPHIAccess` for writes).

---

### FINDING 13: Inconsistent Demo Mode Checks

**Severity:** Medium
**Category:** Configuration Debt
**Files:**
- `/src/lib/config/environment.ts` - Centralized `isDemoMode()` function
- `/src/lib/supabase/server.ts` line 24 - Inline check: `process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`
- `/src/lib/supabase/client.ts` line 23 - Same inline check
- `/src/lib/supabase/service-role-client.ts` line 25 - Same inline check
- `/src/lib/supabase/middleware.ts` line 55 - Different check: `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'` (missing NODE_ENV guard)
- `/src/lib/config/environment.ts` line 36 - Blocks demo mode in production entirely

**Description:** Despite having a centralized `isDemoMode()` function in `environment.ts`, at least 4 other files perform their own inline demo mode checks with subtly different logic. The middleware check at line 55 does NOT check `NODE_ENV`, meaning it could allow demo mode in production (though a later block at line 59 catches this specific case). The `environment.ts` version blocks demo mode entirely in production, while the supabase clients allow it if NODE_ENV is not 'production'.

**Interest Rate:** Medium - Inconsistent demo mode behavior creates security edge cases.

**Estimated Effort:** 1 day

**Remediation:** Replace all inline demo mode checks with calls to the centralized `isDemoMode()` function from `lib/config/environment.ts`.

---

### FINDING 14: 116 Uses of `any` Type Across 30 Files

**Severity:** Medium
**Category:** Type Safety
**Key Files:**
- `src/services/safeAzureOpenAI.ts` - 6 occurrences (return types, parameters)
- `src/app/(app)/treatment-planner/page.tsx` - 18 occurrences
- `src/app/(admin)/super-admin/reports/page.tsx` - 10 occurrences
- `src/app/(app)/smart-triage/page.tsx` - 9 occurrences
- `src/lib/data/utils.ts` - 6 occurrences
- `src/lib/security/validation.ts` - 2 occurrences in generic functions

**Description:** 116 uses of the `any` type exist across 30 source files. In a HIPAA-compliant healthcare application, loose typing increases the risk of data leaks (e.g., logging objects that happen to contain PHI because TypeScript did not enforce the shape).

**Interest Rate:** Medium - Each `any` is a potential type-safety hole that compounds as the codebase grows.

**Estimated Effort:** 2 days

**Remediation:**
1. Enable `noImplicitAny` in `tsconfig.json` (currently not enforced)
2. Start with the most critical files: `safeAzureOpenAI.ts`, `security/validation.ts`, `data/utils.ts`
3. Replace `any` with proper types or `unknown` + type guards

---

### FINDING 15: ESLint Set to `continue-on-error` in CI

**Severity:** Medium
**Category:** Missing Infrastructure
**File:** `/.github/workflows/ci.yml` line 110

**Description:** The lint CI job has `continue-on-error: true`, meaning lint failures never block merges. This undermines code quality enforcement and allows problematic patterns to accumulate.

**Interest Rate:** Medium - Without enforcement, lint violations accumulate over time.

**Estimated Effort:** 2 hours

**Remediation:**
1. Remove `continue-on-error: true` from the lint job
2. Fix existing lint errors first, then enforce going forward
3. Consider adding lint as a required status check for PRs

---

### FINDING 16: Missing `AUDITOR` Role in `src/types/database.ts`

**Severity:** Medium
**Category:** Inconsistent Patterns
**Files:**
- `/src/types/database.ts` line 3: `type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'AUDITOR'` (correct)
- `/src/lib/types/database.ts` line 28: `role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'` (missing AUDITOR)

**Description:** The `User` interface in `src/lib/types/database.ts` omits the `AUDITOR` role from its role union type, while the other database types file includes it. This could cause type errors when working with auditor users through the data layer.

**Interest Rate:** Medium - Could cause silent type coercion issues.

**Estimated Effort:** 1 hour

**Remediation:** Add `'AUDITOR'` to the role union in `src/lib/types/database.ts`.

---

### FINDING 17: Inconsistent Naming (camelCase vs snake_case in Schemas)

**Severity:** Medium
**Category:** Inconsistent Patterns
**Files:**
- `/src/lib/security/validation.ts` - Uses camelCase: `firstName`, `lastName`, `dateOfBirth`, `insuranceProvider`
- `/src/lib/validation/schemas.ts` - Uses snake_case: `first_name`, `last_name`, `date_of_birth`, `insurance`

**Description:** The two validation schema files use different naming conventions. This creates confusion about which convention the API expects and requires mapping logic between the two formats.

**Interest Rate:** Low - Friction for developers but doesn't cause runtime issues directly.

**Estimated Effort:** 1 day

**Remediation:** Standardize on snake_case for API schemas (matching database column names) and camelCase only for React component props.

---

### FINDING 18: `@azure/openai` Package Listed but Unused

**Severity:** Low
**Category:** Outdated Dependencies
**File:** `/package.json` line 15

**Description:** `@azure/openai: ^2.0.0` is listed as a dependency, but the codebase has migrated to using `openai` package's `AzureOpenAI` class (see `safeAzureOpenAI.ts` line 11). The comment in that file confirms: "Migrated to openai v4+ AzureOpenAI client (from deprecated @azure/openai v1.x)."

**Interest Rate:** Low - Adds to bundle size and maintenance surface.

**Estimated Effort:** 30 minutes

**Remediation:** Remove `@azure/openai` from `package.json` and run `npm install`.

---

### FINDING 19: Legacy Encryption Format Compatibility Shim

**Severity:** Medium
**Category:** Migration Debt
**File:** `/src/lib/security/encryption.ts` lines 12, 169-193

**Description:** The encryption module maintains backward compatibility with a "legacy" v1 format that uses a hardcoded static salt (`chartspark-salt`). The `decryptLegacy` function and `isLegacyEncrypted` detection logic add complexity. There is a `migrateEncryption` function but no evidence of a migration script or cron job to actually run the migration.

**Interest Rate:** Medium - The legacy format using a static salt is cryptographically weaker. Without a migration plan, legacy-encrypted data will persist indefinitely.

**Estimated Effort:** 1 day

**Remediation:**
1. Create a migration script that reads all patients, detects legacy-encrypted fields, and re-encrypts with v2 format
2. Run migration in a maintenance window
3. After migration is complete, remove legacy decryption code
4. Add a check that rejects legacy format after a cutoff date

---

### FINDING 20: `lockout.ts` Uses Browser Client for Server-Side Operation

**Severity:** High
**Category:** Architectural Debt
**File:** `/src/lib/auth/lockout.ts` line 4

**Description:** The lockout module imports `createClient` from `@/lib/supabase/client` (the BROWSER client). However, lockout checks happen in API routes and server-side contexts. The browser client is designed for client-side use and may not work correctly in server contexts. Additionally, lockout operations need to bypass RLS (you need to check lockout status BEFORE a user is authenticated), so they should use the service role client.

Compare with the API routes at `/src/app/api/auth/check-lockout/route.ts` and `/src/app/api/auth/record-attempt/route.ts` which correctly use the service role client.

**Interest Rate:** High - Lockout checks may silently fail in server context, allowing brute force attacks to proceed.

**Estimated Effort:** 4 hours

**Remediation:**
1. Change import to use `createServiceRoleClient` from `@/lib/supabase/service-role-client`
2. Update all function signatures to handle the null case properly
3. Verify the lockout API routes are using the lockout module or inline their own logic consistently

---

### FINDING 21: Telehealth Route Bypasses Centralized Audit Logging

**Severity:** Medium
**Category:** HIPAA Compliance
**File:** `/src/app/api/telehealth/create-room/route.ts` lines 131-147

**Description:** The telehealth room creation route writes audit logs directly via raw Supabase insert (`supabase.from('audit_logs').insert(...)`) instead of using either of the centralized audit logging services. This bypasses PHI sanitization, risk level calculation, and security alert triggering that the centralized services provide. The event type `TELEHEALTH_ROOM_CREATED` is not defined in any of the audit event type enums.

**Interest Rate:** Medium - Telehealth session creation/access is auditable under HIPAA.

**Estimated Effort:** 2 hours

**Remediation:** Replace the inline audit log insert with a call to the centralized audit service.

---

### FINDING 22: Magic Numbers in Session and Rate-Limit Configuration

**Severity:** Low
**Category:** Configuration Debt
**Files:**
- `/src/lib/auth/session.ts` - Session timeouts hardcoded (15 min, 8 hours, 2 min warning)
- `/src/lib/security/rate-limit.ts` - Rate limits hardcoded (100/min API, 10/min auth, etc.)
- `/src/lib/auth/lockout.ts` - Lockout config hardcoded (5 attempts, 30 min lockout)
- `/src/lib/security/rate-limit.ts` line 56-57 - Circuit breaker values hardcoded

**Description:** Security-critical numeric values are hardcoded as constants rather than being configurable via environment variables. While the current values are reasonable, changing them requires code changes and redeployment rather than configuration updates.

**Interest Rate:** Low - These values change infrequently.

**Estimated Effort:** 2 hours

**Remediation:** Make these configurable via environment variables with the current values as defaults.

---

### FINDING 23: `FLAG_TEMPLATES` Duplicated Across Auditor Components

**Severity:** Low
**Category:** Code Duplication
**Files:**
- `/src/components/auditor/AuditWorkspace.tsx` line 33
- `/src/components/auditor/SubmissionsTable.tsx` line 34

**Description:** The `FLAG_TEMPLATES` constant is defined identically in two auditor components. Any change to the flag template options requires updating both files.

**Interest Rate:** Low

**Estimated Effort:** 1 hour

**Remediation:** Extract `FLAG_TEMPLATES` into a shared constant file (e.g., `src/lib/auditor/constants.ts`).

---

### FINDING 24: Missing Automated Formatting

**Severity:** Low
**Category:** Missing Infrastructure

**Description:** The project has ESLint configured but no Prettier or equivalent automated code formatting. The ESLint config is minimal (just `next/core-web-vitals` and `next/typescript`). There are no custom rules for import ordering, unused variables, or consistent formatting.

**Interest Rate:** Low - Code style inconsistency accumulates slowly.

**Estimated Effort:** 1 hour

**Remediation:**
1. Add Prettier with a `.prettierrc` config
2. Add a `format` script to `package.json`
3. Add a format check to CI
4. Run initial format pass on the codebase

---

### FINDING 25: `test-ai` Page May Be Accessible in Production

**Severity:** Medium
**Category:** Security
**File:** `/src/app/(app)/test-ai/page.tsx`

**Description:** A `test-ai` page exists under the authenticated app routes. This page appears to expose internal AI service testing functionality. While it requires authentication, it should not be accessible in production environments.

**Interest Rate:** Medium - Test pages in production increase attack surface.

**Estimated Effort:** 2 hours

**Remediation:**
1. Gate the page behind a `NODE_ENV === 'development'` check or a SUPER_ADMIN role check
2. Or remove the page entirely and rely on the protected `test-azure` API endpoint

---

### FINDING 26: Office Ally SFTP "Decryption" Uses Base64 Decode

**Severity:** High
**Category:** Security
**File:** `/src/lib/managed-billing/office-ally-sftp.ts` lines 130-135

**Description:** The `decrypt()` function that handles clearinghouse SFTP credentials simply performs a `Buffer.from(encryptedValue, 'base64').toString('ascii')` - this is base64 decoding, NOT encryption. Base64 is an encoding, not a cipher. Anyone with database read access can decode these credentials trivially.

**Interest Rate:** High - Clearinghouse credentials stored with fake "encryption" could be exposed in a database breach.

**Estimated Effort:** 4 hours

**Remediation:**
1. Use the existing `decryptPHI` function from `lib/security/encryption.ts` for clearinghouse credentials
2. Re-encrypt all stored clearinghouse passwords using proper AES-256-GCM
3. Remove the fake `decrypt` function

---

## Debt Category Totals

| Category | Finding Count | Total Effort | Weighted Risk |
|----------|:------------:|:------------:|:-------------:|
| Security | 4 | 2.5 days | Critical |
| HIPAA Compliance | 4 | 1.5 days | High |
| Code Duplication | 6 | 5.5 days | High |
| Inconsistent Patterns | 3 | 1.5 days | Medium |
| Architectural Debt | 1 | 0.5 days | High |
| Dead Code | 2 | 0.5 days | Low |
| Migration Debt | 2 | 2 days | Medium |
| Configuration Debt | 2 | 0.5 days | Low |
| Missing Infrastructure | 2 | 0.5 days | Medium |
| Outdated Dependencies | 1 | 0.1 days | Low |
| Type Safety | 1 | 2 days | Medium |

---

## Priority Remediation Roadmap

### Sprint 1 (Immediate - This Week)
1. **Finding 1** - Delete test files, rotate credentials
2. **Finding 2** - Verify env files are not tracked
3. **Finding 26** - Fix fake decryption in SFTP adapter
4. **Finding 20** - Fix lockout.ts client usage
5. **Finding 7** - Fix ghost import / broken route

### Sprint 2 (Week 2)
6. **Finding 3** - Consolidate audit logging systems
7. **Finding 11** - Fix no-op audit stub
8. **Finding 12** - Add audit logging to billing route
9. **Finding 21** - Fix telehealth audit logging
10. **Finding 5** - Consolidate safe-logger implementations

### Sprint 3 (Week 3)
11. **Finding 4** - Consolidate validation frameworks
12. **Finding 6** - Merge duplicate type definitions
13. **Finding 13** - Centralize demo mode checks
14. **Finding 16** - Fix AUDITOR role in types

### Sprint 4 (Week 4)
15. **Finding 14** - Reduce `any` usage (highest-impact files first)
16. **Finding 15** - Enforce ESLint in CI
17. **Finding 19** - Plan and execute encryption migration
18. **Finding 17** - Standardize naming conventions

### Backlog
19. Findings 8, 9, 18, 22, 23, 24, 25 - Low-priority cleanup

---

## Total Debt Score

| Metric | Value |
|--------|-------|
| Total Findings | 26 |
| Critical | 2 |
| High | 9 |
| Medium | 12 |
| Low | 3 |
| Total Estimated Effort | **22-30 developer-days** |
| Debt Ratio (debt effort / est. codebase effort) | ~15-20% |
| **Overall Debt Score** | **72 / 100** (where 100 = debt-free) |

The codebase demonstrates strong security intent (multiple layers of auth, MFA, encryption, rate limiting, intrusion detection) but the rapid security remediation passes have created significant duplication debt. The most critical items are the hardcoded credentials and the HIPAA audit logging gaps. The duplication across validation, logging, and audit systems is the largest volume of debt and should be addressed systematically in Sprints 2-3 to prevent compounding.

---

*Report generated by Tech Debt Accountant, 2026-03-18*
