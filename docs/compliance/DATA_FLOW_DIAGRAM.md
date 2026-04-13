# Data Flow Diagram — ChartSparkOG

**Version:** 1.0
**Date:** 2026-04-12
**Classification:** Internal
**Review cycle:** Annual (next review: 2027-04-12)

---

## 1. System Context

ChartSparkOG is a multi-tenant clinical documentation platform. The following systems process, store, or transmit Protected Health Information (PHI):

| System | Role | PHI Contact | BAA Required |
|--------|------|-------------|-------------|
| **User's Browser** | Client application | Yes — audio, patient data displayed | N/A (end user) |
| **Vercel** | Application hosting (serverless) | Yes — processes all API requests | Yes |
| **Supabase** | Database, auth, file storage | Yes — primary PHI data store | Yes |
| **Azure OpenAI** | AI transcription and note generation | Yes — audio and transcript text | Yes |
| **Upstash Redis** | Rate limiting | No — stores only request counts and IP hashes | No |
| **Resend** | Transactional email | No — emails contain no PHI | Recommended |
| **Sentry** | Error tracking | Minimal — stack traces may contain user IDs | Recommended |
| **Daily.co** | Telehealth video | Yes — live audio/video streams | Yes |
| **Stripe** | Billing and subscriptions | No — customer name/email only, no clinical data | No |

---

## 2. PHI Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ Audio    │  │ Patient      │  │ SOAP Note  │  │ Document     │ │
│  │ Recorder │  │ Forms        │  │ Viewer     │  │ Upload       │ │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘ │
│       │               │                │                 │         │
└───────┼───────────────┼────────────────┼─────────────────┼─────────┘
        │               │                │                 │
        │  HTTPS/TLS    │  HTTPS/TLS     │  HTTPS/TLS      │  HTTPS/TLS
        ▼               ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js Serverless)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ MIDDLEWARE (src/middleware.ts)                                │   │
│  │  • Auth session validation          • SQL injection detect   │   │
│  │  • Role-based route protection      • XSS detection          │   │
│  │  • MFA enforcement (AAL2)           • Path traversal detect  │   │
│  │  • Security headers injection       • Rate limit check       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ /api/ai/         │  │ /api/patients    │  │ /api/notes      │  │
│  │ transcribe-and-  │  │                  │  │                  │  │
│  │ generate         │  │ Patient CRUD     │  │ Note CRUD        │  │
│  │                  │  │ PHI encryption   │  │ Audit logging    │  │
│  │ Audio processing │  │ Org isolation    │  │ Sign workflow     │  │
│  └───────┬──────────┘  └────────┬─────────┘  └────────┬────────┘  │
│          │                      │                      │           │
│          │                      │                      │           │
│  ┌───────┴──────────┐          │                      │           │
│  │ /api/patients/   │          │                      │           │
│  │ [id]/documents   │          │                      │           │
│  │                  │          │                      │           │
│  │ File upload/     │          │                      │           │
│  │ download         │          │                      │           │
│  └───────┬──────────┘          │                      │           │
│          │                      │                      │           │
└──────────┼──────────────────────┼──────────────────────┼───────────┘
           │                      │                      │
     ┌─────┘                      │                      │
     │                            │                      │
     ▼                            ▼                      ▼
