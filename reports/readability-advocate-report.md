# Readability Advocate Report - ChartSpark EHR

**Date:** 2026-03-18
**Reviewer:** Readability Advocate (Automated)
**Branch:** pre-production-audit
**Scope:** Full codebase review of psychiatric EHR handling PHI/HIPAA-sensitive mental health records

---

## Executive Summary

ChartSpark is a Next.js-based psychiatric EHR with a large managed-billing module, AI-assisted clinical tooling, and HIPAA-compliant security infrastructure. Overall, the codebase demonstrates **solid architectural patterns** with centralized auth (`withAuth`), consistent Zod validation, and PHI-safe logging. However, several readability issues exist that could become maintenance hazards in a HIPAA-regulated environment where auditability, clarity, and correctness are paramount.

**Overall Readability Grade: C+**

Key themes:
- Duplicated EDI/ERA parsing logic across multiple files
- Pervasive `any` types undermining TypeScript's safety guarantees
- Magic numbers in billing/clinical code without named constants
- Inconsistent logging (some files use `safe-logger`, others use raw `console.log`)
- Duplicate `switch` on NM1 segment tag in ERA parser (dead code branch)
- Large demo fallback data embedded inline in service classes

---

## Module Readability Scores

| Module/Directory | Grade | Notes |
|---|---|---|
| `src/lib/auth/` | **B+** | Clear, well-structured, good comments. Minor `any` usage. |
| `src/lib/security/` | **B** | Good patterns, but intrusion detection regex arrays lack inline explanations. |
| `src/lib/managed-billing/` | **C** | Duplicated EDI logic, heavy `any` usage, magic numbers, two separate ERA parsers. |
| `src/lib/data/` | **B** | Clean data layer with consistent error handling. Client-side search is a scalability concern but documented. |
| `src/lib/validation/` | **B+** | Well-organized Zod schemas. Two validation modules exist (schemas.ts and security/validation.ts) -- confusing. |
| `src/lib/billing/` | **B-** | Rates in dollars vs. cents inconsistency with managed-billing module. |
| `src/services/` | **C-** | SafeAzureOpenAI is 580+ lines with large inline demo data. Hard to maintain. |
| `src/app/api/` | **B** | Consistent auth pattern. Some routes lack Zod validation (managed-billing claims POST). |
| `src/components/` | **B-** | Inline Card components re-declared per page instead of shared. Mock data in components. |
| `src/middleware.ts` | **B+** | Clear, well-commented safelist approach. |

---

## Findings

### CRITICAL

---

#### C-1: Duplicate NM1 `case` in ERA Parser (Dead Code / Bug)

**File:** `src/lib/managed-billing/era-parser.ts`, lines 80-106
**Severity:** Critical

```typescript
switch (tag) {
    case 'NM1':
        if (parts[1] === 'PR') payerName = parts[3];
        if (parts[1] === 'PE') payeeName = parts[3];
        // ...
        break;
    // ... other cases ...
    case 'NM1':  // DUPLICATE CASE - this branch is UNREACHABLE
        if (parts[1] === 'QC' && currentClaim) {
            currentClaim.patientLastName = parts[3];
            // ...
        }
        break;
}
```

**Why it hurts readability:** A duplicate `case` label in a `switch` statement means the second branch is dead code -- the patient name extraction from NM1/QC segments never executes. In an EHR billing context, this means ERA payments will always have missing patient names, which could cause matching failures. This is both a readability issue (confusing control flow) and a correctness bug.

**Suggested improvement:** Merge both NM1 handlers into a single `case 'NM1':` block.

---

### HIGH

---

#### H-1: Two Separate ERA/835 Parsers with Divergent Logic

**Files:**
- `src/lib/managed-billing/era-parser.ts` (class `ERAParser`, 147 lines)
- `src/lib/managed-billing/era-service.ts` (function `parseERA835`, lines 168-241)

**Severity:** High

**Why it hurts readability:** Two different implementations exist for parsing the same HIPAA 835 format. They use different data structures (`ERAClaim` vs `ERAPayment`), different field names, and different parsing strategies. A developer fixing a parsing bug must find and fix it in both locations -- or worse, may only find one. In a HIPAA-regulated billing system, inconsistent payment parsing is a compliance risk.

**Suggested improvement:** Consolidate into a single parser module. The `ERAParser` class should be the canonical parser, and `era-service.ts` should import and use it.

---

#### H-2: Pervasive `any` Types in HIPAA-Critical Code

