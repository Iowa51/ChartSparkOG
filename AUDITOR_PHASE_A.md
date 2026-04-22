# AUDITOR_PHASE_A.md

## Context

User confirmed the intended workflow:

```
Clinician writes note (status: draft)
    ↓ clicks "Sign & Send for Review" in the Save Draft modal
Status → pending_review
Submission row created (status: pending_audit)
    ↓
Auditor sees in queue
    ↓
Auditor: Approve → Status → approved → Submission goes to insurance (Status → signed)
Auditor: Request Revision → Status → needs_revision → Clinician sees feedback, fixes, re-signs
    ↓
Admin is an oversight channel, not a required gate (views all submissions, can intervene)
```

**Submissions schema confirmed via SQL:**
- `cpt_code` (text, NOT NULL) — one primary CPT per submission (Option A)
- `icd10_codes` (ARRAY, default `'{}'`)
- `billing_amount` (numeric, NOT NULL default 0.00)
- `status` (text, default `'pending_audit'`)
- `note_id` — FK currently points at `notes` (WRONG — must point at `clinical_notes`)
- 22 columns total, including auditor_id/auditor_status, admin_approved_by/admin_approved_at, submission_date, payment_date, rejection_reason

**Current state:**
- submissions: 0 rows (no writer exists)
- clinical_notes: 52 rows
- 8 notes in broken state (status='signed' + signed_at=NULL)

Read `CLAUDE.md` first.

Phase A is commits 1, 2, 3. Phases B and C will follow.

---

## Phase A — Three commits

### Commit 1 — Fix submissions.note_id FK

**File:** new migration `supabase/migrations/20260420000000_fix_submissions_note_fk.sql`

**Content:**

```sql
-- Fix submissions.note_id FK to reference clinical_notes instead of orphaned notes table

-- Drop the existing FK constraint
ALTER TABLE submissions 
  DROP CONSTRAINT IF EXISTS submissions_note_id_fkey;

-- Add the new FK pointing at clinical_notes
ALTER TABLE submissions 
  ADD CONSTRAINT submissions_note_id_fkey 
  FOREIGN KEY (note_id) REFERENCES clinical_notes(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT submissions_note_id_fkey ON submissions IS 
  'References clinical_notes (the active notes table). Previously referenced the orphaned notes table — corrected 2026-04-20.';
```

**Verification before commit:**
- Check whether any CREATE TABLE for submissions exists in tracked migrations. If yes, determine whether to update it too OR just add this correction migration. If no CREATE TABLE migration exists (likely, since the table was created via untracked script), add this as a correction-only migration.
- Before applying, confirm `submissions` has 0 rows (user already verified this) so the FK change won't fail on existing data.
- After applying, verify by re-running the FK check:
  ```sql
  SELECT ccu.table_name, ccu.column_name
  FROM information_schema.constraint_column_usage ccu
  JOIN information_schema.table_constraints tc USING (constraint_name)
  WHERE tc.table_name = 'submissions' AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'id';
  ```

**Apply the migration:** Ask user to run the migration file via Supabase CLI or SQL Editor. Do not assume automatic application. Include instructions in the commit report.

**Commit message:**
```
fix(schema): repoint submissions.note_id FK to clinical_notes

The submissions table previously referenced the orphaned `notes` table 
(0 rows, no writers). Every clinical note in the app is stored in 
`clinical_notes`. This migration drops the stale FK and creates a new 
one pointing at the correct table.

Safe to apply: submissions has 0 rows at time of migration, so no data 
integrity issues. Ensures the auditor workflow can reference real 
clinical notes going forward.
```

---

### Commit 2 — Rewire "Sign Note" into "Sign & Send for Review" + submission writer

**What this commit does:**
1. Renames the sign button to "Sign & Send for Review"
2. Changes the sign route behavior: instead of setting status='signed' directly, it sets status='pending_review' and CREATES a submission row
3. Gates: Only notes with status='draft' or 'needs_revision' can be signed

**File changes:**

#### 2a — Frontend button label

**File:** `src/app/(app)/notes/new/page.tsx` (and any other location where the Sign button appears)

**Find the Save Draft modal** — per user, the sign button lives inside the modal that appears after "Save Draft." Locate the button that currently says "Sign Note" (or similar) and change the label to:

```
Sign & Send for Review
```

**Also update any secondary/helper text** near the button to match the new behavior. Example explanatory text:

```
This will sign the note and send it to an auditor for review. 
You won't be able to edit the note until the auditor responds.
```

If no secondary text currently exists, ADD it below the button.

**Grep for other places the button or similar language appears:**
```
grep -rn "Sign Note\|Sign & Submit\|signNote\|handleSign" src/app/(app)/ --include="*.tsx"
```

Update all clinician-facing sign buttons to "Sign & Send for Review" for consistency.