┌──────────────┐    ┌──────────────────────────────────────────────┐
│ AZURE OPENAI │    │           SUPABASE                            │
│              │    │                                                │
│ ┌──────────┐ │    │  ┌─────────────────────────────────────────┐  │
│ │ Whisper  │ │    │  │ PostgreSQL Database                      │  │
│ │ (STT)    │ │    │  │                                          │  │
│ │ Audio →  │ │    │  │  patients          (encrypted fields)    │  │
│ │ Text     │ │    │  │  clinical_notes    (SOAP content)        │  │
│ └────┬─────┘ │    │  │  encounters        (visit records)       │  │
│      │       │    │  │  vitals            (vital signs)         │  │
│      ▼       │    │  │  screening_scores  (assessments)         │  │
│ ┌──────────┐ │    │  │  patient_allergies                       │  │
│ │ GPT      │ │    │  │  patient_medications                     │  │
│ │ (LLM)    │ │    │  │  patient_problems                       │  │
│ │ Text →   │ │    │  │  patient_insurance (encrypted)           │  │
│ │ SOAP     │ │    │  │  patient_documents (metadata)            │  │
│ │ Note     │ │    │  │  smart_triage_results                    │  │
│ └──────────┘ │    │  │  medication_interaction_log              │  │
│              │    │  │  audit_logs        (access trail)        │  │
│  HTTPS/TLS   │    │  │  login_attempts    (security)            │  │
│  No storage  │    │  │                                          │  │
│  BAA: Yes    │    │  │  RLS: org_id scoped on all tables        │  │
└──────────────┘    │  └─────────────────────────────────────────┘  │
                    │                                                │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │ Supabase Storage                         │  │
                    │  │  Bucket: patient-documents               │  │
                    │  │  Path: {org_id}/patients/{pid}/{file}    │  │
                    │  │  Access: signed URLs + RLS               │  │
                    │  └─────────────────────────────────────────┘  │
                    │                                                │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │ Supabase Auth                            │  │
                    │  │  Session management (JWT + cookies)      │  │
                    │  │  MFA (TOTP)                              │  │
                    │  │  Role claims in JWT                      │  │
                    │  └─────────────────────────────────────────┘  │
                    │                                                │
                    │  HTTPS/TLS | Encryption at rest | BAA: Yes    │
                    └────────────────────────────────────────────────┘
```

---

## 3. Encryption Status by Stage

### 3.1 Data in Transit

| Path | Protocol | Minimum TLS | Enforced By |
|------|----------|-------------|-------------|
| Browser → Vercel | HTTPS | TLS 1.2 | HSTS header (2-year max-age, preload) via `src/next.config.ts` |
| Vercel → Azure OpenAI | HTTPS | TLS 1.2 | Azure endpoint policy |
| Vercel → Supabase DB | HTTPS | TLS 1.2 | Supabase connection policy |
| Vercel → Supabase Storage | HTTPS | TLS 1.2 | Supabase connection policy |
| Vercel → Upstash Redis | HTTPS | TLS 1.2 | Upstash REST API policy |
| Vercel → Resend | HTTPS | TLS 1.2 | Resend API policy |
| Vercel → Sentry | HTTPS | TLS 1.2 | Sentry SDK default |
| Vercel → Stripe | HTTPS | TLS 1.2 | Stripe API policy |
| Browser → Daily.co | HTTPS + DTLS/SRTP | TLS 1.2 / DTLS 1.2 | Daily.co WebRTC policy |

### 3.2 Data at Rest

| Location | Encryption | Method | Key Management |
|----------|-----------|--------|----------------|
| **Supabase PostgreSQL** (all data) | Yes | AES-256 (Supabase managed) | Supabase infrastructure |
| **Patient PII fields** (SSN, DOB, phone, etc.) | Yes | AES-256-GCM (application-level) | `PHI_ENCRYPTION_KEY` env var, per-record salt (`src/lib/security/encryption.ts`) |
| **Supabase Storage** (patient documents) | Yes | AES-256 (Supabase managed) | Supabase infrastructure |
| **Supabase backups** | Yes | AES-256 (Supabase managed) | Supabase infrastructure |
| **Vercel function cache** | Ephemeral | N/A — serverless functions are stateless | No persistent storage |
| **Upstash Redis** | Yes | AES-256 (Upstash managed) | Upstash infrastructure |
| **Browser (client-side)** | No | Session data in HTTP-only cookies; no PHI in localStorage | N/A |

### 3.3 Application-Level Encryption Details

**Implementation:** `src/lib/security/encryption.ts`

**Format (v2):** `v2:<salt_hex>:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key derivation | Scrypt (from `PHI_ENCRYPTION_KEY` + per-record salt) |
| IV length | 16 bytes (random per encryption) |
| Auth tag | 16 bytes (GCM integrity verification) |
| Salt | 16 bytes (random per record) |

**Encrypted fields on `patients` table:**
- `ssn`
- `insurance_id`
- `medical_record_number`
- `full_address`
- `date_of_birth`
- `phone`
- `email`

**Note:** Clinical note content (`clinical_notes.content`) is stored in plaintext in the database, protected by Supabase's infrastructure-level encryption at rest and RLS policies. It is not application-level encrypted.

---

## 4. Data Retention

> **ACTION REQUIRED:** Finalize retention periods with legal counsel and implement automated enforcement.

