# Performance Engineering Review Report

**Project:** ChartSpark EHR (Psychiatric Electronic Health Records)
**Date:** 2026-03-18
**Branch:** pre-production-audit
**Reviewer:** Performance Engineer (Automated Review)

---

## Executive Summary

This review identified **23 performance findings** across the ChartSpark EHR codebase. The most critical issues involve a client-side patient search that fetches all records from the database, missing pagination on multiple API endpoints, sequential database queries that should run in parallel, and an unbounded in-memory rate limit store. These issues will degrade progressively as data volume and user counts grow and must be addressed before production launch.

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 3 | Full table scan in search, missing billing pagination, sequential dashboard queries |
| High | 7 | Missing pagination, N+1 patterns, unbounded memory stores, redundant Supabase client creation |
| Medium | 8 | Missing caching, duplicate audit logging, no connection pooling awareness, no streaming for AI chat API |
| Low | 5 | Minor inefficiencies, hardcoded demo data, unused streaming methods |

---

## Critical Findings

### PERF-C1: Patient Search Fetches ALL Records Then Filters Client-Side

- **Severity:** Critical
- **File:** `src/lib/data/patients.ts`, lines 200-243
- **Description:** The `searchPatients()` function fetches every patient in the organization from the database, then performs string matching in JavaScript memory. The comment on line 200 says "Fetch all patients for the org (filtered by status), then search client-side" and calls this "more reliable than complex .or() filters."
- **Performance Impact:** For an organization with 10,000+ patients, this transfers the entire patient table over the network on every keystroke search. At scale, this will cause 500ms-5s response times and excessive database load. It also defeats pagination entirely since all records are fetched first.
- **Recommended Fix:** Use Supabase's `ilike` or `textSearch` operators to perform filtering server-side:
  ```typescript
  const { data, count } = await supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .range(from, to);
  ```
  Alternatively, add a PostgreSQL `tsvector` column with a GIN index for full-text search, which is the correct approach for a healthcare system that will need to search by MRN, name, DOB, etc.

### PERF-C2: Billing GET Endpoint Returns ALL Records Without Pagination

- **Severity:** Critical
- **File:** `src/app/api/billing/route.ts`, lines 10-23
- **Description:** The billing `handleGet` function calls `supabase.from('billing').select(...)` with no `.range()` or `.limit()` clause. It fetches every billing record for the organization in a single request, joining patients and providers on each row.
- **Performance Impact:** As billing records accumulate (hundreds to thousands per month per provider), this endpoint will return ever-growing payloads. At 10,000 billing records with joins, response times will exceed 2-5 seconds and payloads could reach 5-10MB. This is particularly damaging because billing records are never deleted and grow monotonically.
- **Recommended Fix:** Add pagination consistent with other endpoints:
  ```typescript
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
  const offset = (page - 1) * limit;
  // Add .range(offset, offset + limit - 1) and count: 'exact'
  ```

### PERF-C3: Dashboard Stats Endpoint Executes Three Sequential Queries

- **Severity:** Critical
- **File:** `src/app/api/dashboard/stats/route.ts`, lines 23-44
- **Description:** The dashboard stats handler runs three independent count queries (`patients`, `notes`, `encounters`) sequentially using `await` one after another. Each query creates a new round trip to Supabase.
- **Performance Impact:** Dashboard loads incur 3x the latency they need. If each query takes 50-150ms, the total is 150-450ms just for counts. This is the first page users see on every session, so the impact is highly visible.
- **Recommended Fix:** Use `Promise.all()` to execute all three queries concurrently:
  ```typescript
  const [patientsResult, notesResult, encountersResult] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('notes').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).gte('created_at', todayStart.toISOString()),
    supabase.from('encounters').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).in('status', ['scheduled', 'in_progress']),
  ]);
  ```

---

## High Findings

### PERF-H1: Appointments GET Returns All Records Without Pagination

- **Severity:** High
- **File:** `src/app/api/appointments/route.ts`, lines 37-54
- **Description:** The appointments endpoint fetches all appointments for an organization with no limit or pagination. Joins patient and provider data on every row.
- **Performance Impact:** A busy practice scheduling 50+ appointments per day will accumulate thousands of records. Without date-range defaults, this will grow unbounded.
- **Recommended Fix:** Add default date-range filtering (e.g., current week) and pagination. At minimum, add `.limit(100)` as a safety net.

### PERF-H2: Notes GET Issues Two Sequential Queries (Count + Data)

