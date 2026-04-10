# Performance Engineer Final Report
## ChartSpark Psychiatric EHR - Pre-Production Audit
**Date:** 2026-03-19
**Branch:** pre-production-audit
**Auditor Role:** Performance Engineer

---

## Executive Summary

ChartSpark demonstrates a **generally well-architected** application with several smart performance decisions already in place (Sprint 3 performance indexes, pagination, optimistic updates, lazy-loaded telehealth component, Upstash rate limiting). However, there are **critical and high-severity performance issues** that will cause degraded performance under production load, particularly around **redundant auth overhead on every API request (up to 4 DB round-trips + MFA check)**, **RLS function call overhead**, **over-fetching with `SELECT *`**, and **missing client-side optimizations**. These must be addressed before production deployment.

**Overall Performance Grade: C+**
- Database: B- (good indexes, but RLS overhead and `SELECT *` issues)
- Frontend: C (50 `use client` components, minimal memoization, no dynamic imports for heavy pages)
- API: C- (severe auth overhead per request, redundant Supabase client creation)
- Auth: D+ (up to 4 Supabase round-trips per middleware + API handler path)

---

## CRITICAL Performance Issues

### PERF-CRIT-01: Cascading Auth Round-Trips Per API Request (4+ DB calls)
**Severity:** CRITICAL
**Impact:** Every authenticated API request triggers up to **4 sequential database round-trips** before any business logic executes.

**Flow for a single protected API call:**
1. **Middleware** (`src/lib/supabase/middleware.ts`, line 106): `supabase.auth.getUser()` -- 1 round-trip
2. **Middleware** (line 133): `supabase.from('users').select('role, is_active')` -- 1 round-trip
3. **Middleware** (line 204): `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` -- 1 round-trip (for privileged roles)
4. **API Handler withAuth** (`src/lib/auth/api-auth.ts`, line 43): `supabase.auth.getUser()` -- **DUPLICATE** round-trip
5. **API Handler withAuth** (line 49): `supabase.from('users').select(...)` -- **DUPLICATE** round-trip
6. **API Handler withAuth** (line 148): `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` -- **DUPLICATE** round-trip

**The middleware already validates auth, role, and MFA -- but the API handler re-validates everything from scratch.** This means every API request to a protected route with MFA pays **6 database round-trips** in auth overhead alone before any business query executes.

At 50ms per round-trip, that is **300ms of pure auth overhead** on every API call.

**Files:**
- `src/lib/supabase/middleware.ts` lines 104-219
- `src/lib/auth/api-auth.ts` lines 34-91, 141-159

**Recommendation:** Pass auth context from middleware to API handlers via request headers (e.g., `x-user-id`, `x-user-role`, `x-user-org`) signed with an HMAC. The API `withAuth` wrapper should trust middleware-validated headers for the same request, eliminating 3 redundant DB calls. Alternatively, use a short-lived in-memory cache (per-request) to avoid re-querying within the same request lifecycle.

### PERF-CRIT-02: Redundant Supabase Client Creation in withAuth
**Severity:** CRITICAL
**Impact:** `createClient()` is called **up to 4 separate times** within a single `withAuth` execution.

**File:** `src/lib/auth/api-auth.ts`
- Line 38: `createClient()` for getUser + user lookup
- Line 143: `createClient()` for MFA check
- Line 170: `createClient()` for feature check

Each `createClient()` in the server context calls `await cookies()` and constructs a new Supabase SSR client instance. While Supabase JS clients are lightweight, the repeated cookie parsing and object construction is wasteful.

**Recommendation:** Create the Supabase client once at the top of `withAuth` and pass it through all sub-checks.

### PERF-CRIT-03: RLS `get_user_role()` and `get_user_organization_id()` Called Per Row
**Severity:** CRITICAL
**Impact:** These `SECURITY DEFINER` functions execute a `SELECT role FROM users WHERE id = auth.uid()` query **for every row evaluated** by an RLS policy. On a patients list query returning 50 rows with a 1000-row table, this could mean **1000+ executions** of these functions.

