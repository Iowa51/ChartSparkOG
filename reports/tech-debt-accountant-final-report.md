# Tech Debt Accountant - Final Report

**Date:** 2026-03-19
**Branch:** pre-production-audit
**Scope:** Full codebase tech debt catalog for psychiatric EHR/PHI/HIPAA application

---

## Executive Summary

The ChartSpark codebase carries **moderate-to-high technical debt** across four key dimensions. The Sprint 1/2/3 security remediations addressed many critical gaps, but the fixes themselves introduced new patterns of debt. The most concerning areas are: (1) **three duplicate logger implementations** creating inconsistent PHI safety, (2) **80+ untyped `any` usages** concentrated in admin/billing pages, (3) **a legacy `.js` file** co-existing with its TypeScript replacement, and (4) **stub implementations** in billing infrastructure that will silently fail in production. The application has an unused dependency (`@supabase/auth-helpers-nextjs`) and hardcoded demo data imports in production code paths.

**Debt Score: 6.2/10** (10 = critical, needs immediate remediation)

---

## 1. Critical Tech Debt (Security-Impacting)

### 1.1 Three Duplicate Logger Implementations (PHI Leak Risk)
**Severity: CRITICAL** | **Files:**
- `src/lib/logging/safe-logger.ts` (lines 1-101) -- `safeLog()`, `devLog()`, `devWarn()`
- `src/lib/utils/safe-logger.ts` (lines 1-113) -- `safeLog()`, `logger`, `redactPHI()`
- `src/lib/data/utils.ts` (lines 32-51) -- `safeLogger` with `sanitizePHI()`

**Problem:** Three separate PHI-safe logging utilities with different redaction strategies, different function signatures, and different import paths. Code across the app imports from different loggers inconsistently. The `src/lib/data/utils.ts` version redacts UUIDs and emails; the `src/lib/utils/safe-logger.ts` version has the most comprehensive PHI field list; the `src/lib/logging/safe-logger.ts` version has no field-based redaction at all and only uses structured logging. **Any code importing the wrong logger may log PHI.**

**69 files** import from one of these logger paths.

### 1.2 Legacy Encryption Static Salt Still Active
**Severity: HIGH** | **File:** `src/lib/security/encryption.ts` (line 12)
```
const LEGACY_SALT = 'chartspark-salt';
```
The legacy encryption format uses a hardcoded static salt (`chartspark-salt`). While v2 encryption uses per-record salts, the legacy decryption path is still active and the `migrateEncryption()` function exists but there is **no evidence of a migration job** that actually runs it across existing records. Any pre-v2 data remains encrypted with the weaker static salt.

### 1.3 `null as any` Type Assertions in Supabase Clients
**Severity: HIGH** | **Files:**
- `src/lib/supabase/client.ts` (line 34) -- `return null as ReturnType<typeof createBrowserClient>`
- `src/lib/supabase/server.ts` (line 33) -- `return null as unknown as Awaited<ReturnType<typeof createSSRServerClient>>`

In demo mode, both Supabase client factories return `null` cast to the expected type. Any code that calls methods on the returned client without null-checking will throw at runtime. The TODO comments acknowledge this (`TODO: Gradually update all callers to handle null explicitly`) but no progress has been made. With `useFeature.ts` (line 31) checking `if (!supabase)` and enabling all features in demo mode, this is also a **feature gate bypass risk**.

### 1.4 Unused Dependency: `@supabase/auth-helpers-nextjs`
**Severity: MEDIUM** | **File:** `package.json` (line 19)

Listed as a dependency (`^0.15.0`) but **zero imports** found anywhere in `src/`. The app uses `@supabase/ssr` instead. This is dead weight that increases supply chain attack surface.

---

## 2. High Priority Debt

### 2.1 80+ `any` Type Usages
**Severity: HIGH** | **Concentrated in:**

| File | Count | Description |
|------|-------|-------------|
| `src/app/(app)/treatment-planner/page.tsx` | 30+ | Local UI components all typed as `any` props |
| `src/app/(admin)/super-admin/reports/page.tsx` | 10+ | All Supabase query results cast to `any` |
| `src/app/(admin)/super-admin/financials/page.tsx` | 6+ | Billing calculations on untyped data |
| `src/app/(app)/smart-triage/page.tsx` | 10+ | Clinical data structures untyped |
| `src/services/safeAzureOpenAI.ts` | 5 | AI service input/output untyped |
| `src/lib/data/utils.ts` | 5 | Error handling and audit logging |
| `src/lib/features/assign-defaults.ts` | 3 | Feature management |

The `treatment-planner/page.tsx` is the worst offender: it re-implements Card, Button, Badge, Tabs, TabsList, TabsTrigger, and TabsContent locally with `any` props instead of importing from `src/components/ui/`. This is a ~1100-line monolith page.

### 2.2 Legacy JavaScript File Alongside TypeScript Replacement
**Severity: HIGH** | **Files:**
- `src/services/azureOpenAIService.js` -- Original JS implementation
- `src/services/safeAzureOpenAI.ts` -- TypeScript replacement with demo mode

