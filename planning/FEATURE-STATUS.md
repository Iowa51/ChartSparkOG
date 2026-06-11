# FEATURE-STATUS — Built vs blocked vs remaining (Living Document)
> Parity ≈ 25–30% production-usable day-one (2026-06-10 audit; the earlier 35–40% claim was an uncorrected self-estimate).

## ✅ Built — trust
- Modern EHR shell (Dashboard, Patients, Encounters, Notes, Templates, References, Billing, Admin).
- **Tebra UI redesign** — on `main` (trunk consolidated).
- Security: 11 sprints, 8 pentests, fresh audit, BAAs.
- agent-orchestrator: Phase 1 scaffold, P2 Documentation Agent (112 tests), P3 Billing Agent (195), P3.5 DB-driven CPT (216).
- **Assessments v1 — DONE/LIVE (2026-06-10).** Sidecar deployed on Railway (/health 200); all 8 contract mismatches resolved; AssessmentsTab live end-to-end on app.chartspark.io; detail expand (flags + narrative) shipped; clinical-safety review PASSED (895+ sidecar tests green); verified live (PHQ-9 12/moderate + flag, HAM-D 21/severe, C-SSRS high 3 / moderate 2 with action narrative); ASSESSMENTS_V1 granted to testers. Known v1 gaps: trend chart UI, assignment-creation UI (backends complete).

## ⏸ In flight — BLOCKED
- (none)

## ✅ Tier 0 — RESOLVED (2026-04-18..21)
- AI note-generation hallucination was FIXED 2026-04-18..21 (commits 9181838, 1c25bc8, c3e30e4, 8654ec4 prompt grounding + 5d65e78, ed0a35e patient-context integration), verified in runtime testing. ICD-10 rebuilt as a grounded pipeline (active-problem + dictation-match badges, persistence fix). AI drafting is unblocked. (Marker was stale until 2026-06-10.)

## ⬜ Remaining — top gaps post-assessments (2026-06-10 audit, priority order)
1. Patient portal (PRD-02)
2. Group therapy (PRD-07)
3. MSE builder (PRD-04)
4. Co-signature (PRD-12)
5. SMS + email reminders (PRD-03)
6. E-prescribe non-transmitting shell (PRD-09)
7. Template library stub (PRD-08)
8. Treatment-plan persistence (PRD-05)

Also remaining (lower priority): claim scrubber + ERA auto-posting (chartspark-claims sidecar) · document management · AI scribe done right (now unblocked) · menu-driven note builder library.

## ⬜ Finish agent-orchestrator
P4 Quality Agent · P5 OG integration · P6 Railway · P7 merge + clinical testing.

## ★ Tier 4 — "better than ICANotes" (after the 60%)
AI readability enhancer · AI scribe done right · modern UI · open API/FHIR · security-as-marketing · FrontDesk AI integration · ChartSpark Mental AI bundle.
