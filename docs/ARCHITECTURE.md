# ChartSparkOG Architecture

## 1. System Overview

```
                          +---------------------------+
                          |        Clinicians         |
                          |   (Browser / Desktop)     |
                          +------------+--------------+
                                       |
                                       | HTTPS
                                       v
                          +---------------------------+
                          |     ChartSparkOG (Vercel) |
                          |     Next.js 16 App Router |
                          |                           |
                          |  - React 19 SSR/CSR UI    |
                          |  - API Routes (/api/*)    |
                          |  - Middleware (auth, CSP,  |
                          |    rate limiting, IDS)     |
                          |  - Cron jobs (billing,     |
                          |    trial, token cleanup)   |
                          +--+------+------+------+---+
                             |      |      |      |
              +--------------+  +---+  +---+  +---+----------+
              |                 |       |                     |
              v                 v       v                     v
+-------------------+ +--------+--+ +--+----------+ +--------+--------+
| chartspark-scribe | | Supabase  | | Azure OpenAI| |  External SaaS  |
| (Render, optional)| |           | |             | |                 |
|                   | | - Postgres| | - GPT-4o    | | - Stripe        |
| Proxied via       | | - Auth    | | - Whisper   | | - Resend        |
| /api/ai/:path*    | | - RLS     | |             | | - Daily.co      |
| when              | | - Storage | | Circuit     | | - Upstash Redis |
| SCRIBE_SERVICE_URL| |           | | breakers +  | | - Sentry        |
| is set            | +-----------+ | retries     | +-----------------+
+-------------------+               +-------------+
```

**Core services:**

| Service | Host | Role |
|---------|------|------|
| ChartSparkOG | Vercel (serverless) | Frontend, API routes, middleware, cron jobs |
| chartspark-scribe | Render (optional) | Dedicated AI transcription/note generation |
| Supabase | Supabase Cloud | PostgreSQL, Auth, RLS, storage |
| Azure OpenAI | Azure | GPT-4o (SOAP notes, clinical AI), Whisper (transcription) |

---

## 2. Service Boundaries

### ChartSparkOG (Vercel)

The primary monolith. Handles everything unless an optional sidecar is configured.

**Owns:**
- All UI rendering (React 19 + App Router server/client components)
- 67+ API route handlers under `/src/app/api/`
- Authentication middleware, session management, HIPAA session timeouts
- Rate limiting via Upstash Redis (fail-closed for auth endpoints)
- Intrusion detection (SQL injection, XSS, path traversal pattern matching)
- Cron jobs: invoice generation, trial expiration checks, telehealth token cleanup
- AI pipeline when `SCRIBE_SERVICE_URL` is not set

**Key paths:**
- `/src/app/` -- Pages and API routes (App Router)
- `/src/lib/` -- Shared utilities, auth helpers, validation schemas, encryption
- `/src/services/` -- Third-party service integrations (Azure OpenAI, Stripe, Resend)
- `/src/components/` -- React UI components

### chartspark-scribe (Render -- optional)

A sidecar service for offloading AI workloads. When `SCRIBE_SERVICE_URL` is set, `next.config.ts` rewrites all `/api/ai/:path*` requests to the external service:

```typescript
// next.config.ts:138-148
async rewrites() {
  const scribeUrl = process.env.SCRIBE_SERVICE_URL;
  if (!scribeUrl) return [];
  return [{ source: '/api/ai/:path*', destination: `${scribeUrl}/api/ai/:path*` }];
}
```

**Owns (when active):**
- Audio transcription via Whisper
- SOAP note generation via GPT-4o
- Clinical AI endpoints (diagnosis, triage, treatment plans)

### Supabase

**Owns:**
- PostgreSQL database (25+ tables, all RLS-enabled)
- User authentication (email/password, OAuth, PKCE flow)
- MFA enrollment and verification (TOTP)
- Row-Level Security enforcement (organization-scoped data isolation)
- File storage (if used for attachments)

### Azure OpenAI

**Owns:**
- GPT-4o deployment -- SOAP note generation, clinical diagnosis, treatment plans, chart summaries
- Whisper deployment -- audio transcription (25MB max, supports webm/ogg/mp4/wav/flac/m4a)
- API versioning: `2024-08-01-preview` (default) or `2024-10-21`

---

## 3. Data Flow: Clinical Note Lifecycle

