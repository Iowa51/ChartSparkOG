# FIX_SUBMIT_PATH_AND_INVESTIGATE_AUDITOR.md

## Context

Codex adversarial verification of commit `dbc1b66` identified that the "Submit to Insurance" flow has a data write bug: the PATCH at `src/app/(app)/notes/[id]/page.tsx:200` sends `{status: 'signed', is_signed: true}`, but `NoteUpdateSchema` strips `is_signed` and nothing adds `signed_at`. Result: notes signed via this path have `status='signed'` with NULL `signed_at`.

Production SQL verification confirmed **8 notes in this broken state** right now (out of 52 total).

The dashboard's "Signed Today" query only counts `signed_at >= todayStart`, so all 8 of these notes are invisible to the dashboard.

This prompt has TWO parts:

**Part A:** Fix the submit-path data write bug (small, surgical)

**Part B:** Investigate what auditor workflow code already exists in the repo (diagnostic only, no fixes)

Read `CLAUDE.md` first.

---

## PART A — Fix submit-path data consistency

### A1 — Fix the frontend PATCH payload

**File:** `src/app/(app)/notes/[id]/page.tsx` around line 200 where the Submit to Insurance button calls PATCH.

**Current (broken):**
```typescript
body: JSON.stringify({ status: 'signed', is_signed: true })
```

**Fix:**
```typescript
body: JSON.stringify({ 
  status: 'signed', 
  is_signed: true,
  signed_at: new Date().toISOString()
})
```

### A2 — Fix the Zod schema to accept the fields

**File:** `src/lib/validation/schemas.ts` around line 204 where `NoteUpdateSchema` is defined.

Add `is_signed` and `signed_at` as optional fields. Both nullable, both optional. Example:

```typescript
signed_at: z.string().datetime().optional().nullable(),
is_signed: z.boolean().optional(),
```

Verify these don't conflict with other schemas or existing validation logic. If either column already exists in a schema elsewhere (e.g., `NoteCreateSchema`), the update schema should follow the same convention.

### A3 — Defensive dashboard query (optional but recommended)

**File:** `src/app/api/dashboard/stats/route.ts`

The 8 notes currently in the broken state will remain invisible to the dashboard until they get `signed_at` populated. We should make the dashboard count them too — they were legitimately "signed," just through the path with the data bug.

Option A3.1 (Preferred): Update dashboard query to accept either signal

Replace the current `signedToday` query filter:
```typescript
.gte('signed_at', todayStart)
```

With an OR condition covering both paths:
```typescript
.or(`signed_at.gte.${todayStart},and(status.eq.signed,updated_at.gte.${todayStart})`)
```

This catches:
- Notes with `signed_at >= todayStart` (the correct future path)
- OR Notes with `status='signed' AND updated_at >= todayStart` (the legacy broken path)

Dedup: Supabase's `.or()` with `.count()` should return unique rows, but verify. If there's overlap risk, the query might double-count. Test by reading Supabase docs on `.or()` with count.

Option A3.2 (Alternative): Backfill the 8 existing broken notes

Run a one-off SQL migration:
```sql
UPDATE clinical_notes 
SET signed_at = updated_at 
WHERE status = 'signed' 
  AND signed_at IS NULL;
```

Then the simple `.gte('signed_at', todayStart)` query works correctly without the OR.

**Decide which approach based on your judgment.** A3.1 is defensive and handles future drift. A3.2 is cleaner but requires running SQL against production.

