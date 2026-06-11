# ChartSparkOG — Assessments Project State
_Single source of truth for resuming this work. Read this first after any break._

## Repos & key identifiers
- OG (EHR): C:\dev\ChartSparkOG — GitHub Iowa51/ChartSparkOG — main @ 4084191 — DEPLOYED to app.chartspark.io (Vercel project chart-spark-og, team james-projects-babdc0fc; Production tracks main). gh auth: Iowa51.
- Sidecar (assessments service): C:\dev\chartspark-assessments — GitHub RedArkventures/chartspark-assessments — DEPLOYED on Railway: https://chartspark-assessments-production.up.railway.app (/health 200). gh auth: RedArkventures. Express 5 / TS, port 3301, 15 scales, suicide-risk flagging.
- Prod DB: Supabase eepwbtdqtdnqxeznykbh (shared by OG + sidecar; sidecar connects as least-privilege role sidecar_assessments). Deprecated / never use: locfqctrmbfwsfmcmhbc.

## Entitlement (live in prod)
- features / user_features tables exist in eepwbtdqtdnqxeznykbh.
- ASSESSMENTS_V1 granted to jomanwa@gmail.com (user id 170db033-5710-443a-903f-799b6d9ef1ca) and to testers (2026-06-10). Tester brief delivered.

## DONE — Assessments v1 SHIPPED/LIVE (2026-06-10)
- Trunk consolidated, Tier 6 AssessmentsTab restored. OG main @ 4084191, deployed.
- All 8 OG<->sidecar contract mismatches resolved.
- Sidecar deployed on Railway; JWKS warmup fixed (correct endpoint /auth/v1/.well-known/jwks.json).
- Vercel prod env wired: ASSESSMENTS_SIDECAR_URL + ASSESSMENTS_SIDECAR_SECRET.
- AssessmentsTab live end-to-end on app.chartspark.io.
- Prod RLS for sidecar reads: sidecar_self_user (public.users) + sidecar_org_patients (public.patients), applied manually 2026-06-09; recorded as supabase/migrations/20260610230000_sidecar_rls_patient_access.sql (record only — never replay).
- Detail expand implemented (flags + narrative); client safety-flag pattern fixed to mirror isSafetyRelevantFlag.
- Clinical-safety review PASSED: blocking C-SSRS moderate/low narrative finding fixed; C-SSRS answered-requires-period validation hardened on both sides; 895+ sidecar tests green.
- Verified live: PHQ-9 12/moderate + flag; HAM-D 21/severe; C-SSRS high 3 and moderate 2 with action narrative.

## CURRENT POSITION
- Assessments v1 DONE/LIVE. No blockers.

## REMAINING (known v1 gaps — backends complete, UI missing)
1. Trend chart UI.
2. Assignment-creation UI.

## Method reminders
- One pack at a time; CC commits, James pushes; default ask-per-action for prod writes; xhigh effort (ultracode for review suites).
- gh auth switch before every push: Iowa51 = OG, RedArkventures = sidecar.
- Contract decision: OG conforms to the sidecar (no shim). Field-level detail in planning/ASSESSMENTS-CONTRACT.md.