| Data Type | Table/Location | Proposed Retention | Current State | Deletion Method |
|-----------|----------------|-------------------|---------------|-----------------|
| Patient demographics | `patients` | Duration of care + 7 years | Indefinite (no automated purge) | Soft delete → hard delete after retention |
| Clinical notes | `clinical_notes` | Duration of care + 7 years | Indefinite | Soft delete → hard delete after retention |
| Encounters | `encounters` | Duration of care + 7 years | Indefinite | Cascade with patient |
| Vitals / screenings | `vitals`, `screening_scores` | Duration of care + 7 years | Indefinite | Cascade with patient |
| Patient documents | `patient_documents` + Storage | Duration of care + 7 years | Indefinite | Delete metadata + storage object |
| Audit logs | `audit_logs` | 7 years minimum (HIPAA) | Indefinite | Archive to cold storage after 1 year, delete after 7 years |
| Login attempts | `login_attempts` | 90 days | Indefinite | Automated purge recommended |
| Telehealth session tokens | `telehealth_session_tokens` | 24 hours | Daily cleanup cron (`/api/cron/cleanup-telehealth-tokens`) | Cron job deletes expired tokens |
| Audio recordings | Not stored | Not retained after transcription | Audio processed in-memory only | N/A — never persisted |
| Sentry error events | Sentry cloud | Per Sentry plan (30-90 days) | Sentry-managed | Sentry auto-purge |
| Vercel function logs | Vercel cloud | Per Vercel plan | Vercel-managed | Vercel auto-purge |

**State-specific requirements:** Some US states require longer retention periods (e.g., 10 years in some jurisdictions). Consult legal counsel for applicable requirements based on patient locations.

---

## 5. Third-Party Processors

### 5.1 Processors with PHI Access

| Processor | Service | PHI Exposure | BAA Status | Data Processing Agreement |
|-----------|---------|-------------|-----------|--------------------------|
| **Supabase** (supabase.com) | Database, auth, storage | Full — primary data store | **Required — Verify signed** | Supabase HIPAA add-on required (Pro plan+) |
| **Microsoft Azure** (azure.microsoft.com) | OpenAI Whisper + GPT | Audio files, transcript text, clinical content in prompts | **Required — Verify signed** | Azure HIPAA BAA (Enterprise Agreement) |
| **Vercel** (vercel.com) | Application hosting | All API request/response data passes through | **Required — Verify signed** | Vercel HIPAA add-on (Enterprise plan) |
| **Daily.co** (daily.co) | Telehealth video | Live audio/video streams of clinical sessions | **Required — Verify signed** | Daily.co HIPAA BAA (available on request) |

### 5.2 Processors without PHI Access

| Processor | Service | Data Exposure | BAA Status | Notes |
|-----------|---------|--------------|-----------|-------|
| **Upstash** (upstash.com) | Redis rate limiting | Request counts, IP hashes | Not required | No PHI stored; only rate limit counters |
| **Resend** (resend.com) | Transactional email | Recipient email addresses only; no clinical content in emails | Recommended | Email bodies contain no PHI (`src/lib/security/audit-log.ts` — alerts use fixed descriptions) |
| **Sentry** (sentry.io) | Error tracking | Stack traces, request metadata; may incidentally include user IDs | Recommended | Configure `beforeSend` to scrub PHI patterns |
| **Stripe** (stripe.com) | Billing | Customer name, email, plan selection | Not required | No clinical data transmitted |

### 5.3 BAA Compliance Checklist

> **ACTION REQUIRED:** Confirm all BAAs are executed before processing real patient data.

- [ ] Supabase BAA signed (requires HIPAA add-on, Pro plan minimum)
- [ ] Azure BAA signed (Microsoft HIPAA Business Associate Agreement)
- [ ] Vercel BAA signed (requires Enterprise plan with HIPAA add-on)
- [ ] Daily.co BAA signed (contact Daily.co sales for HIPAA agreement)
- [ ] Resend DPA reviewed (recommended even if not required)
- [ ] Sentry DPA reviewed (recommended even if not required)

---

## 6. Data Flow by Feature

### 6.1 AI Scribe (Audio → SOAP Note)