**Files:** Multiple -- most severe in:
- `src/lib/managed-billing/clearinghouse-service.ts` lines 166, 219, 261, 320, 350, 364
- `src/services/safeAzureOpenAI.ts` lines 56, 157, 191, 513
- `src/lib/security/audit-log.ts` line 375
- `src/lib/data/patients.ts` line 221
- `src/lib/auth/lockout.ts` line 119

**Severity:** High

```typescript
// clearinghouse-service.ts line 166
function generateEDI837(claim: any, config: GlobalConfig): string {

// safeAzureOpenAI.ts line 157
private normalizeDiagnosisResponse(data: any): any {

// lockout.ts line 119
export async function getLoginHistory(email: string, limit = 10): Promise<any[]> {
```

**Why it hurts readability:** In an EHR handling PHI, `any` types defeat TypeScript's ability to catch data access errors at compile time. A developer cannot tell what fields are available on `claim: any` without tracing through multiple database queries. This is especially dangerous in billing code where wrong field access means wrong financial data.

**Suggested improvement:** Define proper interfaces for all `any`-typed parameters. For Supabase query results, use generated types from `supabase gen types`.

---

#### H-3: Money Representation Inconsistency (Dollars vs. Cents)

**Files:**
- `src/lib/billing.ts` -- rates in **dollars** (e.g., `rate: 95.00`)
- `src/lib/managed-billing/claim-generator.ts` -- rates in **cents** (e.g., `'99213': 9500`)
- `src/lib/managed-billing/era-parser.ts` -- converts dollars to **cents** via `Math.round(parseFloat(...) * 100)`

**Severity:** High

```typescript
// billing.ts (dollars)
"99213": { description: "Office visit, low complexity", rate: 95.00 },

// claim-generator.ts (cents)
'99213': 9500,  // Comment says "$95.00 in cents" but only on first entry
```

**Why it hurts readability:** Two modules representing the same concept (CPT billing rates) use different units without a shared convention. A developer copying rates between modules could introduce 100x billing errors. The comments explaining "in cents" only appear on the first few entries in `claim-generator.ts`.

**Suggested improvement:** Establish a codebase-wide convention (recommend cents as integers everywhere, which is industry standard). Create a shared `Money` type or utility. Add a named constant like `const CENTS_PER_DOLLAR = 100`.

---

#### H-4: Encrypted Credentials Used as Plaintext in API Calls

**File:** `src/lib/managed-billing/clearinghouse-service.ts`, lines 228-232

**Severity:** High

```typescript
'Authorization': `Basic ${Buffer.from(
    `${config.api_key_encrypted}:${config.api_secret_encrypted}`
).toString('base64')}`,
```

**Why it hurts readability:** Field names ending in `_encrypted` strongly imply the values are encrypted ciphertext, yet they are used directly as plaintext API credentials. A reader cannot tell whether these values have been decrypted upstream or if the field names are misleading. This creates confusion about the security posture of credential handling.

**Suggested improvement:** Either decrypt before use (and rename local variables to drop `_encrypted`), or rename the database columns to indicate they store plaintext or are decrypted at retrieval time.

---

### MEDIUM

---

#### M-1: SafeAzureOpenAI Class Is 580+ Lines with Inline Demo Data

**File:** `src/services/safeAzureOpenAI.ts`

**Severity:** Medium

The `SafeAzureOpenAIService` class contains clinical AI logic, streaming support, SOAP note generation, **and** 200+ lines of hardcoded demo treatment plans and SOAP note templates. The `getDemoTreatmentPlan()` method alone is ~70 lines of static data.

**Why it hurts readability:** Mixing service logic with large static data objects makes the class hard to navigate. The demo treatment plan data includes detailed medication dosages and clinical recommendations that could drift out of date.

**Suggested improvement:** Extract demo data into `src/lib/demo-data/ai-responses.ts`. Keep the service class focused on API orchestration.

---

#### M-2: Duplicate `calculateAge` Function Across Files

**Files:**
- `src/lib/data/utils.ts` line 236 (exported utility)
- `src/app/(app)/patients/[id]/page.tsx` line 231 (inline re-implementation)

**Severity:** Medium

```typescript
// Both files contain identical logic:
const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    // ...
};
```

**Why it hurts readability:** Duplicated logic means a bug fix in one location won't propagate. In an EHR, age calculation affects dosing recommendations, screening tool eligibility, and geriatric assessments.

**Suggested improvement:** Import from `src/lib/data/utils.ts` in the component.

---

#### M-3: Duplicate Validation Modules

