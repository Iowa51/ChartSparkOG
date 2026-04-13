# HIPAA Risk Assessment — ChartSparkOG

**Version:** 1.0
**Date:** 2026-04-12
**Prepared by:** Security & Compliance Team
**Review cycle:** Annual (next review: 2027-04-12)

---

## 1. System Overview

ChartSparkOG is a cloud-based Electronic Health Record (EHR) platform for clinical documentation. The system captures patient audio via browser microphone, transcribes it using Azure OpenAI Whisper, generates structured SOAP notes via Azure OpenAI GPT, and stores all clinical data in Supabase PostgreSQL with AES-256-GCM encryption at rest.

**Deployment:** Vercel (Next.js serverless)
**Database:** Supabase (PostgreSQL with Row-Level Security)
**AI Services:** Azure OpenAI (Whisper + GPT)
**Email:** Resend
**Rate Limiting:** Upstash Redis
**Error Tracking:** Sentry
**Telehealth:** Daily.co

---

## 2. PHI Data Flow Analysis

### 2.1 Audio Capture (Browser → Vercel)

| Property | Detail |
|----------|--------|
| **Entry point** | `src/app/(app)/notes/new/page.tsx` |
| **Mechanism** | Browser MediaRecorder API (WebM/OGG/WAV) |
| **Transport** | HTTPS/TLS 1.2+ to Vercel edge |
| **Max size** | 25 MB |
| **Allowed formats** | webm, ogg, mp4, mpeg, wav, flac, m4a |
| **CSP control** | `microphone=(self)` via Permissions-Policy header |

### 2.2 Transcription (Vercel → Azure Whisper)

| Property | Detail |
|----------|--------|
| **API route** | `src/app/api/ai/transcribe-and-generate/route.ts` |
| **Service wrapper** | `src/services/safeAzureOpenAI.ts` |
| **Transport** | HTTPS/TLS to Azure OpenAI endpoint |
| **Timeout** | 60 seconds |
| **Resilience** | Circuit breaker (5 failures / 60s window), 2 retries with exponential backoff |
| **Data retention on Azure** | None — one-time inference, no storage per Azure OpenAI data policy under BAA |

### 2.3 SOAP Note Generation (Vercel → Azure GPT)

| Property | Detail |
|----------|--------|
| **Input** | Transcript text from Whisper + structured prompt |
| **Output** | Parsed SOAP note (SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN sections) |
| **Transport** | HTTPS/TLS to Azure OpenAI endpoint |
| **Timeout** | 30 seconds |
| **Resilience** | Separate circuit breaker from Whisper |
| **PHI in prompt** | Yes — transcript may contain patient name, symptoms, diagnoses |

### 2.4 Billing Code Extraction (Server-side)

| Property | Detail |
|----------|--------|
| **Implementation** | `src/lib/billing/code-analyzer.ts` |
| **Input** | Generated SOAP note text |
| **Output** | Up to 4 CPT codes, 5 ICD-10 codes |
| **Transport** | In-memory (no external call unless Azure GPT is used) |

### 2.5 Storage (Vercel → Supabase)

| Property | Detail |
|----------|--------|
| **Database** | Supabase PostgreSQL |
| **PHI tables** | `patients`, `clinical_notes`, `encounters`, `vitals`, `screening_scores`, `patient_allergies`, `patient_medications`, `patient_problems`, `patient_insurance`, `patient_documents`, `smart_triage_results`, `medication_interaction_log` |
| **Encryption at rest** | AES-256-GCM with per-record salt (`src/lib/security/encryption.ts`) |
| **Encrypted fields** | SSN, insurance_id, medical_record_number, full_address, date_of_birth, phone, email |
| **Transport** | HTTPS/TLS to Supabase endpoint |
| **Access control** | Row-Level Security policies scoped by `organization_id` |

### 2.6 Document Storage (Vercel → Supabase Storage)

| Property | Detail |
|----------|--------|
| **Bucket** | `patient-documents` |
| **Path structure** | `{org_id}/patients/{patient_id}/{filename}` |
| **Max size** | 5 MB |
| **Allowed types** | JPEG, PNG, WebP, PDF |
| **Validation** | Magic byte verification, MIME type check, filename sanitization (`src/lib/security/file-security.ts`) |
| **Access** | Signed URLs with RLS enforcement |

### 2.7 Email Notifications (Vercel → Resend)

