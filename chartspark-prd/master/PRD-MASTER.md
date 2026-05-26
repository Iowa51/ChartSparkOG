# ChartSparkOG Parity Build — Master PRD

**Owner:** James Morrison, RedArk Ventures
**Status:** Active (v1.1, 2026-05-26)
**Goal:** Bring ChartSparkOG to feature parity with ICANotes+ in 90 days so behavioral health clinicians can switch with zero friction
**Audience:** Claude Code (CC), Antigravity (AG), Codex — and human engineers reviewing their output

---

## How to use this document

This PRD is the **single source of truth** for the entire 90-day build. Every AI agent (CC, AG, Codex) must read this file before any work. Mini-PRDs in `/features/*.md` are scoped tasks; this master is the constitution.

**Reading order for any AI agent starting a task:**
1. This file (PRINCIPLES, SECURITY, DEFINITIONS — sections 1–5)
2. The relevant mini-PRD in `/features/`
3. The relevant skill file in `/skills/` (the HOW)
4. Begin work

**If the PRD contradicts a verbal instruction, the PRD wins.** Push back to the human if the gap is large.

---

## 1. Vision & success criteria

### 1.1 Vision

ChartSparkOG becomes the obvious modern alternative to ICANotes+ for behavioral health practices that want: faster documentation, real AI (not bolt-on), modern security, and a unified patient experience.

### 1.2 Success criteria (90 days)

A clinician using ICANotes+ today can sit down at ChartSparkOG and:

- ✅ Find all 15 rating scales they use daily (PHQ-9, GAD-7, C-SSRS, etc.)
- ✅ Send a portal invite to a new patient and have them complete intake online before the first visit
- ✅ Schedule an appointment and have SMS + email reminders sent automatically
- ✅ Document an MSE in <2 minutes using the structured builder
- ✅ Create a treatment plan with Problem → Goal → Objective → Intervention structure
- ✅ Document a group therapy session in <5 minutes with individualized notes per attendee
- ✅ Submit a claim that passes the pre-submission scrubber and posts ERA automatically
- ✅ Co-sign a supervisee's note
- ✅ Upload a release-of-information document and attach it to the chart
- ✅ Use AI to draft a note that **does not invent clinical facts**
- ✅ Trust the system is secure enough to bet their license on

### 1.3 Non-goals (explicit out-of-scope)

- ❌ Residential/inpatient program support (eMAR, census/bed management) — ICANotes is weak here too; we don't compete in this segment
- ❌ ONC Cures Edition certification within 90 days — multi-month regulatory process; start in parallel as a separate project
- ❌ EPCS (controlled substance e-prescribing) — non-EPCS Surescripts in scope; EPCS comes after
- ❌ MIPS reporting — defer to post-90-day
- ❌ Non-English language support — defer
- ❌ Mobile native apps — web-responsive only

---

## 2. Cardinal principles (non-negotiable)

These principles override convenience, speed, or any agent's "I think we should refactor this" instinct.

### 2.1 Security is the first feature

Every line of code is reviewed against the OWASP Top 10 and HIPAA Security Rule before merge. No exceptions for "small fixes." A feature is not "done" until it passes the security gate in section 5.

### 2.2 Sidecar by default, OG-edit by exception

ChartSparkOG core (v1.0.0-pre-production) is treated as a sealed artifact except for **explicit edit windows** documented per feature. The sealed-artifact rule exists because that code passed 11 security sprints + 8 pentest sprints; modifying it without re-verification invalidates the audit.

