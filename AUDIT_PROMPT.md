# ChartSparkOG Production Readiness Audit — Run Now

You are auditing `C:\Users\joman\OneDrive\Desktop\ChartSparkOG` for client testing readiness on `https://app.chartspark.io`. This is a HIPAA-compliant mental health EHR. Do NOT fix anything yet — produce a prioritized findings report first, then await my go-ahead to remediate. Use `--no-verify` on any eventual commits.

## Scope — verify each of these explicitly

**1. Deployment status**
- Confirm latest commit on `main` has deployed successfully to Vercel (`chart-spark-og` project). Report commit SHA, deploy status, and any build warnings.
- Confirm `app.chartspark.io` resolves, serves HTTPS with a valid cert, and returns the current build (check a known asset hash or `/api/health` if one exists).
- Verify `chart-spark-og.vercel.app` and `app.chartspark.io` serve identical builds.

**2. Critical route smoke test (static analysis + live hit)**
For each of the following, confirm the route file exists, exports the correct HTTP verbs, has auth middleware applied, and returns a non-500 response on a live GET/POST with a test token:
- `/api/encounters` (GET, POST)
- `/api/encounters/[id]` (GET, PATCH, DELETE)
- `/api/agent/complete-session` (POST)
- `/api/patients` (GET, POST) — confirm field validation matches current UI payload
- `/api/notes/[id]` (PATCH) — confirm create-only fields are rejected
- `/api/auth/callback` (PKCE)
- `/api/auth/reset-password` (implicit flow, hash fragment handling)
- `/api/mfa/*` (confirm `failOpen` is set)

**3. Auth & session flows**
- Registration: end-to-end from signup → confirmation email → click link → land authenticated. Report any rate-limiter rejections.
- Password reset: request → email → click → set new password → login.
- MFA: enrollment, challenge on login, recovery code generation.
- Sidebar user: confirm no hardcoded "Dr. Sarah K." references remain anywhere (`grep -ri "Sarah K" src/` and also check for any other hardcoded user fixtures).

**4. Supabase configuration**
- Project `eepwbtdqtdnqxeznykbh`: Site URL = `https://app.chartspark.io`, redirect URLs include both Vercel domains.
- RLS policies present on all PHI tables (patients, encounters, notes, audit_logs). Flag any table missing RLS.
- Service role key is NOT exposed in any client bundle (`grep` the build output).

**5. Rate limiting / circuit breaker health**
- List every route that now uses `failOpen`. For each, assess whether failOpen is safe (auth routes = concerning, read-only = acceptable).
- Check Upstash Redis connectivity from a deployed function. Report the circuit breaker's current state.

**6. Email deliverability**
- Confirm Resend domain `chartspark.io` is verified (SPF, DKIM, DMARC all green).
- Send a test confirmation email and a test password reset; confirm both land in inbox (not spam) with correct branding from `noreply@chartspark.io`.

**7. Azure sidecar health**
- Ping `agent-orchestrator`, `chartspark-scribe`, and `chartspark-fhir-mcp` health endpoints.
- Confirm the End Session button's full pipeline: UI → `/api/agent/complete-session` → orchestrator → scribe (Whisper + GPT-4o) → FHIR MCP → note persisted.
- Verify the `clinicianInput` field name (NOT `clinicalInput`) is used consistently UI → API → sidecar.
- Confirm `safeAzureOpenAI` singleton lazy-init is not silently falling back to demo mode (check logs for the demo-mode warning string).

**8. HIPAA & security sanity**
- No PHI in client-side logs, error messages, or URL query params.
- Audit log writes are firing on: patient view, note create/edit, encounter access.
- Session timeout and idle logout are enforced.
- No `.env` or secrets in the repo (`git log --all -p | grep -iE "sk-|secret|key=|password="` spot check).

**9. Known regressions to re-verify**
Go back through today's 13 fixes one-by-one and confirm each is still passing in the deployed build, not just in local. Fixes #1, #6, #7, #8, #9, #10 are the highest-risk for regression.

## Deliverable format

Produce a markdown report with three sections:

1. **🔴 Blockers** — anything that prevents client testing today. Include file paths, line numbers, and reproduction steps.
2. **🟡 Non-blockers for testing, blockers for clinical** — things clients can tolerate in a test but must be fixed before real PHI.
3. **🟢 Passing** — short confirmation list so I know what you actually checked.

End with a single recommendation: **GO** or **NO-GO** for client testing today, with the one or two things that would flip a NO-GO to a GO.

After I review, I'll tell you which blockers to fix first. Then Codex audits your fixes before we push.

**IMPORTANT: Save the full report to `AUDIT_REPORT.md` in the repo root when finished. Do not commit it.**