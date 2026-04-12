# ChartSparkOG Architecture Review — Production Scalability

**Date:** 2026-04-12
**Scope:** Connection handling, memory, CPU, resilience, horizontal scaling, cold starts
**Method:** Static analysis of all `src/` code, `next.config.ts`, `supabase/migrations/`, and dependency configuration

---

## Summary

| Area | Rating | Key Finding |
|------|--------|-------------|
| Connection handling | **READY** | Per-request Supabase (PostgREST HTTP), singleton Azure OpenAI, distributed rate limiting via Upstash Redis |
| Memory management | **READY** | All in-memory stores bounded with TTL/cleanup; max per-request payload 25 MB (audio); no unbounded growth |
| CPU bottlenecks | **READY** | scrypt KDF is async (non-blocking); billing code analyzer is O(codes * keywords) per call (~10-50 ms); no sync file I/O |
| External dependency resilience | **READY** | Circuit breakers on GPT + Whisper (separate), Upstash rate-limit breaker, Stripe webhook idempotency, graceful email degradation |
| Horizontal scaling readiness | **NEEDS WORK** | Auth is stateless (JWT cookies). In-memory rate-limit fallback and circuit breaker state are per-instance. Rate limiting is distributed when Upstash is healthy, but falls back to per-instance on outage |
| Cold start impact | **NEEDS WORK** | ~700-1100 ms total; encryption self-test dominates at ~600-1000 ms (scrypt x2). Acceptable for long-running servers, significant for serverless cold starts |

---

## 1. Connection Handling — READY

### Supabase clients (per-request, HTTP-based)

| Client | File | Pattern | Notes |
|--------|------|---------|-------|
| Server SSR | `src/lib/supabase/server.ts:18-61` | Per-request via `createSSRServerClient()` | Reads/writes cookies per request; no connection pooling needed (PostgREST HTTP) |
| Browser | `src/lib/supabase/client.ts` | Module-scope singleton per component tree | Standard `@supabase/ssr` browser pattern |
| Service role | `src/lib/supabase/service-role-client.ts:21-48` | Per-call instantiation | Disables `autoRefreshToken` and `persistSession`; suitable for privileged server ops |

All three clients connect via HTTPS to Supabase's PostgREST endpoint — **not** direct Postgres sockets. PostgREST manages its own internal pgbouncer pool. The pgbouncer pooler endpoint (port 6543) is irrelevant for this architecture: no `postgres://`, `postgresql://`, or `DATABASE_URL` references exist anywhere in `src/`.

### Azure OpenAI client (singleton, lazy-init)

`src/services/safeAzureOpenAI.ts:72-110` — Private `SafeAzureOpenAIService` class with `_ensureInitialized()` guard. Creates **one** `AzureOpenAI` instance (for GPT) and optionally **one** `whisperClient` (for Whisper, if dedicated credentials are configured). Both persist for the lifetime of the process. The OpenAI SDK v4+ uses Node's built-in HTTP agent with default keepalive — no explicit pool size tuning needed.

### Rate limiting (distributed + in-memory fallback)

`src/lib/security/rate-limit.ts` — Uses `@upstash/ratelimit` backed by Upstash Redis for distributed enforcement.

| Bucket | Limit | Window | Fail mode |
|--------|-------|--------|-----------|
| `api` | 100 | 1 min | open (allow) |
| `auth` | 10 | 1 min | **closed (deny)** |
| `ai` | 20 | 1 min | open |
| `export` | 5 | 1 min | open |
| `login` | 5 | 15 min | **closed** |
| `loginEmail` | 10 | 15 min | **closed** |
| `mfaVerify` | 5 | 15 min | **closed** |
| `passwordReset` | 3 | 1 hr | **closed** |
| `emailSend` | 5 | 1 hr | **closed** |
| `telehealth` | 50 | 1 hr | open |

If Upstash is unreachable, the rate limiter has its own circuit breaker (5 failures / 60s / 30s open). During the open window: fail-closed buckets (auth, login, MFA, password reset) return 503; all others fall back to an in-memory `Map<string, { count, resetTime }>` with a 5-minute `setInterval` cleanup (`rate-limit.ts:399-413`).

