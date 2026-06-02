# OPEN QUESTIONS
Unresolved. Builder must NOT improvise. **BLOCKER** items gate the build.

- [ ] **BLOCKER** — After Phase A, confirm the reconciliation plan (main as trunk, port develop's 5 commits). Proceed only if the report matches; if it contradicts, stop and revise.
- [ ] Which branch is the current **deploy source** (Vercel)? Should point at the trunk.
- [ ] Confirm the canonical **15 rating scales** list with the clinical lead.
- [ ] Claim scrubber clearinghouse (Stedi recommended) — defer to that pack.
- [x] Production Supabase confirmed: **`eepwbtdqtdnqxeznykbh`** ("ChartSparkProduction"), not `locfqctrmbfwsfmcmhbc`. Resolved via PRD §4 + `.env.local` + CLI link — see Decision #11.
- [ ] Are the **review-suite agent prompt files** present in `review-suite/quality/` and `review-suite/security/`? Needed before the first milestone gate.

## Review-gate follow-ups (PR #4, 9-agent suite — tracked, not yet implemented)
- [ ] **IF-4 (important)** — Agent queue reads/writes service-role-only tables (`quality_reviews`/agent tables) directly from the **browser client**, so RLS blocks it and the feature is effectively dead. Location: `src/app/(admin)/admin/auditor-notes/page.tsx:136-233`; `supabase/migrations/20260413120000_agent_tables.sql:132-138`. Fix direction: route these reads/writes through a server endpoint using the service role (or add scoped RLS policies for the admin role).
- [ ] **IF-5 (important)** — Clinical/billing mutations (approve, request-revision, code-override) **bypass the server API boundary** via direct client writes, with no server-side authz/audit. Location: `src/app/(admin)/admin/auditor-notes/page.tsx:167-233`. Fix direction: move these writes behind authenticated server routes with audit logging.
- [ ] **IF-6 (important)** — New PHI/authz route, the subscription gate, and the SOAP-note regex parser **ship with zero tests**. Location: `src/app/api/agent/complete-session/route.ts`; `src/lib/agent/subscription-gate.ts`. Fix direction: add route tests for the authz branches + fallback (reuse the existing `withAuth`/`createClient` mock pattern), and unit-test `getAgentMode` and the SOAP parser.