**Files:**
- `src/lib/validation/schemas.ts` -- centralized Zod schemas with `validateRequest`
- `src/lib/security/validation.ts` -- separate Zod schemas with its own `validateRequest`

**Severity:** Medium

Both files define patient, note, and encounter schemas, but with different field names and structures. The security validation file uses `PatientSchema` with `firstName` (camelCase), while the centralized schemas file uses `PatientCreateSchema` with `first_name` (snake_case).

**Why it hurts readability:** A developer doesn't know which validation module to import. The security module appears to be an older version that was partially superseded but never removed.

**Suggested improvement:** Consolidate into a single validation module. Remove the duplicate in `security/validation.ts` or clearly mark it as deprecated.

---

#### M-4: Inconsistent Logging Approach

**Files:** Multiple

**Severity:** Medium

Three different logging approaches are used:
1. `src/lib/logging/safe-logger.ts` -- PHI-safe structured logging (`logInfo`, `devLog`, etc.)
2. `src/lib/data/utils.ts` -- Its own `safeLogger` object with `console.log/warn/error`
3. Raw `console.log/error/warn` in `clearinghouse-service.ts`, `lockout.ts`, `audit-log.ts`

```typescript
// clearinghouse-service.ts line 50
console.warn('[Clearinghouse] No Supabase client - demo mode');

// clearinghouse-service.ts line 157
console.error('[Clearinghouse] Submission error:', error);

// era-service.ts uses devLog, devError correctly
```

**Why it hurts readability:** In a HIPAA-regulated system, inconsistent logging means some code paths may inadvertently log PHI while others properly sanitize it. The `console.error` calls in `clearinghouse-service.ts` could leak error details containing patient data in production.

**Suggested improvement:** Standardize on `src/lib/logging/safe-logger.ts` for all server-side logging. Add a lint rule to flag direct `console.*` usage.

---

#### M-5: `createAuditLog` in Data Utils Is a Stub

**File:** `src/lib/data/utils.ts`, lines 268-277

**Severity:** Medium

```typescript
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    // In production, this would insert into the audit_logs table
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
        safeLogger.info(`[AUDIT] ${entry.event_type}`);
    }
    // TODO: Implement actual audit log insertion
}
```

**Why it hurts readability:** The data layer (`patients.ts`) calls `createAuditLog` after every CRUD operation, giving the impression that audit logging is working. However, it silently does nothing in production. Meanwhile, a fully functional `logAuditEvent` exists in `src/lib/security/audit-log.ts`. The `TODO` comment suggests this was meant to be temporary but was never completed.

**Suggested improvement:** Either wire this to the real `logAuditEvent` from the security module, or remove it and call the security audit log directly from the data layer.

---

#### M-6: Magic Number Default Rate in Claim Generator

**File:** `src/lib/managed-billing/claim-generator.ts`, line 417

**Severity:** Medium

```typescript
return defaultRates[cptCode] || 10000; // Default $100 if code not found
```

**Why it hurts readability:** A billing system that silently falls back to $100 for unrecognized CPT codes is a compliance risk. The magic number `10000` (cents) has only an inline comment -- no named constant, no logging when the fallback triggers, and no indication to the user that a default was used.

**Suggested improvement:** Define `const DEFAULT_UNKNOWN_CPT_RATE_CENTS = 10000` with a clear name. Log a warning when the fallback is used. Consider returning `0` or throwing instead, to force explicit fee schedule setup.

---

#### M-7: Hardcoded Place of Service Codes

**File:** `src/lib/managed-billing/claim-generator.ts`, lines 423-433
**Also:** `src/lib/managed-billing/edi-generator.ts`

**Severity:** Medium

```typescript
function getPlaceOfService(encounterType: string): string {
    switch (encounterType) {
        case 'telehealth': return '02';
        case 'initial':
        case 'follow_up':
        case 'urgent':
        default: return '11';
    }
}
```

**Why it hurts readability:** CMS Place of Service codes are a standardized reference table, but here they are inline magic strings. A reader must know that `'02'` means Telehealth and `'11'` means Office. Additionally, this is incomplete -- no support for home visits (`12`), inpatient (`21`), outpatient hospital (`22`), etc.

**Suggested improvement:** Create a `PLACE_OF_SERVICE` enum or constant map (e.g., `{ TELEHEALTH: '02', OFFICE: '11', HOME: '12' }`) in a shared billing constants file.

---

#### M-8: Managed Billing Claims POST Route Lacks Input Validation

**File:** `src/app/api/managed-billing/claims/route.ts`, lines 61-87

**Severity:** Medium