### Bottleneck analysis

No structural bottleneck identified. The limiting factor for concurrent HTTP connections is **Vercel's per-function concurrency**, not app-level resources. Each serverless invocation gets its own per-request Supabase client and shares the singleton Azure OpenAI client (which is fine — the SDK multiplexes requests over a single HTTP/2 connection).

---

## 2. Memory Management — READY

### Module-scope stores (bounded)

| Store | File | Type | Bound | Cleanup |
|-------|------|------|-------|---------|
| Rate-limit counters | `rate-limit.ts:34` | `Map<string, { count, resetTime }>` | ~unique IPs * endpoints * windows | 5-min `setInterval` sweep |
| Request dedup cache | `request-dedup.ts:16` | `Map<string, PendingRequest>` | In-flight requests only | Auto-remove on completion + 100 ms delay; 5 s TTL |
| Circuit breaker state | `circuit-breaker.ts:59-63` | 5 scalar fields per instance | Fixed (2 instances = ~128 bytes) | N/A — fixed size |

Worst-case rate-limit memory: 1000 unique IPs * 10 endpoint buckets * ~100 bytes/entry = **~1 MB**. Cleaned every 5 minutes — no growth risk.

### Per-request allocations

| Allocation | File | Max size | Lifecycle |
|-----------|------|----------|-----------|
| Audio buffer | `transcribe-and-generate/route.ts:98` | 25 MB (`MAX_AUDIO_SIZE`) | Released after `safeAzureOpenAI.transcribeAudio()` returns |
| Encryption buffers | `encryption.ts:107-108` | 16 bytes (salt) + 16 bytes (IV) + ciphertext length | Released after cipher operation |
| JSON response bodies | Various route handlers | Varies; largest is AI-generated SOAP notes (~5-10 KB) | GC'd after response sent |

No unbounded in-memory arrays, caches, or accumulators found in any module-scope code. The singleton `safeAzureOpenAI` does not cache responses.

---

## 3. CPU Bottlenecks — READY

### Encryption (scrypt KDF — async, non-blocking)

`src/lib/security/encryption.ts:110-111, 169` — Uses `scrypt` for key derivation with AES-256-GCM for encryption. `scrypt` is promisified (`util.promisify(crypto.scrypt)`) so it runs on libuv's thread pool and **does not block the Node.js event loop**.

Estimated cost per encrypt/decrypt: **~300-500 ms** on Node 22 (default scrypt parameters: N=16384, r=8, p=1). Each PHI field encrypts with a per-record salt, so two fields = two KDF runs.

Impact: latency on PHI-heavy requests, but no event-loop blocking. Acceptable for a healthcare app where crypto strength outweighs raw throughput.

### Billing code analyzer (synchronous, bounded)

`src/lib/billing/code-analyzer.ts:94-99` — Nested loop: `for (code of codes) { for (keyword of code.keywords) { fullText.includes(keyword) } }`. Operates on ~822 CPT/ICD-10 codes with ~10 keywords each = **~8,200 string comparisons** per call.

Estimated cost: **~10-50 ms** for a typical 5,000-character SOAP note. Synchronous but sub-100ms — no event-loop risk.

### PHI log sanitization (regex, per-log)

`src/lib/logging/safe-logger.ts:55-75` — Five regex patterns (SSN, phone, email, MRN, UUID) applied to each sensitive log message. Cost: **~1-5 ms per log call**. Negligible.

### No synchronous file I/O

All data persistence uses Supabase (HTTP). Audio file processing uses `Buffer.from(await audioFile.arrayBuffer())` — the `await` is async. No `fs.readFileSync` or `fs.writeFileSync` in any route handler.

---

## 4. External Dependency Resilience — READY

### Circuit breakers (added 2026-04-11)

`src/services/safeAzureOpenAI.ts:18-41` — Two independent `CircuitBreaker` instances:

