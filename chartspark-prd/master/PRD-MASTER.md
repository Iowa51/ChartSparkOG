# ChartSparkOG Parity Build — Master PRD

**Owner:** James Morrison, RedArk Ventures
**Status:** Active (v1.4, 2026-05-28)
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

Logs may contain: request IDs, user IDs, org IDs, error codes, timestamps. Logs may NOT contain: patient names, DOBs, diagnoses, medication names, free-text clinical content, addresses, phone numbers, email addresses, or anything else that could re-identify a patient. Audit logs are the only structured PHI record and they live in `audit_logs` with its own RLS policy.

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
- **NEW PHI tables** (sidecar-owned: `assessment_*`, future sidecar tables) use `org_id UUID NOT NULL REFERENCES organizations(id)` for multi-tenant scoping.
- **OG-side tables** (`organizations`, `users`, `patients`, other pre-existing PHI tables) use `organization_id`. Cross-table queries must use the correct column name per table. Mixing them silently returns the wrong rows; reviewers must check.
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

### 3.6 Dependency version policy

**We do not pin npm major versions.** New sidecars install latest stable for `typescript`, `express`, `jest`, ESLint, `ts-jest`, and related toolchain packages. When a toolchain default changes between major versions (e.g., TS 6.x flipping `verbatimModuleSyntax` to true), the right response is to update the skills (the canonical templates) — not to roll dependencies backward.

**Drift is logged, not avoided.** Every sidecar's `package.json` lockfile is the source of truth for what it actually runs. When a new sidecar scaffolds against a newer toolchain and surfaces a difference from the skill template, the difference gets captured in the next PRD minor version (e.g., v1.1 → v1.2). This is how skill-drift fixes get folded back in.

**Exceptions:** Two cases force pinning:
1. A vendor SDK with a documented BAA-version pairing (e.g., if Anthropic ships a major SDK bump that hasn't been re-BAA'd, stay on the previous major)
2. A toolchain version known to be incompatible with our deployment target (Vercel, Azure)

Outside those, leave dependencies unpinned (`^x.y.z`) and let lockfiles record the resolution.

### 3.7 Out-of-band context vs response data

**Response data** is what the patient or clinician answers — the clinical-instrument input. It has a stable shape per scale (Likert integers, Yes/No booleans, structured timeframes). Response data lives in the typed `Responses` parameter and in the `responses JSONB` column.

**Out-of-band context** is anything the scoring or narrative function needs that is NOT part of the clinical-instrument input — patient demographics (sex for AUDIT-C, age for HAM-D pediatric variants), clinician identity, time-of-day, etc.

**Never fold out-of-band context into the response shape.** That conflates clinical input with patient metadata and pollutes the data model:
- The `Responses` type stays clean (instrument data only)
- The Supabase `responses JSONB` column doesn't accidentally store PHI demographics under a clinical-data field name
- Audit log entries describing "the responses for assessment X" don't surprisingly include the patient's sex
- Future scales can adopt the pattern without re-litigating the same architectural choice

**Pattern for context-aware scoring (per `01-rating-scales.md`):**
```typescript
// Rich function — direct clinical callers pass context
export function scoreAuditC(responses: Responses, context?: AuditCContext): ScoringResult

// Scale wrapper — framework dispatch defaults to conservative posture
export const auditc: Scale = {
  scoringFn: (responses) => scoreAuditC(responses, undefined),
  ...
}
```

When the context is unknown, the wrapper applies the **conservative-default** — the choice that is safe to over-flag rather than miss. Same pattern as fail-closed auth.

### 3.8 Refuse to claim without data

When a clinical assertion requires input you don't have, the safe answer is to **not make the assertion** — return null, omit the flag, surface "thresholds not applied" in the narrative. Default to a defensible label only when the default is genuinely safer than silence.

Example: AUDIT-C's severe-use indicator threshold differs by sex (7+ men, 5+ women). When sex is unknown, the scoring engine returns `null` from `severeThreshold()` and refuses to emit any severe-use flag. The positive-screen flag still fires (using the conservative threshold of 3), but the more specific severity label requires data we don't have, so we don't claim it.