**Default:** new feature → new sidecar repo at `C:\Users\joman\OneDrive\Desktop\chartspark-<feature>\`.

**Exception:** when a sidecar is mechanically impossible (e.g., cron must read OG appointments), the mini-PRD explicitly declares "OG-EDIT REQUIRED" with the file list, justification, and re-pentest scope.

### 2.3 Simple, maintainable code — no verbose code

Code is read 10x more than it's written. Optimize for the next developer reading this file 6 months from now (which may be Claude itself).

- Functions <50 lines (aim for <25)
- Files <300 lines (aim for <200)
- Cyclomatic complexity <10 per function
- No "clever" code — boring beats clever
- Self-documenting names; comments only for the *why*, never the *what*
- DRY within reason — don't abstract until you have 3 instances

### 2.4 Spec-driven, not vibe-driven

If it's not in the PRD, it doesn't get built. If the AI agent thinks something should be added, it asks first. If it's already in the PRD, it gets built exactly as specified — no creative reinterpretation.

### 2.5 Test before merge

Every feature ships with:
- Unit tests (Jest) for business logic
- Integration tests (Supertest) for API endpoints
- **RLS test** for every new table (mandatory — see skill `rls-testing`)
- E2E test (Playwright) for **critical user-facing flows** — any flow that writes PHI, processes billing, handles auth, or sends external communications (SMS/email/eRx). See `testing-patterns` skill for the full criteria.

Coverage target: ≥80% on new code. PRs with <80% are blocked.

### 2.6 No PHI in logs, ever

Logs may contain: request IDs, user IDs, org IDs, error codes, timestamps. Logs may NOT contain: patient names, DOBs, diagnoses, medication names, free-text clinical content, addresses, phone numbers, email addresses, or anything else that could re-identify a patient. Audit logs are the only structured PHI record and they live in `audit_log` with its own RLS policy.

### 2.7 Fail closed, never open

Auth checks, feature gates, RLS, MFA verification — if the check fails for any reason (DB unavailable, malformed input, transient error), default to **deny**. Never allow access on uncertainty.

---

## 3. Architecture principles

### 3.1 The sidecar pattern

Every new feature is a separate service with its own:
- Git repository (`RedArkventures/chartspark-<feature>`)
- Deployment (Vercel project or Azure Container App)
- Postgres role with **least-privilege** RLS policies
- Secrets vault entry (no cross-service secret sharing)
- Feature flag in OG (off by default)
- Kill switch (health endpoint + circuit breaker)

Sidecars communicate via:
- Shared Supabase database (read-only or scoped-write through dedicated role)
- HTTP/JSON between services (with `X-Request-ID` for tracing)
- Webhooks (signed with HMAC-SHA256)

Sidecars **do not**:
- Share secrets
- Modify each other's tables
- Modify ChartSparkOG tables outside their declared scope
- Bypass each other's auth

### 3.2 Database conventions

- All tables have `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- All tables have `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at` where mutation is expected
- All PHI tables have `org_id UUID NOT NULL REFERENCES organizations(id)` (multi-tenant scoping)
- All PHI tables have RLS enabled with org-scoped policies (USING + WITH CHECK both)
- Money is stored in **cents as INTEGER** (never NUMERIC or float)
- Timestamps are TIMESTAMPTZ (never TIMESTAMP without timezone)
- Soft-deletes use `deleted_at TIMESTAMPTZ NULL`, not boolean flags
- Foreign keys are explicit; ON DELETE behavior is documented

### 3.3 API conventions

- REST, not GraphQL (simpler, easier to audit)
- JSON request/response (Zod-validated input on every endpoint, no exceptions)
- Standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500, 503)
- Error responses: `{ error: { code: "STABLE_CODE", message: "human readable", requestId: "..." } }` — no stack traces, no internal details
- All endpoints require auth except: `/health`, `/api/auth/*`, public webhook receivers (with signature validation)
- Rate limits: 100 req/min per user on PHI routes, 10 req/min on auth routes
- All PHI routes require MFA-validated session

### 3.4 Frontend conventions

- Next.js 15 App Router only (no Pages Router in new code)
- TypeScript strict mode (no `any`, no `as` casts outside narrow exceptions)
- Tailwind CSS + shadcn/ui (no custom CSS files except global tokens)
- Server Components by default; Client Components only when interactivity demands it
- No client-side state managers (Zustand/Redux) for new features — server state + React state is enough
- Forms: React Hook Form + Zod resolver
- Loading states: Suspense boundaries with skeleton fallbacks
- Error boundaries on every route segment

### 3.5 Sidecar port assignments (locked)

Every sidecar has an assigned port. The Express bootstrap REQUIRES `PORT` to be set explicitly — there is no default, to prevent silent collisions during local development.

| Sidecar | Port (local + Vercel) | Track | Mini-PRD |
|---|---|---|---|
| `chartspark-assessments` | 3301 | A | PRD-01 |
| `chartspark-portal` | 3302 (Next.js dev default 3000 in repo but deploys at portal.chartspark.io) | B | PRD-02 |
| `chartspark-claims` | 3303 | D | PRD-10 |
| `chartspark-content` | 3304 | F | PRD-08 |
| `chartspark-scribe` | 3200 (existing) | H | PRD-13 |
| `chartspark-fhir-mcp` | 3100 (existing) | — | — |
| Reserved for future sidecars | 3305–3399 | — | — |

When you add a new sidecar, claim its port in this table via PRD amendment (bump master PRD version) before scaffolding.

---

## 4. Tech stack (locked)

These are not up for debate during the 90-day build. Changes require a PRD amendment.