**File:** `supabase/migrations/stage1_database_foundation.sql` lines 53-73
**Referenced in policies:** Lines 127-132, 155-167, 200-219, 231-250, 259-271, 287-301

PostgreSQL does cache `STABLE` function results within a single statement, but the caching is per-transaction and can be invalidated. With multiple policies on the same table (e.g., users table has 4 SELECT policies), the function may be called multiple times per query.

**Recommendation:**
1. Add `SECURITY DEFINER SET search_path = public` (already done, good).
2. Consider replacing function calls in RLS with a `current_setting()` approach where the role/org are set once per transaction via `SET LOCAL`.
3. At minimum, verify with `EXPLAIN ANALYZE` that these functions are being cached properly.

---

## HIGH Performance Issues

### PERF-HIGH-01: Widespread `SELECT *` Over-Fetching
**Severity:** HIGH
**Impact:** 30+ queries across the codebase use `.select('*')` instead of selecting only needed columns. This transfers unnecessary data over the wire, increases memory usage, and bypasses query optimization.

**Worst offenders:**
- `src/lib/data/patients.ts` lines 60, 76, 127: Patient list and detail queries fetch all columns
- `src/lib/data/encounters.ts` lines 111, 126-129, 167-168, 186-192: Encounter queries with `*` plus joins
- `src/lib/data/templates.ts` lines 28, 56, 86, 114, 155, 171: All template queries use `*`
- `src/lib/managed-billing/` (multiple files): 10+ instances of `SELECT *`
- `src/lib/security/audit-log.ts` line 357: Audit log queries
- `src/app/api/billing/route.ts` line 29: Count query uses `SELECT *` with `head: true`

**Recommendation:** Replace all `.select('*')` with explicit column lists. For the count query at `src/app/api/billing/route.ts:29`, `.select('id', { count: 'exact', head: true })` would be more efficient.

### PERF-HIGH-02: Synchronous Audit Logging in Data Layer Blocks Responses
**Severity:** HIGH
**Impact:** The data layer functions (patients, encounters, notes) call `await createAuditLog()` **before returning the response**. This adds an extra DB write to every read and write operation.

**Files:**
- `src/lib/data/patients.ts` lines 91-97, 140-147, 242-249, 400-408, 461-470, 507-515
- `src/lib/data/encounters.ts` lines 138-144, 204-210, 300-309, 351-360, 400-408, 448-456
- `src/lib/data/notes.ts` lines 40-46, 78-84

84 total occurrences of audit logging calls across the codebase.

**Good:** The API layer uses `logAuditEventAsync()` (fire-and-forget). **Bad:** The data layer uses `await createAuditLog()` which blocks the response.

**Recommendation:** Convert all data layer audit logging to async/fire-and-forget, or batch audit events and flush them in the background. The `logAuditEventAsync` pattern used in the API layer is correct -- apply it consistently.

### PERF-HIGH-03: `last_activity_at` Update on Every API Request
**Severity:** HIGH
**Impact:** Every authenticated API call triggers a fire-and-forget UPDATE to the users table.

**File:** `src/lib/auth/api-auth.ts` lines 75-80
```typescript
supabase
    .from('users')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', user.id)
    .then(() => {})
    .catch(() => {});
```

This means every API request triggers a write to the `users` table, causing write amplification. For a busy clinic with 10 concurrent users each making 1 request/second, that is 600 writes/minute to the users table -- generating WAL writes, triggering index updates, and potentially creating lock contention.

**Recommendation:** Throttle activity updates to at most once per 60 seconds per user. Use a server-side in-memory map to track when the last update was written.

### PERF-HIGH-04: Missing Indexes for Search Queries (ilike without trigram index)
**Severity:** HIGH
**Impact:** Patient search uses `ilike` patterns (`%query%`) across 4 columns (first_name, last_name, email, phone). Without a trigram (`pg_trgm`) index, these are sequential scans.