```typescript
async function handlePost(context: AuthContext) {
    const body = await context.request.json();
    // No Zod validation -- raw body fields used directly
    const { data: claim, error } = await supabase
        .from('billing_claims')
        .insert({
            patient_id: body.patientId,       // Unvalidated
            provider_id: body.providerId,     // Unvalidated
            diagnosis_codes: body.diagnosisCodes || [],  // Unvalidated
            billed_amount: body.billedAmount || 0,       // Unvalidated
        })
```

**Why it hurts readability:** Every other POST route in the codebase uses Zod validation (`validateRequest`). This route's absence of validation breaks the pattern and forces a reader to wonder if it's intentional or an oversight. In billing code, unvalidated input is both a security and compliance concern.

**Suggested improvement:** Add a `ClaimCreateSchema` Zod schema and validate before insertion, consistent with the billing route pattern.

---

#### M-9: `checkAfterHoursAccess` Ignores Timezone Parameter

**File:** `src/lib/security/intrusion-detection.ts`, lines 177-199

**Severity:** Medium

```typescript
export function checkAfterHoursAccess(
    userRole: string,
    timezone = 'America/New_York'  // Parameter accepted but never used
): ThreatDetection {
    const now = new Date();
    const hours = now.getHours();  // Uses server local time, not the timezone param
```

**Why it hurts readability:** The function signature promises timezone-aware detection, but the implementation ignores the parameter entirely. A developer or auditor reading this code would assume after-hours detection respects the user's timezone, which it does not.

**Suggested improvement:** Either implement timezone-aware hour checking (using `Intl.DateTimeFormat` or a library), or remove the misleading parameter.

---

### LOW

---

#### L-1: Inline Card Components Re-declared Per Page

**File:** `src/app/(app)/patients/[id]/page.tsx`, lines 33-44

**Severity:** Low

```typescript
const Card = ({ children, className = "" }: { ... }) => (
    <div className={`bg-white dark:bg-slate-900 ...`}>{children}</div>
);
const CardHeader = ({ children, className = "" }: { ... }) => ( ... );
const CardTitle = ({ children, className = "" }: { ... }) => ( ... );
const CardContent = ({ children, className = "" }: { ... }) => ( ... );
```

**Why it hurts readability:** These identical Card components are likely duplicated across multiple page files. Changes to the card design require updating each copy.

**Suggested improvement:** Move to `src/components/ui/card.tsx` (a standard shadcn/ui pattern).

---

#### L-2: Mock/Hardcoded Data in Production Components

**File:** `src/components/billing/ClaimsManagerTable.tsx`, lines 40-46

**Severity:** Low

```typescript
const mockClaims: Claim[] = [
    { id: "CLM-00124", patientName: "Sarah Connor", ... },
    { id: "CLM-00125", patientName: "Michael Reese", ... },
];
```

**Why it hurts readability:** Hardcoded mock data in a component that presumably should fetch real data creates confusion about whether this component is connected to the API or is purely a UI demo.

**Suggested improvement:** Accept claims as a prop, fetch from API in the parent page, or clearly mark as a demo/storybook component.

---

#### L-3: `decrypt` Function in SFTP Adapter Is Base64 Decode Only

**File:** `src/lib/managed-billing/office-ally-sftp.ts`, lines 130-135

**Severity:** Low

```typescript
function decrypt(encryptedValue: string): string {
    if (!encryptedValue) return '';
    console.log('[Security] Decrypting clearinghouse credential...');
    return Buffer.from(encryptedValue, 'base64').toString('ascii');
}
```

**Why it hurts readability:** Named `decrypt` but performs only base64 decoding (which is encoding, not encryption). The `console.log` in a security function could leak timing information. The comment says "Mock decryption logic for POC" but the file is in the production source tree.

**Suggested improvement:** Use the actual `decryptPHI` function from `src/lib/security/encryption.ts`, or clearly document this as a placeholder with a `// TODO` and ensure it throws in production.

---

#### L-4: Unused `Lock` Import in ClaimsManagerTable

**File:** `src/components/billing/ClaimsManagerTable.tsx`, line 37

**Severity:** Low

```typescript
Closed: { color: "bg-slate-500 text-white border-transparent", icon: Lock },
```

The `Lock` icon is referenced in `statusConfig` but is never imported from `lucide-react` in the import block (lines 4-17). This would cause a runtime error if a claim with status `'Closed'` is rendered.

---

#### L-5: `searchPatients` Fetches All Patients Then Filters Client-Side

**File:** `src/lib/data/patients.ts`, lines 200-210

**Severity:** Low