| Layer | Tech | Why locked |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui | Matches existing OG stack |
| Backend | Next.js API routes (OG) + Node 20 Express sidecars | Matches existing |
| Database | Supabase Postgres (project `eepwbtdqtdnqxeznykbh`) | Already in use, audited |
| Auth | Supabase Auth + MFA via TOTP | Already in use |
| Storage | Supabase Storage | Already in use |
| Email | Resend (`noreply@chartspark.io`) | Already in use, BAA in place |
| SMS | Twilio (10DLC registered) | Industry standard, HIPAA BAA available |
| Payments | Stripe | Already in use |
| Video | Daily.co | Already in use, audited |
| AI | Azure OpenAI (GPT-4o, Whisper) + Anthropic API | BAA in place; Azure for clinical, Anthropic for safety |
| Telemetry | Sentry (PII scrubbing on) | Already in use |
| Hosting | Vercel (frontends) + Azure Container Apps (Python sidecars if any) | Already in use |
| Validation | Zod | Already in use |
| Testing | Jest + Supertest + Playwright | Industry standard |
| CI | GitHub Actions | Already in use |
| SAST | Snyk Code + ESLint security plugin | New — see security gate |
| Dependency scanning | Snyk Open Source + npm audit | New — see security gate |

---

## 5. Security gate (the merge bar)

A PR may not merge unless ALL of the following pass.

### 5.1 Automated checks (CI)

- [ ] `npm run lint` — ESLint with security plugin, zero errors
- [ ] `npm run typecheck` — TypeScript strict, zero errors
- [ ] `npm test` — Unit + integration tests, ≥80% coverage on new code
- [ ] `npm run test:rls` — RLS tests pass for every new table
- [ ] `npm audit --audit-level=high` — Zero high/critical vulnerabilities
- [ ] Snyk Code scan — Zero high/critical findings
- [ ] Snyk Open Source scan — Zero high/critical vulnerable dependencies
- [ ] `npm run test:e2e` (when applicable) — Playwright tests pass

### 5.2 Manual review checklist (human reviewer)

- [ ] All new tables have RLS enabled with USING + WITH CHECK policies
- [ ] All new API routes have Zod validation on input
- [ ] All new API routes have explicit auth check
- [ ] All new PHI access is audit-logged
- [ ] No PHI in logs (grep for common fields: name, dob, email, phone, ssn, diagnosis, medication)
- [ ] No secrets in code (run `git secrets --scan`)
- [ ] Error responses use stable codes, no stack traces leaked
- [ ] Rate limits applied to auth and PHI routes
- [ ] Feature flag added, defaults to OFF
- [ ] Kill switch documented
- [ ] OG-edit (if any) is within declared scope

### 5.3 Re-pentest trigger

The following changes require re-pentest before clinical release:
- Any modification to OG files in `src/lib/auth/*`, `src/lib/security/*`, `src/middleware.ts`
- Any new public API route on OG (non-sidecar)
- Any change to RLS policies on existing PHI tables
- Any new third-party vendor integration that touches PHI

Re-pentest is scheduled with Cobalt at week 13 (consolidated).

---

## 6. The 15 features (mini-PRD index)

| # | Feature | Mini-PRD | Track | Sidecar/OG | Weeks |
|---|---|---|---|---|---|
| 01 | Rating Scales Library | `features/01-rating-scales.md` | A | Sidecar | 1–3 |
| 02 | Patient Portal v1 | `features/02-patient-portal.md` | B | Sidecar | 1–5 |
| 03 | SMS + Email Reminders | `features/03-reminders.md` | C | OG-edit | 2–4 |
| 04 | MSE Builder | `features/04-mse-builder.md` | E | Sidecar component | 9 |
| 05 | Structured Treatment Plan | `features/05-treatment-plan.md` | E | OG-edit | 9 |
| 06 | Safety Plan + Suicide Risk | `features/06-safety-plan.md` | E | Sidecar + portal | 10 |
| 07 | Group Therapy Workflow | `features/07-group-therapy.md` | E | OG-edit | 10 |
| 08 | Click-to-Chart Builder | `features/08-content-engine.md` | F | Sidecar | 11 |
| 09 | E-Prescribing (Surescripts) | `features/09-eprescribing.md` | G | OG-edit + vendor | 12 (prep w4+) |
| 10 | Claim Scrubber + ERA Auto-Post | `features/10-claims.md` | D | Sidecar | 5–8 |
| 11 | Document Management | `features/11-documents.md` | E | OG-edit + storage | 11 |
| 12 | Co-Signature Workflow | `features/12-cosignature.md` | E | OG-edit | 12 |
| 13 | AI Readability + Ambient Scribe | `features/13-ai-scribe.md` | H | Existing sidecar extension | 10–12 |
| 14 | Security as a Feature | `features/14-security-marketing.md` | I | Marketing | 12 |
| 15 | Practice Suite Bundle | `features/15-practice-suite.md` | I | Webhook integration | 12 |