| Breaker | Timeout | Retries | Failure threshold | Open duration |
|---------|---------|---------|-------------------|---------------|
| `azure-openai-gpt` | 30 s | 2 (exp backoff, 1 s base) | 5 consecutive in 60 s | 30 s |
| `azure-openai-whisper` | 60 s | 2 (exp backoff, 1 s base) | 5 consecutive in 60 s | 30 s |

**Separation** prevents Whisper outages from tripping GPT and vice versa. Retries are **inside** the breaker so a full retry sequence counts as one failure.

### Per-dependency failure behavior

| Dependency | When down | App behavior |
|-----------|-----------|--------------|
| **Supabase** | PostgREST returns error or times out | Auth endpoints fail hard (401/503). Data endpoints return `{data: null, error: {...}}` — callers handle gracefully. Demo mode returns `null` client with explicit check. |
| **Azure OpenAI (GPT)** | Circuit opens after 5 failures in 60 s | `generateSOAPNote`, `chat`, `diagnose` fall back to demo responses. `CircuitBreakerOpenError` caught by existing try/catch in each method. |
| **Azure OpenAI (Whisper)** | Circuit opens after 5 failures in 60 s | `transcribeAudio` returns demo transcript with `isDemo: true`. |
| **Upstash Redis** | Rate-limit circuit opens (5 failures / 60 s / 30 s open) | Fail-closed buckets (auth, login, MFA) return 503. Others fall back to in-memory rate limiting. |
| **Resend (email)** | API key missing or send fails | `sendInvitationEmail` returns `{ success: false, error }`. Callers log warning and continue — signup/invitation flows degrade but don't crash. |
| **Stripe** | Webhook signature validation fails | Returns 400/500 per webhook handler. Idempotency via `processed_webhook_events` table prevents duplicate processing on retries. |
| **Sentry** | DSN unreachable | No impact. `@sentry/nextjs` wraps `init()` — if DSN is invalid or unreachable, error reporting stops silently. App continues. |

### Demo mode

When `NEXT_PUBLIC_DEMO_MODE=true` and `NODE_ENV !== 'production'`, Supabase clients return `null`. Most routes check for null and return demo data. **Demo mode is force-disabled in production** (`src/lib/config/environment.ts:38-43`).

---

## 5. Horizontal Scaling Readiness — NEEDS WORK

### Stateless components (good)

| Component | State location | Scales? |
|-----------|---------------|---------|
| Authentication | Supabase JWT in HTTP-only cookie | Yes — any instance can validate |
| Session tracking | Client-side `localStorage` only | Yes — no server state |
| Database | Supabase (external) | Yes — shared by all instances |
| File storage | Supabase Storage (external) | Yes |

### Per-instance state (caveats)

| Component | File | Impact of N instances |
|-----------|------|-----------------------|
| In-memory rate-limit fallback | `rate-limit.ts:34` | When Upstash is healthy: no impact (distributed). When Upstash is down: each instance enforces limits independently, so effective limit = N * configured limit. |
| Circuit breaker state | `safeAzureOpenAI.ts:23-41` | Each instance tracks failures independently. If Azure OpenAI fails globally, each instance opens its own breaker after 5 failures. Acceptable — no over-calling risk, just slightly delayed trip per new instance. |
| Request dedup cache | `request-dedup.ts:16` | Per-instance. Cross-instance duplicates within 5 s TTL are not deduped. Low risk — dedup is a performance optimization, not a correctness requirement. |

### Vercel-specific considerations

ChartSparkOG is deployed on Vercel, which runs each serverless function invocation in an isolated container. Vercel may reuse warm containers ("frozen" invocations) for subsequent requests. Key implications:

- **Singleton `safeAzureOpenAI`** survives across warm invocations on the same container — this is intentional and correct.
- **In-memory rate-limit Map** also survives — provides continuity within a container's lifetime but not across containers.
- **Cold starts** spin up a fresh container with empty in-memory state and re-run `instrumentation.ts`.

### What would make this fully READY

