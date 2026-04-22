# ChartSparkOG Verification Report

Verification run on `2026-04-16` against local `main` at `3bdf62c6e4edda851a9a61138ca2704909c31bf3` (`3bdf62c`).

Limits of this verification:
- `CODEX_PROMPT.md` was not present in the repo root. I used `AUDIT_PROMPT.md`, which appears to be the intended instruction file.
- Live HTTPS fetches to `https://app.chartspark.io` and `https://chart-spark-og.vercel.app` failed in this environment at the TLS/receive layer, so deployment parity could not be proven end to end from here. DNS resolution did succeed for both domains.

## Blockers

- `src/app/api/agent/complete-session/route.ts:24-52,89-115`
  The route is still a local draft builder, not the sidecar pipeline described in the audit prompt. `buildDraft()` concatenates `transcript`, `clinicianInput`, and `selectedPhrases`, then returns that text. There is no call to any orchestrator, scribe service, FHIR MCP, Azure sidecar, or persistence layer.
  Repro: POST `/api/agent/complete-session` with `{ patientId or encounterId, transcript, clinicianInput }`. The response body is a locally assembled draft plus `nextRoute`; no note is saved.

- `src/app/api/encounters/[id]/route.ts:174-176`
  `DELETE` is still missing. The file exports `GET`, `PATCH`, and `PUT = PATCH`, but not `DELETE`, so the route contract in the audit prompt is still not met.
  Repro: any DELETE request to `/api/encounters/:id` will resolve to `405 Method Not Allowed`.

- Hardcoded user/demo identities remain beyond the two CC flagged:
  - `src/app/(app)/settings/page.tsx:245`
  - `src/app/(app)/notes/new/page.tsx:1702`
  - `src/components/billing/ClaimsManagerTable.tsx:41-44`
  - `src/lib/demo-data/billing.ts:26`
  - `src/app/(app)/billing/era-inbox/page.tsx:60,63`
  - `src/app/auditor/billing/claims/[id]/page.tsx:36`
  - `src/app/auditor/billing/analytics/page.tsx:35`
  - `src/app/(admin)/admin/managed-billing/claims/page.tsx:50,62,86`
  - `src/app/(admin)/super-admin/managed-billing/claims/page.tsx:51,63,87`
  - `src/app/(admin)/super-admin/managed-billing/analytics/page.tsx:35`
  This means CC understated the scope. The app is not clean of hardcoded provider/patient fixtures.

- Deployment parity with live `app.chartspark.io` is unproven from this environment.
  Confirmed locally: `.vercel/project.json` points to Vercel project `chart-spark-og`, and local build output has build ID `uR8roBUhb1LcqYtMLZeWX` in `.next/BUILD_ID`.
  Confirmed via DNS: `app.chartspark.io` and `chart-spark-og.vercel.app` both resolve to Vercel-managed addresses.
  Not confirmed: whether the live domains currently serve commit `3bdf62c`, whether they serve the same build, or whether TLS is healthy from a normal client path. Every direct HTTPS request from this environment failed before an HTTP response was received.

## Non-blockers for testing, blockers for clinical

- The leaked Supabase `service_role` JWT for project `eepwbtdqtdnqxeznykbh` is still self-consistently valid by claims.
  Current local `.env.local` contains the same token CC referenced. Decoded payload:
  - `ref`: `eepwbtdqtdnqxeznykbh`
  - `role`: `service_role`
  - `iat`: `2026-01-06 01:15:02Z`
  - `exp`: `2036-01-06 13:15:02Z`
  I could not cryptographically verify whether Supabase has revoked or rotated it without live admin access, but absent revocation it remains valid until January 6, 2036. This is therefore still a real security risk, not a stale historical artifact.

- `src/app/api/auth/login/route.ts:22-114` plus `src/lib/security/rate-limit.ts:56-68`
  CC was correct that `/api/auth/login` is exempted from middleware rate limiting and does not call a route-local limiter. Brute-force protection is therefore dependent on client cooperation with separate lockout endpoints, not enforced on the login route itself.

