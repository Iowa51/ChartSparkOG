# SESSION4_NOTES_TABLE_RECONCILIATION.md

Read CLAUDE.md first. This is the most important fix in the roadmap. ONE commit.

---

## Problem

The app has two tables: notes and clinical_notes. All note CRUD (create, update, sign, review) writes to clinical_notes. But several READ paths query from notes — which has 0 rows. Result: dashboards, analytics, admin pages, and billing silently return empty data.

---

## Strategy

Change every .from('notes') READ path to .from('clinical_notes'). Do NOT create a database view. Do NOT touch any write paths (they already use clinical_notes correctly). Do NOT rename or drop the notes table — that is a separate migration task.

---

## Files to fix (from audit)

### 1. src/lib/data/notes.ts
Lines ~31, ~65, ~113, ~165, ~232, ~285, ~305, ~360 — multiple Supabase .from('notes') calls. Change ALL of them to .from('clinical_notes').

IMPORTANT: After changing the table name, verify the column names used in .select(), .eq(), .order(), .filter() etc. still match. The clinical_notes table may have slightly different column names than what the queries expect. Read the existing write paths (in src/app/api/notes/route.ts and src/app/api/notes/[id]/route.ts) to see the actual column names used on clinical_notes.

### 2. src/app/(admin)/admin/analytics/page.tsx
Line ~114 — .from('notes') → .from('clinical_notes'). Verify column names in the select match.

### 3. src/app/(admin)/admin/settings/page.tsx
Line ~94 — .from('notes') → .from('clinical_notes'). Verify column names.

### 4. src/app/(admin)/super-admin/analytics/page.tsx
Line ~86 — .from('notes') → .from('clinical_notes'). Verify column names.

### 5. src/app/(admin)/super-admin/reports/page.tsx
Line ~72 — .from('notes') → .from('clinical_notes'). Verify column names.

### 6. src/app/api/ai/smart-triage/chart-summary/route.ts
Line ~82 — .from('notes') → .from('clinical_notes'). Verify column names.

### 7. src/lib/managed-billing/claim-generator.ts
Line ~96 — .from('notes') → .from('clinical_notes'). Verify column names.

---

## Verification steps

1. After all changes, grep the entire src/ directory for .from('notes') (exact string with quotes). The ONLY remaining matches should be write paths that already use clinical_notes, or unrelated tables. There should be ZERO .from('notes') calls left that query note data.

2. Also grep for from("notes") (double quotes) in case some files use double quotes.

3. Run npm run build to confirm no TypeScript errors from column name mismatches.

---

## Column name gotchas to watch for

The read paths in src/lib/data/notes.ts may reference columns that exist on the old notes table but not on clinical_notes, or vice versa. Common differences to check:
- id, patient_id, encounter_id, content, status, type — likely same on both
- provider_id vs user_id vs created_by — check which column clinical_notes actually has
- signed_at, updated_at, created_at — likely same
- cpt_codes, icd10_codes — verify these exist on clinical_notes

If you find a column mismatch, fix the query to use the correct clinical_notes column name. Do NOT change the clinical_notes schema.

---

## After all fixes

Run npm run build. Then run the grep verification. If both pass, commit:

git add -A
git commit -m "fix: repoint all note read paths from empty notes table to clinical_notes" --no-verify

Report:
- Every file changed with line count
- Grep results showing no remaining .from('notes') on note data
- Any column name mismatches found and how they were resolved
- SHA