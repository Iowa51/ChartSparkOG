# FIX_ENCOUNTER_CREATION.md

## Task

Fix the POST `/api/encounters` endpoint. Production logs show:

```
DatabaseError: Could not find the 'duration_minutes' column of 'encounters' 
in the schema cache
```

The application code is trying to INSERT a `duration_minutes` field into the `encounters` table, but that column does not exist in the Supabase schema.

Read `CLAUDE.md` first for engineering standards.

---

## Scope

**IN scope:**
- Identify whether `duration_minutes` should exist in the database OR whether the code should stop sending it
- Make the fix (migration OR code change, but NOT both)
- Verify encounter creation works end-to-end after the fix

**OUT of scope:**
- Any other audit log fixes (separate file, separate session)
- Any unrelated refactoring
- Changes to the encounters API beyond this specific column mismatch

---

## Step 1 — Diagnostic (report back BEFORE fixing)

Do NOT make changes yet. Investigate and report:

**1a.** Open `src/app/api/encounters/route.ts` (POST handler). Identify:
- Every field the handler tries to INSERT into the `encounters` table
- Whether `duration_minutes` is coming from the request body, a Zod schema default, or hardcoded
- What the Zod schema expects for this request

**1b.** Check the migrations directory:
```
grep -rn "duration_minutes" supabase/migrations/
grep -rn "encounters" supabase/migrations/ | head -20
```

Report:
- Does `duration_minutes` exist in any migration file?
- What columns DOES the `encounters` table have according to migrations?
- Is there a migration that renamed or removed `duration_minutes`?

**1c.** Check the frontend page that submits the request:
- `src/app/(app)/encounters/new/page.tsx` or similar
- What fields does the form submit?
- Where does `duration_minutes` come from — a form field, a default based on template, a hidden field?

**1d.** Report back a decision recommendation:
- **Option A:** Add the `duration_minutes` column to the database (if the frontend actively uses it and it's semantically meaningful)
- **Option B:** Remove `duration_minutes` from the API code (if it's leftover or redundant with another field like `scheduled_duration` or `ended_at - started_at`)
- Recommend one with reasoning

Wait for my approval before proceeding to Step 2.

---

## Step 2 — Execute the approved fix (after my approval)

Based on my decision:

### If Option A (add column):
- Create a new migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_encounters_duration_minutes.sql`
- Add the column with appropriate type (likely `INTEGER` nullable, default NULL)
- Provide the SQL for me to run in Supabase Dashboard → SQL Editor
- Do NOT run the migration yourself — I will run it manually

### If Option B (remove from code):
- Remove `duration_minutes` from the Zod schema, the INSERT payload, and any related validation
- Update the frontend to not send this field if it was being sent
- Ensure no TypeScript errors remain

---

## Step 3 — Verify and commit

1. `npm run build` passes locally
2. If Option B: manually test encounter creation flow (build + start)
3. Commit with descriptive message:
   - Option A: `fix(encounters): add missing duration_minutes column`
   - Option B: `fix(encounters): remove stale duration_minutes field from API`
4. Push with `--no-verify`

---

## Reporting

After Step 1: report diagnostic findings and wait for my decision.
After Step 2/3: report commit SHA, local build result, pre-commit checklist per CLAUDE.md, and for Option A the migration SQL I need to run.

---

## Cross-cutting constraints

- No new env vars
- No new dependencies
- No modifications to unrelated files
- No touching audit logging code (that's a separate fix coming in a different prompt)
- No Sarah K. / demo data cleanup (noted for later)
- If your fix reveals OTHER schema mismatches beyond `duration_minutes`, STOP and report — do not chain-fix them