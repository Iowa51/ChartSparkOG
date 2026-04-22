# AUDITOR_PHASE_1_DIAGNOSTIC.md

## Context

Auditor workflow activation sprint. Part B investigation (FIX_SUBMIT_PATH_AND_INVESTIGATE_AUDITOR.md) revealed the auditor build is 80% complete. Production SQL verified all three auditor tables exist: `submissions`, `auditor_organizations`, `audit_flags`.

Phase 1 is diagnostic only — no code changes. We need to understand the full picture before modifying anything.

Read `CLAUDE.md` first.

---

## Three things to investigate

### Investigation 1 — The submissions writer trace (load-bearing)

The auditor dashboard treats `submissions` as a first-class review unit — stats like "pending audits" query this table. But B5/B6 of the earlier investigation flagged: "there's no writer path visible that creates a submissions row when a note moves to pending_review."

If nothing writes to submissions today, the auditor dashboard stays empty no matter what else we fix. This is the single most important question in the sprint.

**Task:**

Search the entire codebase for anything that writes to `submissions`:

```bash
grep -rn "from('submissions')\|from(\"submissions\")\|\\.insert.*submissions\|INSERT INTO submissions\|submissions\\..*insert" src/ supabase/ --include="*.ts" --include="*.tsx" --include="*.sql"
```

Also check:
```bash
grep -rn "submissions\\.insert\|submissionInsert\|createSubmission\|newSubmission" src/
```

Look at the submissions table schema via this SQL (you'll ask the user to run it):

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'submissions'
ORDER BY ordinal_position;
```

Report:
- All file:line references to writing submissions
- The submissions table schema (columns and types)
- Whether there's any trigger, function, or backend job that could write to submissions outside of the app code
- Your best-guess answer: does ANY code path create a submissions row today?

If the answer is "no code path writes to submissions," Phase 2 needs a new step: build the writer. That changes scope significantly, so we need to know now.

### Investigation 2 — The three auditor tables' full schema

All three tables exist in production per SQL verification. We need to capture their schemas so we can:
1. Understand the data model
2. Write CREATE TABLE migrations to commit to tracked migrations
3. Know what to seed for testing

User will run this SQL and provide the output:

```sql
-- Submissions
SELECT 
  column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'submissions'
ORDER BY ordinal_position;

-- auditor_organizations
SELECT 
  column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'auditor_organizations'
ORDER BY ordinal_position;

-- audit_flags
SELECT 
  column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_flags'
ORDER BY ordinal_position;

-- Foreign keys for all three
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('submissions', 'auditor_organizations', 'audit_flags')
ORDER BY tc.table_name, kcu.column_name;

-- RLS policies on these three tables
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('submissions', 'auditor_organizations', 'audit_flags');

-- Row counts
SELECT 'submissions' AS table_name, COUNT(*) AS row_count FROM submissions
UNION ALL
SELECT 'auditor_organizations', COUNT(*) FROM auditor_organizations
UNION ALL
SELECT 'audit_flags', COUNT(*) FROM audit_flags;
```

Report what the output reveals. This is raw data capture — we're not analyzing yet, just gathering.

### Investigation 3 — How did the 8 broken notes get submitted?

Production has 8 notes with `status='signed'` AND `signed_at=NULL`. The code has `canSubmitClaim = status === 'approved'` gate at `notes/[id]/page.tsx:339`. So how did these notes end up signed without going through the approved state?

**Task:**

Find every path that can set `status='signed'` on a clinical_notes row:

```bash
grep -rn "status.*['\"]signed['\"]" src/ --include="*.ts" --include="*.tsx"
grep -rn "status:.*'signed'\|status: \"signed\"" src/
grep -rn "UPDATE.*clinical_notes.*status" supabase/
```

For each path, report:
- File and line
- What triggers the write
- Whether there's a guard check for `status === 'approved'` first
- Whether any path bypasses the auditor approval gate

Possible explanations to test for:
- A legacy code path that doesn't check canSubmitClaim
- An admin tool that can force-sign notes
- A "sign directly" flow parallel to "submit to insurance"
- Notes created programmatically (import, migration, seed data)
- The `canSubmitClaim` gate exists in UI code but the API doesn't enforce it server-side

Report all paths found. We need the complete picture before committing.

---

## Additional investigation (low priority but useful)

### 4 — NoteStatus type drift scope

`src/lib/types/database.ts:17` has: `NoteStatus = "draft" | "pending_review" | "signed" | "amended"`

Zod schema accepts: `draft | completed | signed | amended | pending_review | approved | needs_revision`

DB check constraint has: per `20260210_add_review_statuses.sql`, the three review statuses plus the originals.

**Task:**

Find every consumer of `NoteStatus` type:
```bash
grep -rn "NoteStatus" src/ --include="*.ts" --include="*.tsx"
```

Report how the type drift might cause TypeScript holes. Specifically, are there any places where:
- Code compares against `approved` or `needs_revision` but the type doesn't include them (TypeScript compile error waiting)
- Code handles `amended` but the DB would never produce it (dead branch)
- Code relies on the narrow type to avoid handling new states (broken when new states appear)

### 5 — Dead code assessment

B6 of the earlier investigation flagged several `/auditor/billing/*` sub-pages as possibly aspirational scaffolding:
- `/auditor/billing/analytics`
- `/auditor/billing/denials`
- `/auditor/billing/schedules`
- `/auditor/billing/era-audit`
- `/auditor/billing/organizations`
- `/auditor/billing/claims/[id]`
- Plus benchmarking, denial forensics, matching oversight

**Task:**

Quick skim of each. Are they:
- Real working pages
- Scaffolding with TODO comments
- Placeholder "coming soon" text
- Genuinely broken / crashing

Don't deep-audit — just categorize so we know what to keep, hide from nav, or schedule for later.

---

## Reporting format

Produce a structured report with four sections:

### Section 1 — Submissions writer trace
- All writer paths found (file:line + summary)
- Submissions schema summary
- Conclusion: does anything write to submissions today?

### Section 2 — Three-table schema capture
- Submissions schema (columns + FKs + RLS)
- auditor_organizations schema (columns + FKs + RLS)
- audit_flags schema (columns + FKs + RLS)
- Row counts

### Section 3 — The 8 broken notes investigation
- All status-signed writer paths
- Which paths bypass the canSubmitClaim gate
- Your theory on how the 8 notes got into the broken state

### Section 4 — Secondary findings
- NoteStatus drift impact
- /auditor/billing/* pages quick assessment

---

## Do NOT in Phase 1

- No code changes
- No migrations
- No schema changes
- No new files
- No "while I'm here" fixes

Phase 1 is gather-information-only. Phase 2 decisions depend on what Phase 1 reveals.

---

## After Phase 1 report

User reviews findings, decides scope of Phase 2, then writes the Phase 2 fix prompt.