| Property | Detail |
|----------|--------|
| **Provider** | Resend (from `noreply@chartspark.io`) |
| **PHI in email** | No — security alerts contain only alert code, timestamp, severity, fixed description |
| **Email types** | Welcome, MFA setup, password reset, org invitations, security alerts |

---

## 3. Threat Analysis

### 3.1 Audio Capture Stage

| Threat | Likelihood | Impact | Risk |
|--------|-----------|--------|------|
| Browser-side interception (malicious extension) | Low | High | **Medium** |
| Unauthorized microphone access | Low | High | **Medium** |
| Audio data in browser memory after recording | Medium | Medium | **Medium** |

**Existing controls:**
- CSP `microphone=(self)` restricts microphone to app origin
- HTTPS-only transport (HSTS with 2-year max-age, preload)
- `X-Frame-Options: DENY` prevents clickjacking
- `X-Content-Type-Options: nosniff` prevents MIME confusion

### 3.2 Transcription Stage (Azure Whisper)

| Threat | Likelihood | Impact | Risk |
|--------|-----------|--------|------|
| Man-in-the-middle interception | Very Low | High | **Low** |
| Azure service compromise | Very Low | Critical | **Low** |
| Audio data retained by Azure beyond inference | Very Low | High | **Low** |

**Existing controls:**
- TLS 1.2+ encryption in transit
- Azure OpenAI BAA covers HIPAA obligations
- Azure data processing agreement: no training on customer data
- Circuit breaker prevents repeated calls to degraded service

### 3.3 SOAP Note Generation Stage (Azure GPT)

| Threat | Likelihood | Impact | Risk |
|--------|-----------|--------|------|
| PHI in prompts exposed via Azure logs | Low | High | **Medium** |
| Prompt injection leaking PHI from other sessions | Very Low | Critical | **Low** |
| Model hallucination introducing incorrect clinical data | Medium | High | **High** |

**Existing controls:**
- Azure OpenAI BAA and data processing terms
- Structured prompt templates limit injection surface
- SOAP note requires clinician review and signature before finalization
- Note `status` field distinguishes `draft` from `signed`

### 3.4 Database Storage Stage (Supabase)

| Threat | Likelihood | Impact | Risk |
|--------|-----------|--------|------|
| SQL injection | Very Low | Critical | **Low** |
| Unauthorized cross-organization data access | Low | Critical | **Medium** |
| Database breach exposing PHI | Very Low | Critical | **Low** |
| Backup exposure | Low | High | **Medium** |

**Existing controls:**
- Parameterized queries via Supabase client SDK (no raw SQL in application)
- Row-Level Security on all PHI tables scoped by `organization_id`
- AES-256-GCM encryption on sensitive patient fields
- SQL injection detection in middleware (`src/middleware.ts`)
- Input validation via Zod schemas (`src/lib/validation/schemas.ts`)
- Supabase manages encryption at rest for PostgreSQL storage

### 3.5 Authentication & Session Management

| Threat | Likelihood | Impact | Risk |
|--------|-----------|--------|------|
| Brute-force login | Medium | High | **Medium** |
| Session hijacking | Low | Critical | **Medium** |
| Privilege escalation | Low | Critical | **Low** |
| Credential stuffing | Medium | High | **Medium** |

**Existing controls:**
- Account lockout after 5 failed attempts / 30-minute window (`src/lib/auth/lockout.ts`)
- 15-minute inactivity timeout + 8-hour absolute session timeout (`src/lib/auth/api-auth.ts`)
- MFA required for ADMIN, SUPER_ADMIN, AUDITOR roles
- Database trigger `prevent_self_role_escalation()` blocks self-promotion
- Rate limiting: 10 req/min on auth endpoints, 5 req/15min on login (IP-based)
- CSRF protection via origin validation (`src/lib/security/csrf.ts`)

### 3.6 Application Infrastructure

| Threat | Likelihood | Impact | Risk |
|--------|-----------|--------|------|
| Vercel serverless function compromise | Very Low | Critical | **Low** |
| Environment variable exposure | Low | Critical | **Medium** |
| Dependency supply-chain attack | Low | High | **Medium** |
| DDoS against API endpoints | Medium | Medium | **Medium** |

**Existing controls:**
- Secrets managed via Vercel dashboard (never committed to repo)
- Rate limiting with Upstash Redis + in-memory fallback + circuit breaker
- Sentry error tracking (10% transaction sample rate)
- Security headers on all responses (HSTS, CSP, X-Frame-Options, etc.)
- `no-store, no-cache` on all API responses