My (Claude's) preference: **A3.2** — cleaner query, one-time migration, no ongoing defensive code needed. But check if any of the 8 broken notes have `updated_at` values that would be wrong to use as `signed_at` (e.g., updated recently for a reason other than signing). If uncertain, go with A3.1.

### A4 — Commit A

**Commit message:**
```
fix(notes): submit-to-insurance path now sets signed_at consistently

The "Submit to Insurance" button at notes/[id]/page.tsx PATCHed with 
{status: 'signed', is_signed: true} but:
1. Zod's NoteUpdateSchema stripped is_signed
2. Nothing set signed_at

Result: 8 notes in production have status='signed' with NULL signed_at,
invisible to the dashboard's Signed Today count.

Fixes:
- Frontend PATCH payload now includes signed_at: new Date().toISOString()
- NoteUpdateSchema accepts signed_at and is_signed as optional fields
- [Describe the A3 choice made — backfill OR defensive query]

The claim-submit path is still NOT a real clearinghouse submission — that's
roadmap territory. This fix only makes the data write consistent with the
sign button path.
```

### A5 — Report after Part A

- Commit SHA
- Vercel deploy status
- Which A3 option chosen (A3.1 defensive query OR A3.2 backfill) and why
- If A3.2: the SQL that was run against production
- Local `npm run build` result
- Confirmation the 8 broken notes are now either (a) caught by the defensive query, or (b) backfilled with signed_at

---

## PART B — Auditor workflow investigation (DIAGNOSTIC ONLY, NO FIXES)

### Context

User mentioned having "a full auditor build" already designed and partially built. Before proposing any auditor workflow wiring, investigate what already exists in the codebase.

### B1 — Find all auditor-related code

```bash
grep -rn "auditor\|AUDITOR\|audit_queue\|audit_review\|pending_review\|needs_revision\|co_sign" src/ --include="*.ts" --include="*.tsx"
```

Report what you find:
- Files and line numbers
- What each match represents (UI component, route handler, database field, enum value, TypeScript type, etc.)

### B2 — Check the role system

The role enum includes `AUDITOR` per CLAUDE.md. Find:
- Where the AUDITOR role is referenced in the codebase
- Any route guards or RBAC checks that use AUDITOR
- Any UI components that conditionally render for AUDITOR role
- Any pages/routes that are auditor-specific (e.g., `/auditor`, `/audit-queue`, `/review`)

### B3 — Check the note status enum

Per CC's earlier verification, the status enum is `draft | completed | signed | amended`, and the Zod schema also permits `pending_review | approved | needs_revision` (though nothing sets them).

- Find where `pending_review`, `approved`, `needs_revision` are defined
- Find where they're referenced (even if not set)
- Check if there's dead UI code that expected these states
- Check migration files for any auditor-related schema history

### B4 — Check for auditor tables

```bash
ls supabase/migrations/ | grep -i "audit\|review"
grep -rn "CREATE TABLE.*audit\|CREATE TABLE.*review" supabase/
grep -rn "from('audit\|from('review" src/ --include="*.ts"
```

Report:
- Any tables designed for auditor functionality (besides `audit_logs` which is HIPAA compliance logging, different purpose)
- Any tables that reference notes-pending-review or audit-assignments
- Migration history for anything auditor-related

### B5 — Check for auditor UI

```bash
find src/app -type d -name "*audit*" -o -name "*review*" -o -name "*auditor*"
find src/components -type d -name "*audit*" -o -name "*review*"
grep -rn "AuditorDashboard\|ReviewQueue\|PendingReview" src/ --include="*.tsx"
```

Report any:
- Auditor dashboard pages/components
- Review queue UI
- Auditor-specific forms or modals
- Half-finished UI that suggests an auditor workflow was partially built

### B6 — Summary report

Based on B1-B5, produce a summary:

1. **What exists:** List of auditor-related code/schema/UI that's present
2. **What's wired up:** Which pieces are actually connected and functional
3. **What's dead code:** References to auditor features that were planned but never implemented
4. **What's missing:** Clear gaps between "role exists / enum exists" and "working auditor workflow"

This summary will guide the decision on what to build for the auditor workflow in a future session.

### B7 — Do NOT implement anything

- Do NOT build an auditor UI
- Do NOT wire up any pending routes
- Do NOT modify any auditor-related code
- Do NOT add new status enum values anywhere they're not already referenced
- Report only

---

## Scope boundaries

### Part A scope
- `src/app/(app)/notes/[id]/page.tsx` — PATCH payload fix
- `src/lib/validation/schemas.ts` — schema fields
- `src/app/api/dashboard/stats/route.ts` — ONLY IF A3.1 chosen (defensive query)
- Production SQL (ONE statement) — ONLY IF A3.2 chosen (backfill)

### Part B scope
- No source file modifications
- Diagnostic output only

### Do NOT touch in either part
- AI note generation pipeline
- ICD-10 code logic
- Smart Triage
- Patient context helper
- Timezone helper
- Dashboard rendering (beyond A3.1 if chosen)
- Any other "while I'm here" improvements

---

## Reporting structure

Report Part A and Part B as separate sections in your reply.

**Part A:**
- Commit SHA
- A3 decision and rationale
- Any SQL executed
- Build result
- Vercel deploy link

**Part B:**
- Summary findings (what exists, what's wired, what's dead, what's missing)
- Recommendation for what to do next (NOT implementation — just "here's what a minimal auditor workflow would require given what's already there")

Awaiting your report before we decide on the next session's auditor work.