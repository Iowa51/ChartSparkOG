# FEATURE-STATUS — Built vs blocked vs remaining (Living Document)
> Parity ≈ 35–40% of ICANotes today. (Phase A verifies before we trust this.)

## ✅ Built — trust (Phase A verifies)
- Modern EHR shell (Dashboard, Patients, Encounters, Notes, Templates, References, Billing, Admin).
- **Tebra UI redesign** — lives on `main`, NOT `develop` (why testing on develop showed old UI).
- Security: 11 sprints, 8 pentests, fresh audit, BAAs.
- agent-orchestrator: Phase 1 scaffold, P2 Documentation Agent (112 tests), P3 Billing Agent (195), P3.5 DB-driven CPT (216).
- chartspark-assessments: scale projection endpoint + shared-secret auth (PR #1, 884/884 tests).

## ⏸ In flight — BLOCKED
- **AssessmentsTab (Tier 6)** — 21 deliverables done in code (189/189 tests), shows "Feature Locked": `features`/`user_features` missing in prod. Partial work in `stash@{0}` on `develop`.

## 🚫 Tier 0 — overrides everything
- AI note generator hallucinates meds/dosages/ICD-10. No AI ships before the fix.

## ⬜ Remaining — the "right 60%" (priority order)
1. Top 15 rating scales (finish, once unlocked)
2. Patient portal v1 (intake, messaging, scheduling, payments)
3. SMS + email reminders
4. MSE builder + safety plan + structured treatment plan
5. Group therapy workflow
6. E-prescribing (non-EPCS / Surescripts)
7. Claim scrubber + ERA auto-posting (chartspark-claims sidecar)
8. Document management
9. AI scribe done right (gated by Tier 0)
10. Menu-driven note builder library

## ⬜ Finish agent-orchestrator
P4 Quality Agent · P5 OG integration · P6 Railway · P7 merge + clinical testing.

## ★ Tier 4 — "better than ICANotes" (after the 60%)
AI readability enhancer · AI scribe done right · modern UI · open API/FHIR · security-as-marketing · FrontDesk AI integration · ChartSpark Mental AI bundle.