---

## 4. Residual Risk Summary

| Risk Area | Residual Rating | Justification |
|-----------|----------------|---------------|
| Audio capture in browser | **Medium** | Browser memory not zeroed after recording; no client-side encryption before upload |
| Azure Whisper transcription | **Low** | TLS + BAA + no-retention policy |
| Azure GPT SOAP generation | **Medium** | PHI present in prompts; relies on Azure BAA for data handling |
| AI hallucination in clinical notes | **High** | Model may generate clinically inaccurate content; mitigated by required clinician review |
| Supabase database storage | **Low** | RLS + application encryption + parameterized queries |
| Document storage | **Low** | Signed URLs, file validation, org-scoped paths |
| Authentication | **Medium** | Lockout and MFA in place; MFA not yet required for basic USER role |
| Session management | **Low** | Dual timeout strategy (inactivity + absolute) |
| Email notifications | **Low** | No PHI in email bodies |
| Error tracking (Sentry) | **Medium** | Stack traces could contain user IDs or URL parameters |

**Overall system risk: MEDIUM**

---

## 5. Gap Analysis and Mitigation Plans

### 5.1 CRITICAL Priority

| Gap | Current State | Mitigation | Target Date |
|-----|---------------|------------|-------------|
| Unprotected system health endpoint | `/api/admin/system-health` has no authentication | Add `withAuth({ requiredRole: 'SUPER_ADMIN' })` wrapper | Immediate |
| Clinical transcript logged to browser console | Console output may contain PHI | Remove all `console.log` of transcript/note content in production builds | Immediate |
| Service role key in git history | Key may be in prior commits | Rotate key, audit git history, consider BFG Repo-Cleaner | Immediate |

### 5.2 HIGH Priority

| Gap | Current State | Mitigation | Target Date |
|-----|---------------|------------|-------------|
| MFA not required for USER (clinician) role | Only ADMIN/SUPER_ADMIN/AUDITOR require MFA | Enforce MFA for all roles accessing PHI | 30 days |
| Incomplete org isolation on some routes | Appointments, some vitals queries may lack org boundary checks | Audit all API routes for `organization_id` enforcement | 30 days |
| `SELECT *` queries exposing excess fields | Some queries return all columns | Replace with explicit column lists on PHI tables | 30 days |
| No data loss prevention (DLP) on AI prompts | PHI sent to Azure without redaction | Evaluate pre-processing to strip identifiers before AI inference | 60 days |

### 5.3 MEDIUM Priority

| Gap | Current State | Mitigation | Target Date |
|-----|---------------|------------|-------------|
| No client-side audio encryption | Audio uploaded as plaintext over TLS | Evaluate Web Crypto API for client-side encryption before upload | 90 days |
| Sentry may capture PHI in stack traces | Default error capture includes request context | Configure Sentry `beforeSend` hook to scrub PHI patterns | 30 days |
| No automated vulnerability scanning | Manual dependency review only | Integrate `npm audit` and Snyk into CI/CD pipeline | 60 days |
| Backup encryption verification | Relying on Supabase default backup encryption | Request documentation from Supabase confirming backup encryption specifics | 30 days |
| No penetration testing schedule | Ad-hoc security reviews only | Schedule annual third-party penetration test | 90 days |

### 5.4 LOW Priority

| Gap | Current State | Mitigation | Target Date |
|-----|---------------|------------|-------------|
| No formal data retention/deletion policy | Data retained indefinitely | Define retention periods per data type; implement automated purge | 120 days |
| No break-glass access procedure | No emergency access mechanism documented | Document emergency access procedure for system outages | 90 days |
| Training documentation | No formal HIPAA training materials | Develop staff training program for PHI handling | 120 days |

---

## 6. Risk Acceptance

Risks rated **Low** are accepted under current controls. Risks rated **Medium** are accepted with the condition that mitigation plans in Section 5 are executed within stated timelines. The **High** residual risk for AI hallucination is accepted because the system requires clinician review and signature before any note is finalized — the AI output is a draft aid, not an autonomous clinical decision.

**Approved by:** ___________________________
**Title:** ___________________________
**Date:** ___________________________

---

## 7. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-12 | Security & Compliance Team | Initial risk assessment |