**Do NOT change:** Any auditor-side or admin-side button labels. Those are separate flows.

#### 2b — Sign route behavior

**File:** `src/app/api/notes/[id]/sign/route.ts`

**Current behavior (per Phase 1 diagnostic):**
- Writes `is_signed: true`, `signed_at`, `signed_by`, `is_locked: true`
- Does NOT update `status`

**New behavior:**
- Write `is_signed: true`, `signed_at: now()`, `signed_by: user.id`, `is_locked: true`
- Also write `status: 'pending_review'`
- After note update succeeds, create a submission row (see 2c)
- Return success including the new submission ID

**Validation before update:**
- Verify current note status is `'draft'` OR `'needs_revision'` (only these can be signed)
- If not, return 400 with clear error: "Only draft or revision-requested notes can be signed. Current status: {status}"

#### 2c — Submission writer (the bridge)

In the same `sign/route.ts`, after the note update succeeds:

```typescript
// Extract primary CPT code from the note's cpt_codes array (Option A: primary CPT per submission)
const primaryCptCode = note.cpt_codes?.[0] || '99213'; // fallback to default E&M code if none set
const icd10Codes = note.icd10_codes || [];

// Calculate or use placeholder billing amount
// TODO: Real billing calculation from CPT fee schedule. For now, use 0 and let auditor/admin set.
const billingAmount = 0.00;

const { data: submission, error: submissionError } = await supabase
  .from('submissions')
  .insert({
    note_id: noteId,
    patient_id: note.patient_id,
    provider_id: note.provider_id,
    organization_id: note.organization_id,
    cpt_code: primaryCptCode,
    icd10_codes: icd10Codes,
    billing_amount: billingAmount,
    status: 'pending_audit',
    // auditor_id, admin_approved_by, etc. remain NULL until assigned/approved
  })
  .select()
  .single();

if (submissionError) {
  // Rollback the note update or flag the inconsistency
  // For now, log and return partial success — the note is signed but submission failed
  console.error('Failed to create submission row:', submissionError);
  await logAuditEvent({
    action: 'SUBMISSION_CREATE_FAILED',
    entity_type: 'clinical_note',
    entity_id: noteId,
    user_id: user.id,
    details: { error: submissionError.message }
  });
  // Still return success on the note — but alert for investigation
  return NextResponse.json({ 
    success: true, 
    note, 
    submission: null, 
    warning: 'Note signed but submission creation failed' 
  });
}
```

**Audit logging:** log both the sign action AND the submission creation as separate audit events for HIPAA compliance.

#### 2d — Edge cases to handle

- **Note has no CPT codes:** Use a sensible default (`'99213'` for E&M follow-up) OR return an error asking clinician to add a CPT code first. Ask user which they prefer in the commit report if unclear — default to using `'99213'` and flagging for clinician review.
- **Note has no ICD-10 codes:** Empty array `[]` is acceptable per schema default.
- **Patient/provider/org IDs missing from note:** Should never happen (required on create), but handle gracefully.
- **Double-submit:** If clinician clicks twice rapidly, second request should fail the status check (note is now `pending_review`, not `draft`).

**Commit message:**
```
feat(notes): sign button now routes to auditor review with submission row

Implements the intended clinician-to-auditor workflow:

1. Relabeled "Sign Note" to "Sign & Send for Review" in the post-save 
   draft modal to match actual behavior
2. Sign route now sets status='pending_review' (not 'signed' directly) 
   and creates a submission row in pending_audit status
3. Status transition validated: only draft or needs_revision notes can 
   be signed
4. CPT: primary CPT code from note.cpt_codes[0] used per submission 
   (Option A). ICD-10 codes passed as array. Billing amount 
   placeholder 0.00 until fee schedule integration.

This is the bridge the auditor workflow needed. Previously, nothing 
wrote to submissions — now every signed note creates one for auditor 
review.

Does NOT set clinical_notes.status to 'signed'. That happens only 
after auditor approval (Phase B).
```

---

### Commit 3 — Fix the two wire bugs in auditor review

**File:** `src/app/auditor/notes/page.tsx` around line 86-90

**Current (broken):**
```typescript
body: JSON.stringify({ action, feedback: reviewFeedback })
```
Where `action` comes from UI as either `"approve"` or `"needs_revision"`.

**Fix:**
1. Rename action value `"needs_revision"` → `"request_revision"` to match API schema
2. Rename payload field `feedback` → `comments` to match API schema

Find the code that sets the action. Likely something like:
```typescript
const action = someCondition ? 'approve' : 'needs_revision';
```

Change to:
```typescript
const action = someCondition ? 'approve' : 'request_revision';
```

And change the fetch body:
```typescript
body: JSON.stringify({ action, comments: reviewFeedback })
```

