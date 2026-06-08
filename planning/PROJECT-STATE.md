# ChartSparkOG — Assessments Project State
_Single source of truth for resuming this work. Read this first after any break._

## Repos & key identifiers
- OG (EHR): C:\dev\ChartSparkOG — GitHub Iowa51/ChartSparkOG — main @ ce2903f — DEPLOYED to app.chartspark.io (Vercel project chart-spark-og, team james-projects-babdc0fc; Production tracks main). gh auth: Iowa51.
- Sidecar (assessments service): C:\dev\chartspark-assessments — GitHub RedArkventures/chartspark-assessments — main @ 500da42 — NOT deployed yet. gh auth: RedArkventures. Express 5 / TS, port 3301, 15 scales, suicide-risk flagging.
- Prod DB: Supabase eepwbtdqtdnqxeznykbh (shared by OG + sidecar; sidecar connects as least-privilege role sidecar_assessments). Deprecated / never use: locfqctrmbfwsfmcmhbc.

## Entitlement (live in prod)
- features / user_features tables exist in eepwbtdqtdnqxeznykbh.
- ASSESSMENTS_V1 seeded; granted to jomanwa@gmail.com (user id 170db033-5710-443a-903f-799b6d9ef1ca). No other users granted yet.

## DONE (OG side — all live)
- Trunk consolidated, Tier 6 AssessmentsTab restored, OG<->sidecar contract reconciled (#1-#6 + #8). main @ ce2903f, deployed.
- Tab is gated to jomanwa and returns a safe 503 (fail-closed) until the sidecar is deployed. Safety UX verified: suicide-risk flag shows on the collapsed list.

## CURRENT POSITION
- Sidecar lap, Step 1 (prep). Sidecar repo at 500da42, clean tree.

## REMAINING (to finish completely)
1. Sidecar prep: #7 hamd17->hamd registry fix (match prod CHECK) + tests + Railway deploy readiness. Branch fix/sidecar-deploy-prep.
2. Push sidecar (gh auth switch --user RedArkventures) + create Railway service from the repo.
3. Env wiring:
   - Railway (sidecar): SUPABASE_URL, SIDECAR_POSTGRES_URL (sidecar_assessments role -- from local .env or rotate password), SUPABASE_SERVICE_ROLE_KEY_SIDECAR, ASSESSMENTS_SIDECAR_SECRET (generate), PORT (Railway injects).
   - Vercel (OG prod): ASSESSMENTS_SIDECAR_URL = Railway URL; ASSESSMENTS_SIDECAR_SECRET = same value as sidecar. Then redeploy OG.
4. Smoke-test through OG as jomanwa: administer + complete a PHQ-9, see score, verify suicide-risk flag path.
5. Clinical-safety review suite over the sidecar (scoring goes live) -> then grant testers ASSESSMENTS_V1.

## Method reminders
- One pack at a time; CC commits, James pushes; default ask-per-action for prod writes; xhigh effort (ultracode for the Step 5 review).
- gh auth switch before every push: Iowa51 = OG, RedArkventures = sidecar.
- Contract decision: OG conforms to the sidecar (no shim). Field-level detail in planning/ASSESSMENTS-CONTRACT.md.