- **Severity:** High
- **File:** `src/app/api/notes/route.ts`, lines 30-51
- **Description:** The notes listing first runs a `head: true` count query, then runs a separate data query. These are independent and should run concurrently.
- **Performance Impact:** Adds 50-150ms of unnecessary latency to every notes listing request.
- **Recommended Fix:** Use Supabase's `{ count: 'exact' }` option on the data query itself (without `head: true`), which returns both data and count in a single round trip. Alternatively, use `Promise.all()` for the two queries.

### PERF-H3: getPatients Issues Two Sequential Queries (Count + Data)

- **Severity:** High
- **File:** `src/lib/data/patients.ts`, lines 58-85
- **Description:** Same pattern as PERF-H2. The `getPatients` function runs a count query then a data query sequentially.
- **Performance Impact:** 50-150ms unnecessary latency on every patient listing.
- **Recommended Fix:** Combine into a single query with `{ count: 'exact' }` or parallelize with `Promise.all()`.

### PERF-H4: In-Memory Rate Limit Store Grows Unbounded Under Attack

- **Severity:** High
- **File:** `src/lib/security/rate-limit.ts`, lines 40, 125-163
- **Description:** The `inMemoryStore` Map grows without any size limit. The cleanup interval on line 342 runs every 5 minutes, but between cleanups, an attacker using rotating IPs or unique path prefixes can create millions of entries. Each unique `${ip}:${pathname}` combination creates a new entry.
- **Performance Impact:** Under a distributed attack or aggressive scanning, memory consumption could grow to hundreds of MB or cause an OOM crash. The key includes the full pathname, so requests to unique paths (e.g., with random query parameters) would each create a new entry.
- **Recommended Fix:** Add a maximum size limit to the Map (e.g., 10,000 entries). When the limit is reached, either reject new entries or evict the oldest ones. Also consider using a more memory-efficient data structure like a fixed-size LRU cache.

### PERF-H5: withAuth Creates Multiple Supabase Clients Per Request

- **Severity:** High
- **File:** `src/lib/auth/api-auth.ts`, lines 35-72, 123-139, 150-174
- **Description:** The `withAuth` middleware calls `createClient()` to authenticate the user (line 35), then potentially calls it again for MFA checks (line 123), and again for feature checks (line 150). Each invocation creates a new Supabase client with a new HTTP connection.
- **Performance Impact:** For routes requiring MFA and feature checks, three Supabase clients are instantiated per request, each establishing its own connection. This is roughly 30-100ms of overhead per additional client.
- **Recommended Fix:** Create the Supabase client once at the top of `withAuth` and pass it through to all subsequent checks.

### PERF-H6: System Health Endpoint Creates Multiple Supabase Clients

- **Severity:** High
- **File:** `src/app/api/admin/system-health/route.ts`, lines 38, 157, 191
- **Description:** The system health check creates a Supabase client three separate times (lines 38, 157, 191) within the same request handler.
- **Performance Impact:** Triple the connection overhead. Since this is a health check endpoint, it should be lightweight, but it is doing the opposite.
- **Recommended Fix:** Create one Supabase client at the top and reuse it.

### PERF-H7: generateAllMonthlyInvoices Runs Sequential DB Queries Per Organization

- **Severity:** High
- **File:** `src/lib/managed-billing/invoice-service.ts`, lines 198-218
- **Description:** The monthly invoice generation iterates over all subscriptions sequentially, running a database query to find the collection period for each organization one by one (`for...of` loop with `await` on each iteration).
- **Performance Impact:** With 100 managed billing clients, this loop makes 100 sequential database round trips just to find periods, then 100 more to generate invoices. Total time scales linearly with client count.
- **Recommended Fix:** Batch-fetch all collection periods in a single query, then process invoices with controlled concurrency (similar to the pattern used in `batchGenerateClaims` in `claim-generator.ts`).

---

## Medium Findings

### PERF-M1: Chart Summary Endpoint Runs Sequential Database Queries

- **Severity:** Medium
- **File:** `src/app/api/ai/smart-triage/chart-summary/route.ts`, lines 69-158
- **Description:** The chart summary endpoint runs four sequential database queries: patient demographics (line 70), notes (line 88), vitals (line 104), and screening scores (line 134). These are independent and should run concurrently.
- **Performance Impact:** Each query adds 30-100ms. Running them in parallel would reduce the total from ~200-400ms to ~100ms.
- **Recommended Fix:** Wrap in `Promise.all()`:
  ```typescript
  const [patientResult, notesResult, vitalsResult, scoresResult] = await Promise.all([...]);
  ```

