# FIX_ENCOUNTER_DATE_MISMATCH.md

## Task

Production schema inspection is complete. The `encounters` table in production does **NOT** have an `encounter_date` column. Instead it has a four-field time model:

- `scheduled_start` (timestamptz, NOT NULL, no default)
- `scheduled_end` (timestamptz, NOT NULL, no default)
- `actual_start` (timestamptz, nullable)
- `actual_end` (timestamptz, nullable)

Plus the already-fixed `duration_minutes` (integer, nullable).

The application code is sending `encounter_date`, which is causing `DatabaseError: Could not find the 'encounter_date' column of 'encounters' in the schema cache`.

**This is a code-vs-production mismatch, not just a missing column.** Do NOT add `encounter_date` to production — that would create dual sources of truth. Update the code to use the production schema.

Read `CLAUDE.md` first for engineering standards.

---

## Scope

**IN scope:**
- Update application code (backend + frontend + types) to use `scheduled_start` and `scheduled_end` instead of `encounter_date`
- Ensure the frontend derives `scheduled_end` from `scheduled_start + template duration in minutes`
- Verify the full encounter creation path works end-to-end after the fix

**OUT of scope:**
- Audit log fixes (separate file: FIX_AUDIT_LOG_NULL_ENTITY_TYPE.md)
- Any other broader refactoring of the encounters table
- Modifying `supabase/schema.sql` — leave that file alone for now; we'll reconcile it separately
- Any changes to `duration_minutes` (already added via previous migration)
- Changes to `actual_start`/`actual_end` — those are populated later when the encounter is actually started/ended, not at creation time

---

## Step 1 — Diagnostic (report back BEFORE fixing)

Do NOT make changes yet. Report the full inventory first.

**1a.** Grep the entire `src/` directory for every occurrence of `encounter_date`:

```
grep -rn "encounter_date" src/
```

Report every file and line number. This could touch:
- Zod schemas (POST + PATCH)
- Data layer INSERT and UPDATE statements
- TypeScript interfaces and types
- Frontend pages and components
- API handlers
- Any tests or fixtures

**1b.** Also grep for related patterns that may need updating alongside:

```
grep -rn "encounterDate\|EncounterDate" src/
```

(camelCase / PascalCase variants in case they're used in TypeScript land while the DB uses snake_case)

**1c.** Check what the frontend currently sends on encounter creation. Open `src/app/(app)/encounters/new/page.tsx` and report:
- What fields are in the request body
- Where the date/time comes from (is there a date picker? a default to today? template-based?)
- Where the template duration (60, 30, 15, 45 min) is stored and how to access it from the form submission handler

**1d.** Report the complete inventory and a proposed plan BEFORE making changes. Wait for my approval.

---

## Step 2 — Execute the approved fix (after my approval)

Based on the inventory, update:

### Backend (Zod schema + API + data layer)

- Replace `encounter_date` in the Zod schema with `scheduled_start` and `scheduled_end` (both required ISO datetime strings)
- The data layer INSERT into `encounters` table should include:
  - `scheduled_start` from request body
  - `scheduled_end` from request body
  - All other fields as they currently are (patient_id, provider_id, organization_id, encounter_type, chief_complaint, duration_minutes, status)
- Ensure PATCH handler updates use the correct field names too
- Ensure any GET/list handlers that reference encounter_date are also updated

### Frontend

- User picks a date/time in the form (or it defaults to "now")
- Derive `scheduled_start` as an ISO datetime string from the picked date
- Derive `scheduled_end` as `scheduled_start + template.durationMinutes` (the template already carries the duration — "60 min duration", "30 min duration" etc.)
- Send both fields in the request body instead of `encounter_date`

### Types

- Update the `Encounter` interface in `src/lib/types/database.ts` to have `scheduled_start: string | Date` and `scheduled_end: string | Date` instead of `encounter_date`
- Remove any `encounter_date` references from type definitions

---

## Step 3 — Verify and commit

1. `npm run build` passes locally — no TypeScript errors
2. Pre-commit checklist per CLAUDE.md
3. Commit as a single logical commit:

```
fix(encounters): use scheduled_start/scheduled_end to match production schema

Production encounters table uses a four-field time model (scheduled_start, 
scheduled_end, actual_start, actual_end) but the application code was 
sending encounter_date, causing schema-cache errors on every POST. This 
commit updates the Zod schema, data layer INSERT, TypeScript types, and 
frontend form to use the production field names.

scheduled_end is computed on the frontend from scheduled_start + the 
template's duration in minutes, which is already present in the visitTypes 
array.

actual_start and actual_end are nullable and populated later when the 
encounter is actually started/ended — not at creation time.
```

Push with `--no-verify`.

---

## Cross-cutting constraints

- No new env vars, no new dependencies, no schema changes to `encounters` table
- No modifications to `supabase/schema.sql` in this commit — that file is out of sync with production and needs a separate reconciliation effort (flag for roadmap)
- No audit log fixes (separate session)
- No "while I'm here" refactors
- If inventory in Step 1 reveals more than 10 files touching `encounter_date`, STOP and report — we may need to split the fix

---

## Reporting

After Step 1: inventory + wait for approval.

After Step 3:
- Commit SHA
- Local build result
- Files changed with line counts
- Pre-commit checklist per CLAUDE.md
- Any assumptions made (especially around how to derive scheduled_end)
- Any `encounter_date` references you found OUTSIDE `src/` that you didn't touch (e.g., `supabase/schema.sql` — note, don't fix)
- Vercel deploy status after push

---

## Post-fix verification

I will manually test by:
1. Logging in as clinician (Test Clinician, jomanwa+testclinician@gmail.com)
2. Navigating to the test patient
3. Creating a new encounter (picking a template)
4. Expecting: encounter creates successfully, I land on the note-writing page
5. Verifying in Supabase that the encounter row has populated scheduled_start and scheduled_end values

If encounter creation still fails, I'll paste the new error. Do NOT start additional fixes before that feedback.