**Verify the display label in the UI stays user-friendly.** If there's UI code that says "Request Revision" or similar, leave that — only the API payload needs the rename.

**Commit message:**
```
fix(auditor): align review action values and field names with API schema

Auditor notes page sent:
  { action: 'needs_revision', feedback: '...' }

API at /api/notes/[id]/review expected:
  { action: 'request_revision', comments: '...' }

Zod silently rejected the action, and comments were dropped because 
the schema didn't recognize 'feedback'. Result: Request Revision 
button appeared to do nothing, and even if it had worked, 
reviewer_feedback column would never populate.

Renamed:
- action 'needs_revision' → 'request_revision' (API value)  
- payload field 'feedback' → 'comments' (API field)

The UI display still says "Request Revision" — only the wire payload 
changed.
```

---

## Scope boundaries — Phase A

### IN scope
- `supabase/migrations/20260420000000_fix_submissions_note_fk.sql` (new)
- `src/app/api/notes/[id]/sign/route.ts` — new behavior
- `src/app/(app)/notes/new/page.tsx` — button label + any related
- Other files with "Sign Note" button language — consistent relabel
- `src/app/auditor/notes/page.tsx` — wire bug fixes
- `OBSERVABILITY_ROADMAP.md` — update with Phase A completion

### OUT of scope for Phase A (these are Phase B)
- Wiring auditor approval → clinical_notes.status='signed'
- Enforcing all workflow transitions server-side (PATCH handler gate)
- Backfilling the 8 broken rows
- Seeding test AUDITOR user or auditor_organizations
- Any changes to admin-facing UI
- Any changes to /auditor/billing/* pages

### Do NOT touch
- AI note generation pipeline
- ICD-10 code extraction/suggestion
- Smart Triage
- Patient context helper
- Timezone helper
- Dashboard queries
- Any file outside the list above

---

## Pre-implementation verification

Before writing code, confirm:

1. Which file has the Save Draft modal + Sign button? (likely `src/app/(app)/notes/new/page.tsx` but grep to confirm)
2. Does the sign route already check for a specific current status? (if yes, adjust the new validation; if no, add fresh)
3. Is there audit-logging infrastructure we should hook into when creating submissions? (look for `logAuditEvent` or similar helper)
4. Does `clinical_notes.cpt_codes` have a consistent array format at time of sign? (it should — we fixed persistence earlier today)

Report these before implementing. If anything surprising surfaces, stop and ask.

---

## Reporting after Phase A

Three separate commit SHAs + deploy status. For each:

- Files changed
- Local build result
- Key snippets of what changed (especially the new submission insert logic)
- Any edge cases encountered

For Commit 1 specifically:
- Whether the migration was applied to production (and how — SQL Editor, CLI, etc.)
- Verification query result showing the FK now points at clinical_notes

---

## Testing plan (user will run after Phase A deploys)

Don't run yet. After all 3 commits deploy:

### Test 1 — Sign button new behavior
1. Log in as Test Clinician
2. Navigate to Test Patient, create new encounter, write a note (dictate anything)
3. Click "Save Draft"
4. Modal appears with "Sign & Send for Review" button
5. Click it
6. Expected: note's status becomes `pending_review`, NOT `signed`
7. Verify in SQL:
   ```sql
   SELECT id, status, signed_at, is_signed 
   FROM clinical_notes 
   WHERE patient_id = '9c50ac6f-9abb-4439-b654-70a69c751165' 
   ORDER BY created_at DESC LIMIT 1;
   ```

### Test 2 — Submission row created
1. After Test 1, verify a submission row exists:
   ```sql
   SELECT id, note_id, status, cpt_code, icd10_codes 
   FROM submissions 
   ORDER BY created_at DESC LIMIT 1;
   ```
2. Expected: one row with status='pending_audit', note_id matching the note from Test 1

### Test 3 — Clinician can't edit during review
1. After Test 1, try to edit the note
2. Expected: edit UI is gated — `isEditable = false` because status='pending_review'

### Test 4 — Auditor can see it
1. Log in as AUDITOR user (you'll need to seed one — that's Phase B)
2. Navigate to `/auditor/notes`
3. Expected: Test Clinician's note appears in the review queue

(Skip Test 4 until Phase B seeds AUDITOR. Tests 1-3 work now.)

### Test 5 — Wire bug fix (requires AUDITOR)
1. As AUDITOR, click Request Revision with feedback text
2. Expected: 200 response, note status becomes 'needs_revision', reviewer_feedback populated

(Also Phase B — needs seeded AUDITOR.)

---

## After Phase A ships cleanly

Confirm tests 1-3 pass. Then I write Phase B (auditor approval wiring, workflow transition enforcement, backfill, seed data).

Phase A only: ship clean, verify, move on.