Both files exist and both are imported by different parts of the codebase. The `.js` file has no type safety and uses the deprecated `@azure/openai` comment header (though it actually imports from `openai`). The test-azure API route imports the JS version; other AI routes likely use the TS version.

### 2.3 SFTP Adapter is a Stub
**Severity: HIGH** | **File:** `src/lib/managed-billing/office-ally-sftp.ts` (lines 46-52, 73-74, 90-91)

Three TODO comments mark unimplemented functionality:
- `uploadClaim()` -- throws error in non-mock mode: `"SFTP Client dependency not yet installed"`
- `downloadERAs()` -- returns empty array silently
- `getAcknowledgements()` -- returns empty array silently

The `ssh2-sftp-client` dependency is not in `package.json`. Any production billing workflow that tries to submit claims via SFTP will fail.

### 2.4 Demo Data Imports in Production Code
**Severity: MEDIUM-HIGH** | **Files:**
- `src/components/notes/PatientQuickSelectModal.tsx` (line 6) -- imports `patients` from demo-data
- `src/app/(app)/templates/page.tsx` (line 20) -- imports `systemTemplates` from demo-data
- `src/app/(app)/submissions/page.tsx` (line 5) -- imports `submissions` from demo-data
- `src/app/(app)/notes/new/page.tsx` (lines 31-32) -- imports templates and demo notes
- `src/app/(admin)/super-admin/templates/page.tsx` (line 4) -- imports `templates` from demo-data
- `src/app/(admin)/super-admin/templates/[id]/page.tsx` (lines 5, 19) -- imports from demo-data

These pages use hardcoded demo data rather than querying Supabase. In production, users will see fake patient names, fake templates, and fake submissions.

### 2.5 Duplicate Quick Phrases Files
**Severity: MEDIUM** | **Files:**
- `src/lib/demo-data/quick-phrases.ts`
- `src/lib/clinical/quick-phrases.ts`

These are identical files (diff produced no output). Only `QuickPhrasePanel.tsx` imports the data, and it's unclear which file is the canonical source.

---

## 3. Medium/Low Debt

### 3.1 Silent Empty `catch` Blocks (20+ occurrences)
**File examples:**
- `src/components/patients/PatientDocuments.tsx` (lines 176, 192, 208) -- empty `catch {}`
- `src/lib/auth/lockout.ts` (lines 28, 98, 135, 170) -- empty `catch {}`
- `src/lib/security/audit-log.ts` (line 182) -- empty `catch {}`
- `src/components/layout/Header.tsx` (line 24) -- `catch (e) { }`

Silent error swallowing in auth lockout and audit logging is particularly dangerous for a HIPAA application where audit trail completeness is legally required.

### 3.2 92 `console.log/warn/error` Statements Across 30 Files
Despite having three logger implementations, many files still use raw `console.*` calls. These bypass all PHI redaction.

### 3.3 Test Page in Production Routes
**File:** `src/app/(app)/test-ai/page.tsx`

A test/debug page exists at the `/test-ai` route in the main app layout. While the API it calls (`/api/test-azure`) is properly auth-gated to SUPER_ADMIN, the page component itself has no auth check and is accessible to any authenticated user in the navigation.

### 3.4 Incomplete Invitation Cancel Endpoint
**File:** `src/app/(admin)/admin/invitations/page.tsx` (line 131)
```
// TODO: Implement cancel endpoint
```
The cancel button exists in the UI but has no backend implementation.

### 3.5 Unused `@azure/openai` Package
**File:** `package.json` (line 15)
The `@azure/openai` package (`^2.0.0`) is listed as a dependency, but the codebase has migrated to the `openai` package's built-in `AzureOpenAI` class. Both service files reference this migration in comments.

### 3.6 Missing `catch (err: any)` Typed Error Handling
**Files (examples):**
- `src/app/auth/mfa-challenge/page.tsx` (lines 50, 68)
- `src/app/auth/accept-invite/page.tsx` (lines 68, 100)
- `src/app/(app)/telehealth/setup/page.tsx` (lines 99, 181)
- `src/app/(admin)/super-admin/reports/page.tsx` (line 108)

These use `catch (err: any)` instead of proper error typing with `unknown` and type narrowing.

### 3.7 `Record<string, any>` in Type Definitions
**File:** `src/lib/types/database.ts` (line 367) -- `public details?: any`

The audit log `details` field is typed as `any`, propagating type unsafety through all audit logging code.

---

## 4. Sprint Fix Debt Assessment

### Sprint 1 (Security Remediations - `20260318120000`)
- **Debt introduced:** RLS policy migrations added but the `fix_rls_complete.sql` and `fix_rls_policies.sql` files remain as loose SQL files in `supabase/` root alongside the migrations directory, creating confusion about which is authoritative.
- **Assessment:** Low new debt; mostly cleanup work.

### Sprint 2 (Auth Hardening - `20260318120001`)
- **Debt introduced:** The `lockout.ts` module has 4 empty catch blocks that silently swallow auth errors. Rate limiting depends on Upstash Redis, but there is no fallback if Redis is unavailable (the `checkRateLimit` function returns success by default).
- **Assessment:** Medium new debt; empty catches in auth code need attention.