The only structural gap is the **in-memory rate-limit fallback during Upstash outage**. When Upstash Redis is healthy (which is the normal state), all rate limiting is distributed. The fallback is a defense-in-depth mechanism for Upstash downtime — the risk window is narrow. To fully close it, the fallback could use a shared Redis instance rather than in-process memory, but this adds complexity for a rare failure mode.

---

## 6. Cold Start Impact — NEEDS WORK

### Startup sequence (`src/instrumentation.ts`, Node.js runtime)

| Step | Operation | Estimated cost |
|------|-----------|----------------|
| 1 | `logEnvironmentConfig()` — read env vars, format string | ~1 ms |
| 2 | `ensureRequiredEnvVars()` — check 5 env vars for presence | ~1 ms |
| 3 | **Startup secret validation** — check 8 env vars for placeholders, length, URL format | ~3 ms |
| 4 | **Encryption self-test** — `encryptPHI('chartspark-boot-test')` (scrypt KDF + AES-256-GCM) | **~300-500 ms** |
| 5 | **Encryption self-test** — `decryptPHI(encrypted)` (scrypt KDF + AES-256-GCM) | **~300-500 ms** |
| 6 | `import('../sentry.server.config')` — Sentry SDK init, tracing at 10% sample rate | ~50-100 ms |
| | **Total** | **~700-1100 ms** |

### Cost breakdown

The encryption self-test (steps 4-5) accounts for **60-80% of total cold-start time**. It runs two full scrypt KDF cycles (one encrypt, one decrypt) to validate that `PHI_ENCRYPTION_KEY` and `ENCRYPTION_SALT` are functional before the server accepts any PHI.

This is a **deliberate security tradeoff**: catching a misconfigured encryption key at boot is worth ~800 ms. A bad key discovered at runtime would mean PHI that was "encrypted" with a broken config — a HIPAA violation far worse than a slow cold start.

### Module import cost

- **Production dependencies:** 23 packages (from `package.json`)
- **Heavy imports:** `next` (~100 ms), `openai` (~50 ms), `@supabase/ssr` (~30 ms), `@sentry/nextjs` (~50 ms)
- **Lazy loading:** The instrumentation file uses dynamic `import()` for encryption, environment config, and Sentry — so these are loaded only when the Node.js runtime starts, not when Edge or build-time code runs.

### Impact assessment

| Deployment model | Cold start impact |
|-----------------|-------------------|
| **Vercel Serverless (default)** | ~1 s cold start adds to first-request latency. Subsequent requests on warm containers are unaffected. Vercel's container reuse mitigates frequency. |
| **Vercel Edge Runtime** | Not affected — `instrumentation.ts` only runs in the `nodejs` branch (`process.env.NEXT_RUNTIME === 'nodejs'`). |
| **Long-running server (node start)** | One-time ~1 s startup. Negligible for a process that runs for hours/days. |

### What would make this fully READY

The encryption self-test could be made faster by caching the derived key (scrypt output) in memory after first derivation, avoiding a second KDF on the decrypt side. However, per-record salting (introduced for security in v2 of the encryption module) means each record derives its own key — so caching one test key wouldn't help real-world encrypt/decrypt calls. The self-test cost is a fixed one-time overhead that accurately reflects production per-record latency.

---

## Appendix: Dependency Risk Map

| Dependency | Role | Failure mode | Recovery |
|-----------|------|--------------|----------|
| Supabase | Auth, DB, Storage | HTTP error / timeout | Per-request; retry at next request |
| Azure OpenAI (GPT) | SOAP notes, chat, diagnosis | Circuit breaker opens | Auto-recovery via half-open probe after 30 s |
| Azure OpenAI (Whisper) | Audio transcription | Circuit breaker opens | Auto-recovery via half-open probe after 30 s |
| Upstash Redis | Distributed rate limiting | Rate-limit circuit breaker opens | In-memory fallback (fail-closed for auth) |
| Resend | Invitation/notification emails | Returns error | Graceful degradation; logged |
| Stripe | Subscription webhooks | Signature validation fails | 400/500 response; Stripe retries |
| Sentry | Error monitoring | Silent failure | No app impact |
| Daily.co | Telehealth video | SDK manages reconnection | Client-side recovery |
