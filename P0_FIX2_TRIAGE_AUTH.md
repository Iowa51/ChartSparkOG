# P0_FIX2_TRIAGE_AUTH.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

Two smart-triage routes accept a caller-supplied patient_id and read PHI (medications, problems, allergies, demographics) without any explicit org scoping or canAccessPatient check. Tenant isolation depends entirely on RLS. If RLS is misconfigured on any of the underlying tables, cross-org PHI leaks into AI prompts.

Affected routes:
- src/app/api/ai/smart-triage/medication-review/route.ts (lines ~62-83)
- src/app/api/ai/smart-triage/prescribing-check/route.ts (lines ~39-50)

The chart-summary route already does this correctly — use it as a reference.

## Fix

### Step 1: Read the reference implementation

Read src/app/api/ai/smart-triage/chart-summary/route.ts to see how it enforces org/patient access. It likely uses canAccessPatient or an explicit organization_id filter.

### Step 2: Fix medication-review

In src/app/api/ai/smart-triage/medication-review/route.ts:

1. Before any data fetching, add canAccessPatient(context.user, patient_id) check. Import it from wherever chart-summary imports it (likely @/lib/auth/api-auth).
2. If canAccessPatient returns false, return 403 or 404 with no PHI in the response body.
3. On every subsequent Supabase query that reads patient data (patients, patient_medications, patient_problems, patient_allergies), add an explicit .eq('organization_id', context.user.organizationId) filter.

### Step 3: Fix prescribing-check

Same fix in src/app/api/ai/smart-triage/prescribing-check/route.ts:

1. Add canAccessPatient check before data fetching
2. Return 403/404 on failure with no PHI
3. Add explicit organization_id filter on all patient data queries

### Step 4: Verify no other smart-triage routes are missing auth

List all files under src/app/api/ai/smart-triage/. For each one, check if it has canAccessPatient or org scoping. Report any others that are missing it.

## Important

- Match the exact pattern used in chart-summary — do not invent a new pattern
- The response on auth failure must NOT contain any patient data
- Do not change the happy-path behavior or response shape

## After

npm run build. Commit:
git add -A
git commit -m "fix: P0 add canAccessPatient and org scoping to smart-triage medication-review and prescribing-check" --no-verify

Report: files changed, what pattern was copied from chart-summary, any other routes found missing auth, SHA.