```
Clinician records audio in browser
         |
         v
POST /api/ai/transcribe-and-generate
  (FormData: audio file + patient context + selected clinical phrases)
         |
         +-- withAuth() validates JWT cookie, extracts user + organization
         +-- canAccessPatient() checks ownership via RLS
         +-- Audit log: NOTE_CREATE event (metadata only, no PHI)
         |
         v
Step 1: Transcription
  safeAzureOpenAI.transcribeAudio(audioBuffer, filename)
    -> Azure OpenAI Whisper deployment
    -> Returns { transcript, language }
         |
         v
Step 2: SOAP Note Generation
  safeAzureOpenAI.generateSOAPNote(sessionData)
    -> Azure OpenAI GPT-4o deployment
    -> System prompt + transcript + clinical phrases
    -> Parses sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN
         |
         v
Step 3: Billing Code Analysis
  analyzeNoteForCodes()
    -> Extracts suggested CPT/ICD-10 codes from note content
         |
         v
Step 4: Response to Client
  { transcript, soapNote, billingCodes }
    -> Rendered in note editor UI
    -> Clinician reviews and edits
         |
         v
POST /api/notes (save)
  -> content encrypted with AES-256-GCM (per-record salt)
  -> Stored in clinical_notes table
  -> status: 'draft'
  -> Fields: patient_id, organization_id, provider_id, encounter_id, content, template_id
         |
         v
POST /api/notes/[id]/sign (clinician signs)
  -> status: 'draft' -> 'signed'
  -> signed_at timestamp recorded
  -> Audit log: NOTE_SIGN event
```

**Other AI endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ai/diagnose` | Clinical diagnosis analysis with ICD-10 codes |
| `POST /api/ai/chat` | General clinical Q&A |
| `POST /api/ai/smart-triage/medication-review` | Drug interaction checking |
| `POST /api/ai/smart-triage/prescribing-check` | Prescribing guideline validation |
| `POST /api/ai/smart-triage/chart-summary` | Chart summarization |
| `POST /api/ai/validate-codes` | CPT/ICD code validation |
| `POST /api/ai/treatment-plan` | Treatment plan generation |

---

## 4. Authentication Model

### Session Management

Supabase Auth with SSR cookie-based sessions via `@supabase/ssr`.

```
Browser                     Next.js Middleware              Supabase
  |                              |                            |
  |-- Request with cookies ----->|                            |
  |                              |-- Refresh session -------->|
  |                              |<-- Updated JWT ------------|
  |                              |                            |
  |                              |-- Check protectedRoutes    |
  |                              |   map for role requirement |
  |                              |                            |
  |                              |-- Verify MFA assurance     |
  |                              |   level (aal1 vs aal2)     |
  |                              |                            |
  |<-- Set-Cookie (refreshed) ---|                            |
```

**HIPAA session timeouts** (enforced in middleware):
- Inactivity: 15 minutes (`SESSION_TIMEOUT_MS`)
- Absolute: 8 hours since login (`ABSOLUTE_SESSION_TIMEOUT_MS`)
- Tracked via `profiles.last_activity_at` (updated on each API call)

### OAuth / PKCE

- OAuth callback: `/api/auth/callback`
- PKCE (Proof Key for Code Exchange) is the default Supabase SSR flow
- CSRF protection via `__csrf_callback` cookie
- Redirect validation: must match `NEXT_PUBLIC_APP_URL` origin (not `x-forwarded-host`)

### Role-Based Access Control

Roles: `USER`, `ADMIN`, `SUPER_ADMIN`, `AUDITOR`

Protected route map (from `src/lib/supabase/middleware.ts`):

| Route | Required Roles |
|-------|---------------|
| `/super-admin` | SUPER_ADMIN |
| `/admin` | SUPER_ADMIN, ADMIN |
| `/auditor` | SUPER_ADMIN, AUDITOR |
| `/billing` | SUPER_ADMIN, ADMIN, USER |
| `/notes`, `/patients`, etc. | Any authenticated org member |

### MFA (Multi-Factor Authentication)

Implementation: `src/lib/auth/mfa.ts`

- **Method:** TOTP via authenticator apps (Supabase native MFA)
- **Required for:** ADMIN, SUPER_ADMIN, AUDITOR roles
- **Enforcement:** Post-login redirect to `/auth/mfa-challenge` if session has `aal1` but role requires `aal2`
- **Verification:** `POST /api/auth/verify-mfa` -- rate limited to 5 attempts per 15 minutes per user ID
- **Recovery:** Recovery codes stored in `user_recovery_codes` table (hashed)
- **Audit:** All MFA attempts logged in `mfa_attempts` table

Error codes returned (never raw upstream errors):
- `MFA_INVALID_CODE` -- incorrect code
- `MFA_EXPIRED` -- code timeout
- `MFA_PROVIDER_ERROR` -- Supabase failure
- `MFA_RATE_LIMITED` -- too many attempts (429)

### Row-Level Security (RLS)

All tables have RLS enabled. Key policies:

- **Organization isolation:** Users can only read/write data within their `organization_id`
- **Patient access:** `canAccessPatient()` validates ownership before any patient operation
- **Audit logs:** Append-only (INSERT allowed, no UPDATE/DELETE)
- **Auditor access:** Read-only across organizations for compliance review
- **Super admin:** Full read access across organizations

---

## 5. AI Pipeline

### Architecture

```
API Route Handler
    |
    +-- withAuth() + rate limit (20 req/min for AI endpoints)
    |
    v