### PERF-M2: AI Chat Endpoint Does Not Use Streaming

- **Severity:** Medium
- **File:** `src/app/api/ai/chat/route.ts`, lines 52-53
- **Description:** The chat endpoint calls `safeAzureOpenAI.chat()` which waits for the full response before returning. The `SafeAzureOpenAIService` class has a `chatStream()` method (line 278 of `safeAzureOpenAI.ts`) that supports token-by-token streaming, but it is unused.
- **Performance Impact:** Users must wait 2-10 seconds for the full AI response before seeing any output. Streaming would show the first token within 200-500ms, dramatically improving perceived performance.
- **Recommended Fix:** Convert the chat API to use Server-Sent Events (SSE) with `chatStream()`, returning a `ReadableStream` response.

### PERF-M3: Duplicate Audit Logging in Data Layer and API Layer

- **Severity:** Medium
- **File:** `src/lib/data/patients.ts` lines 91-97 (data layer) and `src/app/api/patients/route.ts` lines 47-62 (API layer)
- **Description:** Patient operations are audit-logged in both the data layer (`createAuditLog` in `patients.ts`) and the API route (`logAuditEventAsync` in the route handler). The data layer version is currently a no-op stub (see `utils.ts` line 268-277), but if it is ever implemented, every patient operation would generate two audit log entries.
- **Performance Impact:** If the stub is implemented, every patient operation doubles its audit write overhead. Even now, the stub function still calls `safeLogger.info` in development.
- **Recommended Fix:** Centralize audit logging in one layer only (preferably the API layer which has access to IP, user agent, and full context). Remove the audit log calls from the data layer or implement them there and remove from the API layer.

### PERF-M4: No Caching for Dashboard Stats