### Sprint 3 (Performance & Billing - `20260318120002`, `20260319120000-1`)
- **Debt introduced:** Billing migration files (`20260319120000_billing_infrastructure.sql`, `20260319120001_create_claim_lines.sql`) were added alongside existing billing schemas in `missing_tables.sql` and `stage1_database_foundation.sql`. Multiple migration files may create the same tables/columns, and there's no clear migration ordering guarantee for the unversioned files (`ehr_integration_tables.sql`, `patient_documents.sql`, `stage1_database_foundation.sql`, `missing_tables.sql`).
- **Assessment:** High new debt; migration file proliferation is a deployment risk.

### Sprint Fix (Verification Sweep - `7b02353`)
- **Debt introduced:** The demo mode security block in `environment.ts` correctly blocks demo mode in production, but the `useFeature.ts` hook still enables all features when the Supabase client is null (line 33: `setHasFeature(true)`), creating a potential bypass if the client fails to initialize for non-demo reasons.
- **Assessment:** Medium new debt; defense-in-depth gap.

---

## 5. Debt Reduction Roadmap

### Phase 1: Critical (Before Production Launch)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | **Consolidate to single logger** -- Merge `src/lib/logging/safe-logger.ts`, `src/lib/utils/safe-logger.ts`, and `src/lib/data/utils.ts:safeLogger` into one module with comprehensive PHI redaction. Update all 69 importing files. | 4h | Eliminates PHI leak risk from inconsistent logging |
| 2 | **Remove demo-data imports** from production pages -- Replace with Supabase queries or proper empty states | 6h | Prevents fake data display in production |
| 3 | **Delete `azureOpenAIService.js`** -- Ensure all imports point to `safeAzureOpenAI.ts` | 1h | Removes untyped legacy code |
| 4 | **Run encryption migration** -- Create a migration job to convert all legacy-encrypted records to v2 format, then remove legacy decryption code | 3h | Eliminates static salt weakness |
| 5 | **Remove `@supabase/auth-helpers-nextjs` and `@azure/openai`** from package.json | 15min | Reduces attack surface |

### Phase 2: High Priority (First Sprint Post-Launch)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 6 | **Type the `any` usages** -- Focus on treatment-planner (30+), smart-triage (10+), and admin reports (10+) | 8h | Type safety across clinical data |
| 7 | **Refactor treatment-planner/page.tsx** -- Extract to shared UI components, break into sub-components | 4h | Eliminates largest monolith file and ~30 `any` types |
| 8 | **Add error handling to empty catch blocks** -- Especially in `lockout.ts` and `audit-log.ts` | 3h | HIPAA audit trail completeness |
| 9 | **Clean up migration files** -- Remove or archive loose SQL files from `supabase/` root | 2h | Clear migration path |
| 10 | **Delete duplicate quick-phrases file** and update imports | 30min | Removes confusion |

### Phase 3: Medium Priority (Within 60 Days)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 11 | **Replace raw `console.*` calls** with the consolidated logger (92 occurrences, 30 files) | 4h | PHI safety in all logging |
| 12 | **Implement SFTP adapter** or remove stub code | 8h | Billing feature completion |
| 13 | **Implement invitation cancel endpoint** | 2h | UI/backend parity |
| 14 | **Remove/protect test-ai page** from production routes | 1h | Attack surface reduction |
| 15 | **Fix `useFeature` null-client behavior** -- Should deny features when client is null for non-demo reasons | 2h | Feature gate integrity |

### Total Estimated Remediation: ~48 hours of developer time

---

## Appendix: File Index

| Finding | Primary File(s) |
|---------|----------------|
| Duplicate loggers | `src/lib/logging/safe-logger.ts`, `src/lib/utils/safe-logger.ts`, `src/lib/data/utils.ts` |
| Legacy encryption | `src/lib/security/encryption.ts` |
| Null-as-type Supabase | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` |
| Legacy JS file | `src/services/azureOpenAIService.js` |
| SFTP stub | `src/lib/managed-billing/office-ally-sftp.ts` |
| Demo data imports | `src/app/(app)/notes/new/page.tsx`, `src/app/(app)/templates/page.tsx`, `src/app/(app)/submissions/page.tsx`, `src/components/notes/PatientQuickSelectModal.tsx` |
| Duplicate quick-phrases | `src/lib/demo-data/quick-phrases.ts`, `src/lib/clinical/quick-phrases.ts` |
| Feature bypass risk | `src/hooks/useFeature.ts` |
| Environment config | `src/lib/config/environment.ts` |
| Middleware | `src/middleware.ts` |
| Treatment planner monolith | `src/app/(app)/treatment-planner/page.tsx` |
| Empty catch blocks | `src/lib/auth/lockout.ts`, `src/lib/security/audit-log.ts`, `src/components/patients/PatientDocuments.tsx` |
| Loose migration files | `supabase/fix_rls_complete.sql`, `supabase/fix_rls_policies.sql`, `supabase/missing_tables.sql` |