This is the difference between "I don't know" (safe) and "I'll guess and might be wrong" (clinically dangerous). Code that processes clinical decisions defaults to the former.

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

#### Reduced stop-and-ask threshold for skill-drift fixes

After a session has caught and stopped on its first few skill-drift issues in a task, the human reviewer may reduce the stop-and-ask threshold for the rest of that task. Under the reduced threshold, the session may **autonomously apply** fixes that meet ALL of these criteria:

1. The fix is a **tsconfig, ESLint, or `package.json` change** (config-only, no `src/` source code)
2. The fix is **necessary to make the test scaffold or build function** (not a quality-of-life improvement)
3. The fix has **no production-build impact** (base `tsconfig.json` unchanged, no new runtime dependencies, no security-relevant change)
4. The fix fits an **already-established drift pattern** named in this PRD or its skills (e.g., "TS 6.x default conflicts with our chosen architecture")

Stop-and-ask **always** applies to:
- Anything that touches `src/` source code outside the explicit feature spec
- Any new dependency (runtime or dev)
- Any change to base `tsconfig.json`, `.eslintrc.json` rules (beyond documented exceptions), or production scripts
- Any new security-plugin disable beyond patterns already approved in `security-first.md`
- Any deviation from the mini-PRD's spec
- **BREAKING changes** to shared types like `Scale` — removing fields, changing required field types, adding required fields that existing consumers don't supply
- Any clinical-decision-boundary question — risk classifications, severity thresholds, item interpretations, public-domain attributions
- Anything the session is not certain matches the human's intent

**Backward-compatible extensions** to shared types are permitted as additions (do NOT require stop-and-ask). These include:
- Adding a generic parameter WITH A DEFAULT (e.g., `Scale<R = Responses>` so `phq9: Scale` keeps inferring `Scale<Responses>`)
- Adding OPTIONAL fields (`field?: Type`)
- Adding new named exports alongside existing ones
- Adding new type declarations that don't replace existing ones

If you're unsure whether a change is backward-compatible, treat it as breaking and stop.

Each autonomously-applied fix must surface in the task close-out as a one-liner receipt: `Autonomously applied: <change> — reason: <pattern>`. The human reviewer can roll the receipt into the PRD on the next patch.

This reduced threshold is per-task, not standing. The default is full stop-and-ask. The human reviewer must explicitly invoke the reduced threshold each time.

#### Close-out contract (mandatory, every Day)

Every Day-N task ends with a close-out that includes ALL of the following, regardless of how clean the work was:

1. **Full contents of every source file created or modified.** Pasted verbatim, not summarized.
2. **Full contents of every test file created or modified.** Pasted verbatim.
3. **Verbatim output of `npm run lint`** (or the equivalent linter command).
4. **Verbatim output of `npm run typecheck`** (or the equivalent type-checker command).
5. **Verbatim output of `npm test`** including the coverage report table.
6. **Receipts list** — every autonomously-applied fix with a one-line reason. If none, state "Autonomous fixes applied: None."
7. **State summary** — which commits exist locally, whether anything was pushed, what's blocked or pending.

The temptation to skip the close-out on "clean" Days must be resisted. Clean Days deserve clean close-outs. The review layer cannot approve a push without seeing the artifacts; condensing the close-out to a summary makes the review impossible and breaks the merge gate's integrity.

If the close-out is large (long source files, large test suites), paste the file contents in full anyway. Token cost is not a reason to skip; the review is the merge gate.

