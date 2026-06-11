# STATE — Living Document
_Last updated: 2026-06-10_

## Current state
Live project, ~25–30% production-usable day-one parity (2026-06-10 audit; the earlier 35–40% was an uncorrected self-estimate). Assessments v1 is DONE and LIVE end-to-end on app.chartspark.io. Tier 0 (AI note hallucination) is RESOLVED — fixed 2026-04-18..21, verified; AI drafting is unblocked.

## Where the repo is right now
- ChartSparkOG on `main` at `4084191`, clean tree. `main` is the authoritative trunk; Vercel Production tracks it.
- Repos moved out of OneDrive: OG at `C:\dev\ChartSparkOG`, sidecar at `C:\dev\chartspark-assessments`.
- Sidecar deployed on Railway: https://chartspark-assessments-production.up.railway.app (/health 200).

## Done
- [x] ICANotes feature map + gap analysis
- [x] PRD-MASTER.md (v1.4) + mini-PRDs + skills
- [x] Parity infrastructure (verify-first + audit gate)
- [x] pack-01 (verify → reconcile → entitlements → Tier 6 restore)
- [x] Assessments v1 live: sidecar deployed, all 8 contract mismatches resolved, clinical-safety review PASSED, ASSESSMENTS_V1 granted to testers

## Order of operations
pack-01 complete. pack-02 (Tier 0 fix) is moot — Tier 0 was already fixed 2026-04-18..21; the blocker marker was stale. Next: right-60% packs in 2026-06-10 audit priority order — patient portal (PRD-02), group therapy (PRD-07), MSE builder (PRD-04), co-signature (PRD-12), reminders (PRD-03), e-prescribe non-transmitting shell (PRD-09), template library stub (PRD-08), treatment-plan persistence (PRD-05).

## Designated working branch
`main` is trunk; short-lived feature branches off `main`. CC commits, James pushes.

## Running log
- 2026-05-31 — Parity infrastructure rebuilt; 9-agent review suite wired in as a milestone gate.
- 2026-06-10 — Assessments v1 LIVE end-to-end (Railway sidecar + AssessmentsTab on app.chartspark.io); clinical-safety review PASSED (895+ sidecar tests green); verified live (PHQ-9, HAM-D, C-SSRS); ASSESSMENTS_V1 granted to testers, tester brief delivered. Prod RLS policies `sidecar_self_user`/`sidecar_org_patients` recorded as migration `20260610230000_sidecar_rls_patient_access.sql` (record only — already live). Tier 0 marker corrected to RESOLVED (fixed 2026-04-18..21). Parity self-estimate corrected to ~25–30% per audit. Known v1 gaps: trend chart UI, assignment-creation UI (backends complete).