safeAzureOpenAI (src/services/safeAzureOpenAI.ts)
    |
    +-- Circuit Breaker
    |     state: closed -> open (after 5 failures in 60s) -> half-open (after 30s)
    |     throws: CircuitBreakerOpenError when open
    |
    +-- Retry with Exponential Backoff
    |     max retries: 2 (3 total attempts)
    |     base delay: 1s, max delay: 10s
    |
    +-- Timeout
    |     GPT-4o: 30,000ms
    |     Whisper: 60,000ms
    |
    v
AzureOpenAI SDK (openai@6.15.0)
    |
    +-- endpoint: AZURE_OPENAI_ENDPOINT
    +-- apiKey: AZURE_OPENAI_API_KEY
    +-- deployment: AZURE_OPENAI_DEPLOYMENT_NAME (gpt-4o)
    +-- whisper: AZURE_OPENAI_WHISPER_DEPLOYMENT (whisper)
    +-- apiVersion: AZURE_OPENAI_API_VERSION
```

### Circuit Breakers

Two independent circuits:

| Circuit | Failure Threshold | Window | Open Duration |
|---------|-------------------|--------|---------------|
| `azure-openai-gpt` | 5 failures | 60s | 30s |
| `azure-openai-whisper` | 5 failures | 60s | 30s |

State machine: `CLOSED` -> `OPEN` (on threshold) -> `HALF_OPEN` (after cooldown, allows 1 probe) -> `CLOSED` (on success) or `OPEN` (on failure)

### Demo Mode Fallback

When Azure OpenAI credentials are not configured:
- **Development (`NODE_ENV !== 'production'`):** Returns demo/mock responses
- **Production:** Throws `"Service not configured"` error

### Why Azure OpenAI over Direct OpenAI

- **Data residency:** Azure regions provide control over where PHI is processed
- **BAA (Business Associate Agreement):** Azure OpenAI supports HIPAA BAAs; direct OpenAI does not
- **Enterprise compliance:** Azure's compliance certifications (SOC 2, HITRUST) align with healthcare requirements
- **Network isolation:** Azure Virtual Network integration is available for future hardening

---

## 6. Deployment Topology

```
+------------------+     +------------------+     +------------------+
|    Vercel CDN    |     |  Vercel Edge     |     | Vercel Serverless|
|                  |     |                  |     |                  |
| Static assets    |     | Middleware       |     | API Routes       |
| (JS, CSS, imgs)  |     | - Auth refresh   |     | - /api/notes     |
|                  |     | - Rate limiting  |     | - /api/ai/*      |
|                  |     | - CSP headers    |     | - /api/auth/*    |
|                  |     | - IDS checks     |     | - /api/cron/*    |
+------------------+     +------------------+     +------------------+
                                                          |
                    +-------------------------------------+--------+--------+
                    |                    |                 |        |        |
                    v                    v                 v        v        v
            +-------------+    +-----------------+    +------+ +------+ +-------+
            | Supabase    |    | Azure OpenAI    |    |Stripe| |Resend| |Daily  |
            | (Postgres,  |    | (East US)       |    |      | |      | |.co    |
            |  Auth, RLS) |    |                 |    +------+ +------+ +-------+
            +-------------+    | GPT-4o, Whisper |
                               +-----------------+
                                        ^
                                        | (optional proxy)
                               +-----------------+
                               | chartspark-     |
                               | scribe (Render) |
                               +-----------------+
```

### Vercel Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/generate-invoices` | 1st of month, 00:00 UTC | Monthly billing generation |
| `/api/cron/check-trial-expirations` | Daily, 06:00 UTC | Expire trials, notify users |
| `/api/cron/cleanup-telehealth-tokens` | Daily, 00:00 UTC | Purge expired Daily.co tokens |

All cron endpoints require `Authorization: Bearer ${CRON_SECRET}`.

### Security Headers

Applied globally via `next.config.ts`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cache-Control: no-store, no-cache` (API routes)
- CSP: strict default, relaxed for telehealth routes (Daily.co SDK requires `unsafe-eval`)

### Rate Limiting (Upstash Redis)

| Endpoint Category | Limit | Behavior on Limit |
|-------------------|-------|--------------------|
| General API | 100 req/min | 429 response |
| Authentication | 10 req/min | Fail-closed (429) |
| Login | 5 req/15min per IP, 10 req/15min per email | 429 |
| MFA verify | 5 req/15min per user ID | 429 |
| AI endpoints | 20 req/min | 429 |
| Telehealth | 50 req/hour | 429 |

---

## 7. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js 16 (App Router)** | Server Components reduce client bundle size for data-heavy clinical views. API routes co-locate backend logic with the frontend, reducing deployment complexity for a small team. Vercel's edge middleware handles auth/rate-limiting before cold starts. |
| **Supabase over custom Postgres** | Built-in Auth with PKCE, native MFA (TOTP), and RLS eliminate the need for a custom auth service. Postgres RLS provides organization-level data isolation without application-layer filtering, reducing the surface area for access control bugs. |
| **Azure OpenAI over direct OpenAI** | HIPAA BAA support. Direct OpenAI does not offer BAAs. Azure provides data residency control, SOC 2/HITRUST compliance certifications, and a path to VNet-level network isolation. |
| **AES-256-GCM PHI encryption** | Per-record salts prevent rainbow table attacks across records. Encryption at the application layer (not just at-rest) means PHI is protected even if database backups are compromised. V1-to-V2 salt migration supports key rotation. |
| **Upstash Redis for rate limiting** | Distributed rate limiting across Vercel's serverless functions (no shared in-memory state). Fail-closed on auth endpoints means Redis outage blocks logins rather than allowing unlimited attempts. |
| **Optional scribe sidecar** | Keeps the monolith simple for development while allowing AI workloads to be offloaded to a GPU-equipped Render instance for production. A single env var (`SCRIBE_SERVICE_URL`) toggles between local and remote AI processing. |
| **Stripe for billing** | Webhook-driven billing avoids polling. Subscription tiers (`starter`, `elite`) gate features via the `features` and `user_features` tables, not Stripe metadata, keeping authorization logic in the database. |
| **Daily.co for telehealth** | HIPAA-eligible video SDK with room-level access tokens. Token cleanup cron prevents stale session accumulation. |

---

## 8. Environment Variables Reference

### Supabase (required)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous/public key (RLS-restricted) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key (bypasses RLS -- never expose to client) |

### PHI Encryption (required)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `PHI_ENCRYPTION_KEY` | Server only | AES-256-GCM encryption key. Generate: `openssl rand -base64 32` |
| `ENCRYPTION_SALT` | Server only | Legacy v1 encryption salt. Generate: `openssl rand -hex 16` |

### Azure OpenAI (required for AI features)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `AZURE_OPENAI_API_KEY` | Server only | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Server only | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Server only | GPT model deployment name (e.g., `gpt-4o`) |
| `AZURE_OPENAI_API_VERSION` | Server only | API version. Default: `2024-08-01-preview` |
| `AZURE_OPENAI_WHISPER_DEPLOYMENT` | Server only | Whisper model deployment name. Default: `whisper` |

### Stripe (required for billing)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Server only | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client + Server | Stripe publishable key |
| `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` | Client + Server | Price ID for Starter tier |
| `NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID` | Client + Server | Price ID for Elite tier |

### Email (Resend)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Server only | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Server only | Sender address (e.g., `ChartSpark <noreply@chartspark.app>`) |

### Telehealth (Daily.co)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `DAILY_API_KEY` | Server only | Daily.co API key. Never expose as `NEXT_PUBLIC_` |

### Rate Limiting (Upstash Redis)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Server only | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | Upstash Redis auth token |

### Application

| Variable | Exposure | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Client + Server | Application URL (e.g., `https://chartspark.app`) |
| `NEXT_PUBLIC_APP_ENV` | Client + Server | Environment: `dev`, `staging`, `production` |
| `NODE_ENV` | Server only | Node.js environment |
| `LOG_LEVEL` | Server only | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `CRON_SECRET` | Server only | Bearer token for cron endpoint authorization |

### Scribe Service (optional)

| Variable | Exposure | Description |
|----------|----------|-------------|
| `SCRIBE_SERVICE_URL` | Server only | When set, proxies all `/api/ai/*` requests to this URL |

### Development Only

| Variable | Exposure | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | Client + Server | Enable demo mode. **Must be `false` in production** |
| `DEMO_LOGIN_CREDENTIALS` | Server only | JSON array of demo login presets |
| `DISABLE_MFA_ENFORCEMENT` | Server only | Skip MFA requirement for admin roles. **Dev only** |