```
Browser Microphone
    │
    │ MediaRecorder API (WebM/OGG/WAV, max 25MB)
    │ CSP: microphone=(self)
    ▼
POST /api/ai/transcribe-and-generate [HTTPS/TLS]
    │
    ├─→ Rate limit check (20 req/min) ─→ Upstash Redis [HTTPS/TLS]
    │
    ├─→ Auth check (withAuth) ─→ Supabase Auth [HTTPS/TLS]
    │
    ├─→ Audio validation (size, MIME type)
    │
    ├─→ Azure Whisper [HTTPS/TLS]
    │   Input: audio file
    │   Output: transcript text
    │   Circuit breaker: 5 failures / 60s
    │   Timeout: 60s
    │
    ├─→ Azure GPT [HTTPS/TLS]
    │   Input: transcript + structured prompt
    │   Output: SOAP note (S/O/A/P sections)
    │   Circuit breaker: separate instance
    │   Timeout: 30s
    │
    ├─→ Billing code extraction (in-memory)
    │   Input: SOAP note text
    │   Output: CPT + ICD-10 codes
    │
    ├─→ Supabase INSERT clinical_notes [HTTPS/TLS]
    │   RLS: organization_id scoped
    │   Status: 'draft'
    │
    └─→ Audit log: NOTE_CREATE [HTTPS/TLS]
        Risk level: LOW
        PHI accessed: true
```

### 6.2 Patient Record Management

```
Browser Form Submission
    │
    ▼
POST /api/patients [HTTPS/TLS]
    │
    ├─→ Auth + org check (withAuth)
    │
    ├─→ Zod schema validation (PatientCreateSchema)
    │
    ├─→ PHI field encryption (AES-256-GCM)
    │   Fields: SSN, insurance_id, MRN, address, DOB, phone, email
    │   Implementation: src/lib/security/encryption.ts
    │
    ├─→ Supabase INSERT patients [HTTPS/TLS]
    │   RLS: organization_id = user's org
    │
    └─→ Audit log: PATIENT_CREATE
        Risk level: MEDIUM
        PHI accessed: true
```

### 6.3 Document Upload

```
Browser File Selection
    │
    │ File types: JPEG, PNG, WebP, PDF (max 5MB)
    ▼
POST /api/patients/[id]/documents [HTTPS/TLS]
    │
    ├─→ Auth + org boundary check
    │
    ├─→ File security validation (src/lib/security/file-security.ts)
    │   • MIME type verification
    │   • Magic byte validation
    │   • Filename sanitization
    │
    ├─→ Supabase Storage upload [HTTPS/TLS]
    │   Bucket: patient-documents
    │   Path: {org_id}/patients/{patient_id}/{sanitized_filename}
    │
    ├─→ Supabase INSERT patient_documents (metadata) [HTTPS/TLS]
    │
    └─→ Audit log: DOCUMENT_UPLOAD
        PHI accessed: true
```

### 6.4 Telehealth Session

```
Browser (Camera + Microphone)
    │
    │ WebRTC (DTLS/SRTP encrypted)
    ▼
Daily.co Infrastructure
    │
    │ Live audio/video (E2E encrypted via WebRTC)
    │ Session token tracked in telehealth_session_tokens table
    │ Expired tokens cleaned daily by /api/cron/cleanup-telehealth-tokens
    │
    ▼
No recording stored (unless explicitly enabled)
```

---

## 7. Network Boundary Summary

```
┌──────────────────────────────────────────────────────┐
│                   TRUST BOUNDARY                      │
│                                                       │
│  Browser ◄──HTTPS──► Vercel (app logic)               │
│                          │                            │
│              ┌───────────┼───────────┐                │
│              │           │           │                │
│              ▼           ▼           ▼                │
│         Azure OpenAI  Supabase   Upstash Redis        │
│         (BAA req'd)   (BAA req'd) (no PHI)           │
│                          │                            │
│                    ┌─────┴─────┐                      │
│                    │           │                      │
│                    ▼           ▼                      │
│              PostgreSQL   Storage                     │
│              (RLS+AES)   (signed URLs)                │
│                                                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Supporting services (no/minimal PHI):                │
│    Resend (email, no PHI)                             │
│    Sentry (errors, minimal PHI risk)                  │
│    Stripe (billing, no PHI)                           │
│    Daily.co (telehealth, BAA req'd)                   │
└──────────────────────────────────────────────────────┘
```

All connections between components use HTTPS/TLS 1.2+. No unencrypted data transmission occurs at any stage.

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-12 | Security & Compliance Team | Initial data flow diagram |