If the close-out reveals missing deliverables on first send, the session must paste them on the next send without defensiveness — process correction is part of the contract.

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
| 2026-05-26 | v1.2 | Day-1/Day-2 scaffold-drift fixes (chartspark-assessments). Master PRD: added §3.6 dependency version policy (no major pinning, drift goes into next PRD minor); §8.2 reduced stop-and-ask threshold for skill-drift fixes documented. Skills updated: sidecar-scaffolding (Step 3 +`@types/cors` and TS 6.x default note; Step 4 expanded tsconfig with `verbatimModuleSyntax: false` + `include: ["src/**/*"]` + `types: []` rationale; Step 5 ESLint config rewritten with `recommended-legacy` plugin name, `argsIgnorePattern`/`varsIgnorePattern: "^_"` for Express 4-arg error middleware, `"log"` added to no-console allowlist, full framework-dispatch disable pattern documented; Step 8 rewritten with `tsconfig.test.json` template, per-path coverage threshold with TODO+RULE comments, ts-jest transform config). security-first: new section on `detect-object-injection` framework-dispatch pattern with 3-condition criteria and comment template. testing-patterns: new section on `noUncheckedIndexedAccess` defensive-fallback pattern with `istanbul ignore next` template. | James + Claude |
| 2026-05-26 | v1.3 | Week-1 build lessons from chartspark-assessments Days 3-6 (C-SSRS, AUDIT-C, CAGE). Master PRD: §3.7 out-of-band-context-vs-response-data principle (demographics never folded into response shape); §3.8 refuse-to-claim-without-data principle (return null when a clinical assertion needs data you don't have); §8.2 widened backward-compatible-extensions rule (generic params with defaults + optional fields permitted as additions; breaking changes still STOP); §8.2 close-out contract made mandatory and explicit (full source, tests, verbatim check outputs, every Day, no skipping on "clean" Days). PRD-01: new "Established patterns" section codifying Scale<R> generics, context-aware scoring with conservative-default wrappers, refuse-to-claim, istanbul-ignore template, stable "Clinically indicated:" / "thresholds not applied" narrative markers, POSITIVE_THRESHOLD-style named constants, public-domain attribution requirement. Skills updated: testing-patterns (clinical-logic stop-and-ask as a good pattern, exhaustive flag-trigger boundary tests with AUDIT-C as canonical example); security-first (defense-in-depth at classifier boundaries — clinical decision functions guard their inputs even when upstream validation should make them unreachable). | James + Claude |
| 2026-05-28 | v1.4 | Production audit-write contract codification + reconnaissance-first protocol + Supabase default-grant lesson. Master PRD: §3.2 amended to distinguish NEW/sidecar `org_id` from OG-side `organization_id` (cross-table query footgun named); §2.6 audit-log table name corrected to plural `audit_logs`. Skills updated: sidecar-scaffolding (Step 9 rewritten — `write_audit_log` SECURITY DEFINER chokepoint, defense-in-depth REVOKE-then-GRANT, function signature reference, `writeAuditLog(client, {...})` calling pattern, read-audit footnote, Supabase default-grant warning, Windows migration encoding footnote; Step 6 — eager-warmup wiring `auth.warmup()` before `app.listen`); api-endpoints (Layer 3 amended for MFA opt-out; new `## Layer 3 — MFA: configurable per route` subsection; new `## Read-path pattern: SELECT + audit in one transaction` section with `### What goes inside the transaction (and what doesn't)` subsection codifying the scoring-outside-transaction principle; new `## List endpoints: optional filters use IS NULL OR` section; both POST examples rewritten to `withTransaction + writeAuditLog`; helper-tree annotations corrected to `audit_logs via write_audit_log RPC`); using-skills (new `### Step 0 — Reconnaissance before any task` ritual codifying the pwd/git remote/git branch/git log/gh auth status sequence as cardinal pre-flight); og-edit-protocol (cross-link to using-skills Step 0 at top of 9-step protocol; cross-link to security-first Supabase default-grant pattern at end of Step 6); security-first (new `### 10. Supabase default function privileges (explicit REVOKE)` item — heading bumped Big 9 → Big 10; §4 audit-logging example rewritten to `writeAuditLog` inside `withTransaction`; pre-merge checklist gains conditional SECURITY DEFINER REVOKE box). README updated to reference Big 10. | James + Claude |