---

## 7. Definitions (glossary)

| Term | Definition |
|---|---|
| **OG** | ChartSparkOG, the audited production codebase at `Iowa51/ChartSparkOG` |
| **Sidecar** | Independent service in its own repo, communicating with OG only via Supabase or HTTP |
| **OG-edit** | An explicit, documented modification to OG code; requires re-pentest |
| **PHI** | Protected Health Information per HIPAA Privacy Rule |
| **RLS** | Row-Level Security (Postgres policy that filters rows by user identity) |
| **MFA** | Multi-Factor Authentication (TOTP) |
| **BAA** | Business Associate Agreement (HIPAA contract with vendors handling PHI) |
| **EPCS** | Electronic Prescribing of Controlled Substances (DEA-regulated) |
| **PDMP** | Prescription Drug Monitoring Program (state databases) |
| **ERA** | Electronic Remittance Advice (835 file from payer with payment details) |
| **C-SSRS** | Columbia Suicide Severity Rating Scale |
| **MSE** | Mental Status Examination |
| **ASAM** | American Society of Addiction Medicine (criteria for SUD treatment) |
| **42 CFR Part 2** | Federal regulation on substance use treatment confidentiality |
| **CPT** | Current Procedural Terminology (billing codes) |
| **POS** | Place of Service (billing code modifier) |

---

## 8. Working agreements (humans + AI)

### 8.1 For James (human)

- You review every PR before merge. No exceptions.
- You hold the Twilio/Stripe/Surescripts vendor decisions; AI does not sign contracts.
- You decide when to lift the OG freeze for a planned edit window.
- You schedule the Cobalt re-pentest at week 13.

### 8.2 For Claude Code (CC), Antigravity (AG), Codex

- Read this PRD first. Then read the relevant mini-PRD. Then read the relevant skill.
- If the PRD doesn't say to build something, don't build it. Ask.
- If you find a security issue in OG while working, **stop and report**. Do not "fix while you're there."
- If you can't complete a feature inside the declared scope, stop and report. Do not expand scope unilaterally.
- All commits use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `security:`)
- All PRs reference the mini-PRD by feature number (e.g., "feat(01): scoring engine for PHQ-9")
- All PRs include the security gate checklist in the description

### 8.3 Communication

- AI agents do not modify the PRD. Only James can amend it.
- If the PRD has an error or ambiguity, the AI reports it and waits for clarification.
- Mini-PRD updates require version bump (e.g., `v1.1`) and changelog entry.

---

## 9. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OG-edit invalidates security audit | High | Critical | Sidecar-by-default; declared edit windows; re-pentest at wk 13 |
| Twilio 10DLC registration delays SMS launch | Medium | Medium | Start registration week 1 even though build is week 2 |
| Surescripts onboarding >90 days | High | High | Start vendor conversation week 4; e-prescribing is "prep done" by week 12, not "live" |
| AI scribe regression on hallucination | Medium | Critical | Mandatory grounding test in CI; clinical fact extraction must match input fact extraction |
| Patient portal subdomain DNS issues | Low | Medium | DNS setup week 1; verify with both IPv4 and IPv6 |
| Anchor Point pilot reveals workflow gaps | High | Medium | 2-week supervised pilot in weeks 11–12 with daily standups |
| Cobalt scheduling slips past week 13 | Medium | High | Book week 13 slot in week 1; have backup vendor (HackerOne) on standby |

---

## 10. Changelog

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-05-25 | v1.0 | Initial PRD | James + Claude |
| 2026-05-26 | v1.1 | Verification-round fixes: added §3.5 port assignments; tightened §2.5 E2E criteria. Skills updated: sidecar-scaffolding (Step 9 expanded with sidecar Postgres role + audit_log GRANT, removed hardcoded port default), api-endpoints (runtime-specific helper layouts, named the `@/lib/auth` barrel), rls-testing (clarified service role keys, prose aligned to 5 tests), testing-patterns (path alignment with PRD-01, E2E criteria made explicit). PRD-01 updated: clarified screening_scores is legacy (replaced by new tables), explicit port 3301, TODO on CHECK constraint. | James + Claude |