**File:** `src/lib/data/patients.ts` lines 202-209
```
.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
```

The performance index migration (`20260203120000_performance_indexes.sql`) creates a B-tree index on `(organization_id, last_name)` but this does NOT support `%query%` patterns -- only prefix matches.

**Recommendation:** Create GIN trigram indexes:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_patients_name_trgm ON patients USING GIN (first_name gin_trgm_ops, last_name gin_trgm_ops);
```

### PERF-HIGH-05: Encounter Detail Query Over-Fetches with `patients(*)` and `users(*)`
**Severity:** HIGH
**Impact:** When fetching encounter details, the query joins `patients(*)` and `users(*)`, pulling **all columns** from both tables including potentially large JSONB fields, addresses, notes, etc.

**File:** `src/lib/data/encounters.ts` lines 123-130, 186-192
```
.select(`*, patient:patients(*), provider:users(*), notes(*)`)
```

This fetches the entire patient record, entire user record, and all notes for every encounter in the list. For a page of 50 encounters, this could pull megabytes of unnecessary data.

**Recommendation:** Select only needed fields:
```
.select(`*, patient:patients(id, first_name, last_name, mrn, avatar_color), provider:users(id, email, full_name)`)
```
(The `getEncounters` function at line 51-58 already does this correctly -- apply the same pattern.)

---

## MEDIUM Performance Issues

### PERF-MED-01: Separate Count + Data Queries (Two Round-Trips for Pagination)
**Severity:** MEDIUM
**Impact:** Patient list, billing, and other paginated endpoints execute two separate queries: one for count, one for data.

**Files:**
- `src/lib/data/patients.ts` lines 58-67 (count) + 74-85 (data)
- `src/app/api/billing/route.ts` lines 27-31 (count) + 35-41 (data)

Supabase supports `{ count: 'exact' }` in the data query itself (as done correctly in `encounters.ts` line 59). This would eliminate one round-trip per paginated request.

**Recommendation:** Combine count and data queries using `{ count: 'exact' }` on the data query, as already implemented in `getEncounters()`.

### PERF-MED-02: Client-Side Filtering on Encounters Page
**Severity:** MEDIUM
**Impact:** The encounters page fetches up to 50 records from the server, then applies client-side search filtering, meaning the search is limited to only the current page of results.

**File:** `src/app/(app)/encounters/page.tsx` lines 132-144
```typescript
// Client-side search filter (since API doesn't support search yet)
const filteredEncounters = encounters.filter(e => { ... });
```

**Recommendation:** Implement server-side search for encounters, similar to the patient search API.

### PERF-MED-03: Rate Limiter Creates New Redis Client Per Request
**Severity:** MEDIUM
**Impact:** `checkUpstashRateLimit()` creates a new `Redis` instance and `Ratelimit` instance on every invocation.

**File:** `src/lib/security/rate-limit.ts` lines 170-196
```typescript
const { Ratelimit } = await import('@upstash/ratelimit');
const { Redis } = await import('@upstash/redis');
const redis = new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! });
const limiter = new Ratelimit({ redis, ... });
```

While Upstash REST-based Redis clients are stateless (HTTP-based), the dynamic imports and object construction add overhead. The `import()` calls are likely cached by the module system, but the instantiation is not.

**Recommendation:** Create the Redis client and Ratelimit instances once at module level (lazy-initialized) and reuse them.

### PERF-MED-04: SessionTimeout Interval Runs Every Second
**Severity:** MEDIUM
**Impact:** The `SessionTimeout` component sets an interval that fires every 1000ms, checking activity state each time.

**File:** `src/components/SessionTimeout.tsx` line 55-79

For HIPAA compliance this is reasonable, but the interval could be 5-10 seconds without meaningfully impacting UX (the warning window is 2 minutes).

### PERF-MED-05: No `React.memo` on Frequently Rendered List Items
**Severity:** MEDIUM
**Impact:** Patient rows and encounter rows in list pages are re-rendered on every state change (search, pagination) without memoization. Only 44 total `useMemo`/`useCallback`/`React.memo` occurrences across 15 files, while there are 50 `'use client'` components.

**Key components missing memoization:**
- Patient row rendering in `src/app/(app)/patients/page.tsx` (lines 267-359)
- Encounter row rendering in `src/app/(app)/encounters/page.tsx` (lines 297-364)
- Inline functions created during render (e.g., `getPatientInitials`, `formatDate`, `calculateAge` defined inside component body)

---

## LOW Performance Issues

### PERF-LOW-01: `force-dynamic` on All Authenticated Layouts
All authenticated layouts use `export const dynamic = 'force-dynamic'`, which disables all static optimization for those routes. This is expected for a HIPAA app with dynamic data, but means no ISR/SSG benefits.

**Files:** `src/app/(admin)/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/auditor/layout.tsx`

### PERF-LOW-02: No HTTP Cache Headers on API Responses
API responses don't set `Cache-Control` headers. For PHI data this is correct (should not be cached), but static reference data (CPT codes, templates, fee schedules) could benefit from short-lived caching.

### PERF-LOW-03: recharts Included in Bundle
`recharts` (approximately 200KB+ gzipped) is included in dependencies. The `optimizePackageImports` in `next.config.ts` helps with tree-shaking, but recharts should ideally be lazy-loaded only on analytics/dashboard pages.

**File:** `next.config.ts` line 111

---

## Sprint 3 Performance Fix Verification

### Migration: `20260203120000_performance_indexes.sql` -- VERIFIED
**Status: Correctly implemented with 19 indexes.**

| Index | Target | Purpose | Status |
|-------|--------|---------|--------|
| `idx_billing_claims_org_id` | billing_claims(organization_id) | Tenant isolation | OK |
| `idx_billing_claims_claim_number` | billing_claims(claim_number) | ERA matching | OK |
| `idx_billing_claims_org_status` | billing_claims(org_id, status) | Common filter | OK |
| `idx_billing_claims_encounter_id` | billing_claims(encounter_id) | Claim generation | OK |
| `idx_clinical_notes_patient_org` | notes(patient_id, org_id) | Patient notes lookup | OK |
| `idx_notes_encounter_id` | notes(encounter_id) | Encounter notes | OK |
| `idx_notes_encounter_status` | notes(encounter_id, status) | Signed notes | OK |
| `idx_era_payments_claim_id` | era_payments(claim_id) | Payment lookup | OK |
| `idx_era_payments_era_file_id` | era_payments(era_file_id) | ERA file view | OK |
| `idx_encounters_org_status` | encounters(org_id, status) | Encounter lists | OK |
| `idx_encounters_patient_id` | encounters(patient_id) | Patient history | OK |
| `idx_patients_org_id` | patients(organization_id) | Tenant isolation | OK |
| `idx_patients_org_lastname` | patients(org_id, last_name) | Name search | OK |
| `idx_profiles_email` | profiles(email) | Login lookup | OK |
| `idx_profiles_org_id` | profiles(organization_id) | Tenant isolation | OK |
| `idx_audit_logs_org_created_at` | audit_logs(org_id, created_at DESC) | Audit queries | OK |
| `idx_audit_logs_action` | audit_logs(action) | Action filter | OK |
| `idx_audit_logs_user_id` | audit_logs(user_id) | User activity | OK |
| `idx_org_subscriptions_org_id` | org_subscriptions(org_id) | Sub lookup | OK |

**Gap:** Missing trigram index for `ilike` search patterns (see PERF-HIGH-04).

### Optimistic Updates Hook -- VERIFIED
**File:** `src/hooks/useOptimisticUpdate.ts`
- Correctly implements optimistic UI with rollback on error
- Uses `useCallback` and `useRef` appropriately
- Includes `isDirty` state tracking

### Rate Limiting -- VERIFIED
**File:** `src/lib/security/rate-limit.ts`
- Proper tiered limits (API: 100/min, Auth: 10/min, AI: 20/min, Login: 5/15min)
- Circuit breaker pattern for Redis failures
- Fail-closed for security-critical endpoints
- In-memory fallback for development
- **Issue:** Client instantiation per request (see PERF-MED-03)

### Next.js Config Optimizations -- VERIFIED
**File:** `next.config.ts`
- Image optimization with AVIF/WebP (line 93)
- Compression enabled (line 101)
- `optimizePackageImports` for lucide-react, recharts (line 111)
- Source map cleanup after upload (line 154)
- Sentry logger tree-shaking (line 166)

### Lazy Loading -- PARTIALLY VERIFIED
- DailyVideoCall component correctly lazy-loaded: `src/app/(app)/telehealth/page.tsx` line 21
- **Missing:** Large admin pages, recharts-heavy analytics, managed billing pages are not lazy-loaded

---

## Performance Recommendations (Prioritized)

### P0 -- Must Fix Before Production
1. **Eliminate duplicate auth in middleware + API handler** (PERF-CRIT-01) -- Estimated 200-300ms savings per request
2. **Consolidate Supabase client creation in withAuth** (PERF-CRIT-02) -- Reduces object churn
3. **Throttle `last_activity_at` updates** (PERF-HIGH-03) -- Reduce writes by 95%+

### P1 -- Fix Within First Sprint
4. **Replace `SELECT *` with explicit columns** (PERF-HIGH-01) -- Reduce data transfer 40-60%
5. **Convert data layer audit logging to async** (PERF-HIGH-02) -- Reduce latency per operation
6. **Add trigram indexes for search** (PERF-HIGH-04) -- Fix sequential scan on patient search
7. **Fix encounter detail over-fetching** (PERF-HIGH-05) -- Reduce join payload size

### P2 -- Fix Within Second Sprint
8. **Combine count + data queries** (PERF-MED-01) -- Eliminate one round-trip per list page
9. **Implement server-side encounter search** (PERF-MED-02) -- Fix incomplete search results
10. **Cache Redis/Ratelimit instances** (PERF-MED-03) -- Reduce per-request overhead
11. **Add `React.memo` to list row components** (PERF-MED-05) -- Reduce re-renders

### P3 -- Optimization
12. Lazy-load recharts/analytics pages
13. Add `stale-while-revalidate` caching for reference data (CPT codes, templates)
14. Investigate RLS function caching with `EXPLAIN ANALYZE`

---

## Appendix: Key File Paths

| Area | File |
|------|------|
| Middleware auth | `src/lib/supabase/middleware.ts` |
| API auth wrapper | `src/lib/auth/api-auth.ts` |
| Rate limiting | `src/lib/security/rate-limit.ts` |
| Patient data layer | `src/lib/data/patients.ts` |
| Encounter data layer | `src/lib/data/encounters.ts` |
| Notes data layer | `src/lib/data/notes.ts` |
| Performance indexes | `supabase/migrations/20260203120000_performance_indexes.sql` |
| RLS policies | `supabase/migrations/stage1_database_foundation.sql` |
| Supabase server client | `src/lib/supabase/server.ts` |
| Supabase browser client | `src/lib/supabase/client.ts` |
| Next.js config | `next.config.ts` |
| Optimistic update hook | `src/hooks/useOptimisticUpdate.ts` |
| Session timeout | `src/components/SessionTimeout.tsx` |
| Patients page | `src/app/(app)/patients/page.tsx` |
| Encounters page | `src/app/(app)/encounters/page.tsx` |
| Billing API | `src/app/api/billing/route.ts` |
| Audit logging | `src/lib/security/audit-log.ts` |
