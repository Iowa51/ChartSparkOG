# SESSION5_SENTRY_PHI_SCRUB.md

Read CLAUDE.md first. Three fixes, ONE commit.

---

## Context

@sentry/nextjs is already installed (v10.39.0). sentry.server.config.ts and sentry.edge.config.ts exist but have no PHI scrubbing. sentry.client.config.ts does not exist. The DSN env var is NEXT_PUBLIC_SENTRY_DSN. Before real clinicians use this app, Sentry must never capture patient names, DOB, SSN, MRN, note content, transcript text, or encounter clinical details.

---

## Fix 1: Add beforeSend PHI-scrubbing hook to sentry.server.config.ts

Open sentry.server.config.ts. Add a beforeSend callback that scrubs PHI from error events before they leave the server.

The hook should:

1. Scrub event.request.data (POST bodies may contain patient data):
   - If it's a string, redact any JSON keys matching PHI field names
   - If it's an object, delete or redact values for these keys (case-insensitive match):
     patient_id, patient_name, first_name, last_name, date_of_birth, dob, ssn, mrn, phone, email, address, content, transcript, note_content, subjective, objective, assessment, plan, chief_complaint, clinicianInput, scribeTranscription, allergies, medications, problems

2. Scrub event.exception.values[].stacktrace.frames[].vars — local variables captured in stack frames can contain PHI. Delete the vars property from every frame.

3. Scrub event.breadcrumbs — breadcrumb messages and data can contain PHI. For each breadcrumb, if breadcrumb.data exists, delete keys matching the PHI field names above. If breadcrumb.message contains what looks like a patient name or MRN pattern, replace with [REDACTED].

4. Scrub event.extra and event.contexts — delete any keys matching PHI field names.

Keep it simple and defensive. A helper function like scrubPHI(obj) that recursively walks an object and redacts matching keys is the cleanest approach.

---

## Fix 2: Create sentry.client.config.ts

Create sentry.client.config.ts in the project root (same level as sentry.server.config.ts).

Contents should mirror the server config but for the browser:
- Import from @sentry/nextjs
- Initialize with dsn from process.env.NEXT_PUBLIC_SENTRY_DSN
- Set tracesSampleRate: 0.1
- Set replaysSessionSampleRate: 0 (disabled — PHI risk)
- Set replaysOnErrorSampleRate: 0 (disabled — PHI risk)
- Add the same beforeSend PHI-scrubbing hook as the server config
- Do NOT enable session replay (Replay integration must not be added)

---

## Fix 3: Apply same beforeSend hook to sentry.edge.config.ts

Open sentry.edge.config.ts and add the same beforeSend PHI-scrubbing hook. Edge functions also handle requests with PHI.

---

## Implementation notes

- Extract the scrubPHI helper and the beforeSend function into a shared file like src/lib/sentry/scrub-phi.ts so all three configs import the same logic. This avoids triple-maintaining the same code.
- The shared file must work in Node, browser, AND edge runtime — use only standard JS, no Node-specific APIs.
- Keep NEXT_PUBLIC_SENTRY_DSN as the env var name (it's already used, changing it would break existing config).

---

## After all fixes

Run npm run build. If it passes, commit:

git add -A
git commit -m "fix: add Sentry PHI scrubbing hook, create client config, disable session replay" --no-verify

Report:
- Files created and changed
- List of PHI field names in the scrub list
- Confirmation that session replay is disabled
- SHA