- **Severity:** Medium
- **File:** `src/app/api/dashboard/stats/route.ts`
- **Description:** Dashboard stats (active patients, today's notes, pending encounters) are queried fresh on every request. These counts change infrequently (minutes, not seconds) but the dashboard is the most visited page.
- **Performance Impact:** Every dashboard load hits the database for three count queries. Under 50 concurrent users refreshing dashboards, this generates 150 count queries per refresh cycle.
- **Recommended Fix:** Add a short-lived cache (30-60 seconds) using HTTP `Cache-Control` headers or a server-side cache. For Next.js, use `revalidate` with ISR, or cache the response in-memory with a TTL.

### PERF-M5: EHR Audit Log Uses LIKE Filter Instead of Index-Friendly Equality

- **Severity:** Medium
- **File:** `src/app/api/ehr/audit-log/route.ts`, line 38
- **Description:** The query uses `.like('action', 'EHR_%')` which performs a pattern match. While PostgreSQL can use indexes for prefix LIKE patterns, this is less efficient than using an indexed column with equality comparison or using the existing `event_type` index.
- **Performance Impact:** As the audit_logs table grows (potentially millions of rows in a HIPAA system), LIKE queries will become progressively slower. The audit_logs table has an index on `event_type` but this query uses `action` with LIKE.
- **Recommended Fix:** Either use a dedicated `source_system` column that can be filtered with equality, or ensure the LIKE column has a text_pattern_ops index. Better yet, use `.in()` with a list of known EHR event types.

### PERF-M6: Patient Detail Page Makes Three Separate API Calls

- **Severity:** Medium
- **File:** `src/app/(app)/patients/[id]/page.tsx`, lines 102-171
- **Description:** The patient detail page makes three separate fetch calls: one for patient details (line 106), one for encounters (line 132), and one for notes (line 156). While encounters and notes are tab-gated (only load when the tab is opened), the initial patient load could include related data to avoid the second round trip when tabs are opened.
- **Performance Impact:** Each API call incurs full HTTP overhead including auth verification. Users clicking between tabs experience loading spinners for each.
- **Recommended Fix:** Include commonly needed related data in the initial patient fetch response (the `getPatientById` with `includeDetails: true` already fetches allergies/medications/problems, so encounters and notes could be added as well, or prefetched in parallel on the client).

### PERF-M7: Upstash Rate Limiter Creates New Redis Client Per Request

- **Severity:** Medium
- **File:** `src/lib/security/rate-limit.ts`, lines 168-196
- **Description:** The `checkUpstashRateLimit` function dynamically imports and instantiates a new `Redis` client and a new `Ratelimit` instance on every single API request. The dynamic import also adds overhead.
- **Performance Impact:** Creating a new Redis client per request adds 5-20ms of overhead and prevents connection reuse. The dynamic `import()` may add additional module resolution overhead.
- **Recommended Fix:** Move the Redis client and Ratelimit instances to module-level singletons, initialized once:
  ```typescript
  let redis: Redis | null = null;
  function getRedisClient() {
    if (!redis) redis = new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! });
    return redis;
  }
  ```

### PERF-M8: `force-dynamic` on App Layout Disables All Static Optimization

- **Severity:** Medium
- **File:** `src/app/(app)/layout.tsx`, line 8
- **Description:** `export const dynamic = 'force-dynamic'` on the app layout forces every page under the `(app)` route group to be server-rendered on every request. This disables Next.js static page generation and ISR for all 30+ app pages.
- **Performance Impact:** Pages that could benefit from static generation or ISR (like the references pages, templates list, etc.) are dynamically rendered every time, adding 100-500ms of server rendering time per request.
- **Recommended Fix:** Move `force-dynamic` to individual page files that actually require it (those with auth-gated server components), rather than blanket-applying it at the layout level. Many pages already fetch data client-side, so the layout doesn't need to be dynamic.

---

## Low Findings

### PERF-L1: SafeAzureOpenAI Singleton Created at Module Load

- **Severity:** Low
- **File:** `src/services/safeAzureOpenAI.ts`, line 581
- **Description:** The Azure OpenAI client is created as a singleton at module load time. If the environment variables are not set, the constructor still runs and logs a message. This is fine for most cases, but the singleton pattern means the client configuration cannot be updated at runtime.
- **Performance Impact:** Minimal. The singleton pattern is actually good for performance (avoids repeated client creation). This is noted only because it prevents runtime reconfiguration.
- **Recommended Fix:** No action needed unless dynamic configuration is required.

### PERF-L2: `useFeatures` Hook Joins Array for Dependency Key

- **Severity:** Low
- **File:** `src/hooks/useFeature.ts`, line 178
- **Description:** The `useFeatures` hook uses `featureCodes.join(',')` as a useEffect dependency. If the array reference changes but contents are the same, this correctly avoids re-running. However, if callers create new arrays on each render, this will still work correctly. The concern is minor.
- **Performance Impact:** Minimal. The join operation is trivial.
- **Recommended Fix:** Consider `useMemo` on the feature codes array at the call site, or use `JSON.stringify` for a more robust comparison.

### PERF-L3: Hardcoded Demo Data in SafeAzureOpenAI

- **Severity:** Low
- **File:** `src/services/safeAzureOpenAI.ts`, lines 438-577
- **Description:** Large demo response objects are embedded inline in the service file, adding ~5KB to the bundle even when Azure OpenAI is configured and demo mode is never used.
- **Performance Impact:** Minor bundle size increase (~5KB uncompressed). Negligible in practice since this is a server-side file.
- **Recommended Fix:** Move demo data to a separate file that is conditionally imported.

### PERF-L4: Billing Code Library May Be Large

- **Severity:** Low
- **File:** `src/lib/billing/code-library.ts`
- **Description:** The CPT code library and billing reference data is imported synchronously. If this file contains thousands of code definitions, it will be loaded into memory for every request that imports it.
- **Performance Impact:** Depends on file size. If it contains standard CPT/ICD-10 code sets (80,000+ ICD-10 codes), this could consume significant memory.
- **Recommended Fix:** Verify file size. If large, use dynamic import or database lookup instead of in-memory data.

### PERF-L5: `recordClaimPayment` and `recordClaimSubmission` Fetch Then Update

- **Severity:** Low
- **File:** `src/lib/managed-billing/collection-service.ts`, lines 158-238
- **Description:** Both functions first SELECT a record, then UPDATE it. The select-then-update pattern means two round trips when a single SQL `UPDATE ... SET total = total + $1` would suffice.
- **Performance Impact:** Two DB round trips instead of one per claim payment recording.
- **Recommended Fix:** Use a Supabase RPC call or raw SQL to atomically increment the counter in a single operation. This also avoids race conditions when multiple payments are recorded simultaneously.

---

## Missing Database Indexes

The codebase has a dedicated migration for indexes (`supabase/migrations/20260203_performance_indexes.sql`), which is good. However, the following query patterns lack supporting indexes:

| Query Pattern | File | Missing Index |
|---|---|---|
| `audit_logs.action LIKE 'EHR_%'` | `src/app/api/ehr/audit-log/route.ts:38` | `CREATE INDEX idx_audit_logs_action_pattern ON audit_logs(action text_pattern_ops)` |
| `smart_triage_results` by patient_id + triage_type + expires_at | `chart-summary/route.ts:39-47` | Composite index on `(patient_id, triage_type, expires_at)` |
| `appointments` by organization_id + datetime | `appointments/route.ts:44-46` | `CREATE INDEX idx_appointments_org_datetime ON appointments(organization_id, appointment_datetime)` |
| `billing.idempotency_key` | `billing/route.ts:43` | Already handled by unique constraint, but verify index exists |
| `login_attempts` (referenced in lockout) | Various auth files | Verify index on `(email, attempted_at)` |
| `patients` by `organization_id, status` | `patients.ts:62-64` | Composite index on `(organization_id, status)` -- exists for encounters and billing_claims but NOT for patients |

---

## Scalability Concerns

### Audit Log Table Growth

The audit_logs table will grow rapidly in a HIPAA-compliant system (every PHI access is logged). At current logging density (2-3 audit entries per API call), a 50-provider practice generating 200 notes/day will produce ~1,000 audit entries daily, or ~365,000 per year. The `queryAuditLogs` function on line 318 of `audit-log.ts` has no maximum result limit besides the caller's `limit` parameter (defaulting to 100). Consider:
- Partitioning the audit_logs table by month
- Adding a retention/archival policy
- Ensuring all audit queries use indexed columns

### In-Memory State Not Shared Across Serverless Instances

The codebase uses several in-memory stores:
- Rate limit store (`rate-limit.ts`, line 40)
- Circuit breaker state (`rate-limit.ts`, line 49)
- Request deduplication store (`request-dedup.ts`, line 14)
- Active mutations set (`request-dedup.ts`, line 128)

In a serverless/edge deployment (Vercel), each function invocation may run in a different instance. These in-memory stores will not be shared, meaning:
- Rate limiting is per-instance, not global (acknowledged in the code)
- Request dedup will not work across instances
- Circuit breaker state is per-instance

This is acceptable for development but inadequate for production at scale. The Upstash Redis integration for rate limiting partially addresses this, but the circuit breaker and dedup stores remain in-memory only.

---

## Positive Observations

1. **Pagination is implemented on core endpoints** -- patients and notes routes have proper pagination with page/limit parameters.
2. **Parallel data loading in `getPatientById`** -- related data (allergies, medications, problems, insurance) is loaded with `Promise.all()`.
3. **Batch claim generation with concurrency control** -- `batchGenerateClaims` in claim-generator.ts processes claims in batches of 5 with `Promise.all`.
4. **Performance indexes migration exists** -- comprehensive index definitions in `20260203_performance_indexes.sql`.
5. **Image optimization configured** -- next.config.ts has proper image formats, device sizes, and cache TTL.
6. **Package import optimization** -- `optimizePackageImports` for lucide-react and recharts in next.config.ts.
7. **Async audit logging** -- `logAuditEventAsync` fires and forgets for non-critical events, avoiding blocking API responses.
8. **Request deduplication utility** -- `request-dedup.ts` prevents duplicate concurrent requests.
9. **Streaming AI support implemented** -- `chatStream()` and `generateSOAPNoteStream()` methods exist, ready for use.
10. **Sentry configured with tree-shaking** -- `disableLogger: true` and `deleteSourcemapsAfterUpload: true` minimize production overhead.

---

## Priority Remediation Order

| Priority | Finding | Estimated Effort | Impact |
|----------|---------|-----------------|--------|
| 1 | PERF-C1: Client-side patient search | 2-4 hours | Eliminates full table scans |
| 2 | PERF-C2: Billing pagination | 1 hour | Prevents unbounded response growth |
| 3 | PERF-C3: Dashboard parallel queries | 30 min | Reduces dashboard load by 60-70% |
| 4 | PERF-H2/H3: Parallel count+data queries | 1 hour | Reduces latency on all list endpoints |
| 5 | PERF-H5/H6: Reuse Supabase clients | 2 hours | Eliminates redundant connections |
| 6 | PERF-H1: Appointments pagination | 1 hour | Prevents unbounded growth |
| 7 | PERF-H4: Rate limit store bounds | 1 hour | Prevents memory exhaustion under attack |
| 8 | PERF-M7: Singleton rate limit Redis | 1 hour | Reduces per-request overhead |
| 9 | PERF-M2: AI chat streaming | 2-3 hours | Major UX improvement |
| 10 | PERF-M4: Dashboard stats caching | 1 hour | Reduces DB load from most-visited page |

**Total estimated remediation time: 12-17 hours**

---

*Report generated by Performance Engineering review of the ChartSpark EHR codebase.*
