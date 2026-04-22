# APPROVE_ENCOUNTER_DATE_FIX.md

Approved. Execute Step 2 of FIX_ENCOUNTER_DATE_MISMATCH.md with these specific clarifications.

---

## Clarification 1 — Required fields

Make `scheduled_start` and `scheduled_end` **REQUIRED** (not optional) in the POST Zod schema.

Reasoning: the production database has NOT NULL constraints on both columns. If the Zod schema made them optional, callers could omit them and hit a cryptic 500 from the database instead of a clean 400 from validation. Required at the schema boundary keeps validation tight and errors readable.

---

## Clarification 2 — Type changes

Update the TypeScript types exactly as CC proposed in the diagnostic:

- `Encounter` interface: replace `encounter_date: string` with
  ```
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  ```

- `EncounterCreateInput`: replace `encounter_date?: string` with
  ```
  scheduled_start: string;  // required
  scheduled_end: string;    // required
  ```

- `EncounterUpdateInput`: replace `encounter_date?: string` with
  ```
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string | null;
  actual_end?: string | null;
  ```

---

## Clarification 3 — duration_minutes is independent

Do NOT derive `duration_minutes` from `scheduled_end - scheduled_start`. These capture semantically different concepts:

- `scheduled_end - scheduled_start` = **planned** duration
- `duration_minutes` = **actual** duration when encounter completes (populated later)

A visit scheduled for 60 minutes might actually run 45 or 75. Keep these fields independent. The existing data layer already writes `duration_minutes` separately; keep that behavior unchanged.

---

## Clarification 4 — Commit message must flag schema.sql and test-all-routes.ts drift

In the commit message body (NOT the subject line), explicitly note that:

- `supabase/schema.sql` still references `encounter_date` — deliberately NOT fixed in this commit
- `scripts/test-all-routes.ts` still references `encounter_date` — deliberately NOT fixed in this commit
- Both need follow-up. The user will capture these in OBSERVABILITY_ROADMAP.md separately.

Example commit message:

```
fix(encounters): use scheduled_start/scheduled_end to match production schema

Production encounters table uses a four-field time model (scheduled_start,
scheduled_end, actual_start, actual_end) but the application code was
sending encounter_date, causing PGRST204 schema-cache errors on every POST.

This commit updates the Zod schema, data layer INSERT, TypeScript types,
and frontend form to use the production field names. scheduled_end is
computed on the frontend from scheduled_start + template.durationMinutes.
actual_start and actual_end are nullable and populated later when the
encounter is actually started/ended.

OUT OF SCOPE (flagged for follow-up in OBSERVABILITY_ROADMAP.md):
- supabase/schema.sql still references encounter_date — must be reconciled
  to match production before any new environment is bootstrapped from it
- scripts/test-all-routes.ts still references encounter_date — test
  fixtures are stale; investigate test coverage gap that allowed this
```

---

## Clarification 5 — Frontend implementation

In `src/app/(app)/encounters/new/page.tsx`:

- User picks a date/time (or it defaults to "now")
- Derive `scheduled_start` as an ISO datetime string from the picked date/time
- Derive `scheduled_end` as:
  ```
  new Date(scheduled_start.getTime() + template.durationMinutes * 60 * 1000).toISOString()
  ```
- Send both fields as ISO datetime strings in the request body
- The template object already carries duration info (visitTypes array with "60 min", "30 min", etc.) — extract the numeric minutes from wherever that lives and use it

---

## Clarification 6 — Display components

Where UI components previously read `encounter.encounter_date`, read `encounter.scheduled_start` instead. This applies to (at minimum):

- `src/app/(app)/encounters/page.tsx`
- `src/app/(app)/encounters/[id]/page.tsx`
- `src/app/(app)/patients/[id]/page.tsx`
- Any other component CC's grep identified

No layout changes, no UX changes — just field rename in the display logic. Date formatting helpers should continue to work since both fields are ISO datetime strings.

---

## Reporting requirements

After pushing to main, report:

1. Commit SHA
2. Files changed with a one-line description of each change
3. Local `npm run build` result
4. Pre-commit checklist per CLAUDE.md
5. Vercel deploy status (check after push)
6. Explicit reminder: "James needs to add schema.sql drift and test-all-routes.ts to OBSERVABILITY_ROADMAP.md"

---

## Testing plan (user will run)

After Vercel deploys, user will:

1. Log in as Test Clinician in browser
2. Navigate to test patient
3. Create new encounter (pick Follow-up Visit template)
4. Expect: encounter creates successfully, lands on note-writing page
5. Verify in Supabase that the new encounter row has populated `scheduled_start` and `scheduled_end` values matching the form submission + template duration

If any step fails, user will paste the error and CC will diagnose.

---

## What NOT to do

- Do NOT touch `supabase/schema.sql` in this commit
- Do NOT touch `scripts/test-all-routes.ts` in this commit
- Do NOT touch audit logging (separate fix coming)
- Do NOT add new dependencies
- Do NOT modify env vars
- Do NOT derive `duration_minutes` from other fields
- Do NOT introduce "while I'm here" refactors

Proceed.