- `src/lib/validation/schemas.ts:204-215`
  CC was correct that `NoteUpdateSchema` is not `.strict()`. Unknown create-only fields would be stripped by Zod instead of rejected with a 400.

- `src/app/(app)/notes/new/page.tsx:118,158,562,600,660,949,1491`
  CC was correct that production client logging remains in this page. Most entries are `console.error(...)`; one metadata-only `console.log(...)` remains at line 600.

- `clinicianInput` vs `clinicalInput`
  First-party UI and API usage is consistent on `clinicianInput`:
  - UI: `src/app/(app)/notes/new/page.tsx:196,611,1565`
  - Validation: `src/lib/validation/schemas.ts:321`
  - Agent route: `src/app/api/agent/complete-session/route.ts:15,29,48,105`
  - AI route: `src/app/api/ai/generate-note/route.ts:31,49,76`
  I found no runtime use of a `clinicalInput` request field in app code.
  One residual typo does exist in response metadata only: `src/app/api/ai/generate-note/route.ts:138` uses `hasClinicalInput`. That does not break the request path but means CC's "zero occurrences" statement was too strong.

- Sidecar integration
  CC's core conclusion is correct for runtime code: there is no actual sidecar wiring in `src/` for `agent-orchestrator`, `chartspark-scribe`, or `chartspark-fhir-mcp`. Those names appear in architecture docs, not in executable request paths. The app currently uses `safeAzureOpenAI` directly for note-generation/transcription routes, while `/api/agent/complete-session` does not call either Azure or sidecars.

## Passing

- `clinicianInput` is the canonical request field across the note UI and the `complete-session` route. There is no evidence of a broken `clinicalInput` request contract in current runtime code.

- `src/app/api/patients/route.ts:107-138` matches the current patient-creation UI payload from `src/app/(app)/patients/new/page.tsx:82-100`. The current UI sends `first_name`, `last_name`, `preferred_name`, `date_of_birth`, `gender`, `email`, `phone`, `address`, `allergies`, `medications`, and `problems`, all of which are accepted by `PatientCreateSchema` at `src/lib/validation/schemas.ts:136-157`.

- `src/app/api/auth/callback/route.ts:1-5` correctly delegates to the shared callback handler, and `src/lib/auth/confirmation-callback.ts:231-240,258-275` still contains the stale-session sign-out and PKCE/OTP fallback behavior CC described.

- `src/app/auth/auth-code-error/AuthCodeErrorClient.tsx:28-63` still implements recovery hash-fragment handling for password-reset fallback by parsing `#access_token` and `#refresh_token`, setting the session, and redirecting to `/reset-password`.

- Session timeout and idle logout are implemented, so CC's NB-6 is not correct as written:
  - Server-side enforcement: `src/lib/auth/api-auth.ts:9-12,92-99`
  - Client idle timeout UI: `src/components/SessionTimeout.tsx:19-27,55-78,143`
  - Mounted in authenticated app layout: `src/app/(app)/layout.tsx:17-18,31`

- Audit logging is present on the core flows CC called out:
  - patient search: `src/app/api/patients/route.ts:57-72`
  - encounter access/update: `src/app/api/encounters/[id]/route.ts:83-95,152-165`
  - note view/update/delete: `src/app/api/notes/[id]/route.ts:58-70,151-163,204-216`

- Build-output secret exposure check:
  - I did not find the service-role JWT in executable `.next` assets.
  - I did find the public Supabase anon key in built client/server bundles, which is expected.
  - I also did not find the service-role token in `.next` source maps during this scan.

## Recommendation

**NO-GO** for signing off client-testing readiness from this state.

The two changes that would most directly flip this toward **GO** are:
1. Implement the real End Session pipeline or explicitly scope the demo away from `/api/agent/complete-session`.
2. Remove the remaining hardcoded identity fixtures, not just the two CC listed.

Separately, do not treat the service-role key issue as resolved. Based on its JWT claims, the leaked key remains valid through **January 6, 2036** unless it has been rotated or revoked outside this repo.