```typescript
// Fetch all patients for the org (filtered by status), then search client-side
// This is more reliable than complex .or() filters which can fail on missing columns
const { data: allPatients, error } = await dbQuery
    .order('created_at', { ascending: false });
```

**Why it hurts readability:** The comment acknowledges this is a workaround. For small practices this is fine, but for organizations with thousands of patients, this will degrade performance. The comment should include a capacity threshold where this approach breaks down.

**Suggested improvement:** Add a comment noting the expected scale limit (e.g., "Suitable for < 5,000 patients per organization"). Consider a `textSearch` column with Postgres full-text search for larger deployments.

---

#### L-6: `isValidICD10` Regex Is Incorrect

**File:** `src/lib/managed-billing/claim-validator.ts`, lines 341-346

**Severity:** Low

```typescript
function isValidICD10(code: string): boolean {
    const icd10Pattern = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/i;
    return icd10Pattern.test(code.replace(/\./g, '').length >= 3 ? code : '');
}
```

**Why it hurts readability:** The ternary inside the `.test()` call is confusing. If the code without dots is less than 3 characters, it tests against an empty string (always false). But the regex already requires at least 3 characters (letter + 2 digits). The `.replace(/\./g, '').length >= 3` check is redundant and obscures the intent.

**Suggested improvement:** Simplify to `return icd10Pattern.test(code)` since the regex already enforces minimum length.

---

#### L-7: SE Segment Count Comment Uncertainty in EDI Generator

**File:** `src/lib/managed-billing/edi-generator.ts`, line 134

**Severity:** Low

```typescript
segments.push(`SE*${segments.length - 2}*0001~`);
// Count includes ST but not SE/GE/IEA technically? (Actually ST to SE)
```

**Why it hurts readability:** The uncertain comment suggests the developer was unsure about the correct SE segment count formula. EDI 837P requires the SE01 count to include all segments from ST through SE inclusive. The comment's hedging reduces confidence in correctness.

**Suggested improvement:** Replace with a definitive comment: `// SE01 = count of segments from ST to SE inclusive` and verify the arithmetic.

---

## Cross-Cutting Concerns

### 1. Domain Clarity: Clinical Concepts Not Typed

The codebase handles psychiatric concepts (PHQ-9 scores, GAD-7 scores, DSM-5 criteria, risk assessments) primarily as unstructured strings or `any`-typed objects. There are no TypeScript types for:
- Screening tool results (PHQ-9, GAD-7, Columbia Suicide Severity Rating Scale)
- Risk level classifications for suicidality/homicidality
- DSM-5 diagnostic criteria
- Medication interaction severity levels

**Impact:** In a psychiatric EHR, these are core domain concepts. Typed models would catch misuse at compile time and make the code self-documenting for clinical developers.

### 2. File Organization: `src/lib/billing.ts` vs `src/lib/billing/`

Both a standalone file (`src/lib/billing.ts`) and a directory (`src/lib/billing/`) exist for billing logic. The standalone file contains simple rate lookups while the directory contains the code analyzer and library. This split is confusing -- a developer searching for "billing" logic must check both locations.

### 3. Test Coverage Visibility

Test files exist in `src/__tests__/`, `src/lib/security/__tests__/`, and `src/lib/validation/`. However, the managed-billing module (the largest and most complex module) has zero test files. For HIPAA-regulated billing code that generates EDI transactions, this is a significant gap from a maintainability perspective.

---

## Recommendations Summary

| Priority | Action | Effort |
|---|---|---|
| 1 | Fix duplicate NM1 case in ERA parser (C-1) | Small |
| 2 | Consolidate ERA/835 parsers into one module (H-1) | Medium |
| 3 | Replace `any` types with proper interfaces in billing/clearinghouse code (H-2) | Medium |
| 4 | Standardize money representation as cents everywhere (H-3) | Medium |
| 5 | Add Zod validation to managed-billing claims POST (M-8) | Small |
| 6 | Consolidate duplicate validation modules (M-3) | Small |
| 7 | Standardize logging on safe-logger, remove raw console.* (M-4) | Medium |
| 8 | Wire up stub `createAuditLog` in data utils (M-5) | Small |
| 9 | Extract demo data from SafeAzureOpenAI (M-1) | Small |
| 10 | Define shared billing constants (place of service, default rates) (M-6, M-7) | Small |
| 11 | Fix timezone parameter in `checkAfterHoursAccess` (M-9) | Small |
| 12 | Create typed domain models for clinical concepts | Large |

---

*Report generated by Readability Advocate review process.*
