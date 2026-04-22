# Phase A Fix — Auditor Workflow Activation

## Context

ChartSparkOG Phase A auditor workflow is broken. The "Sign & Send for Review" button in the post-save modal does nothing visible — no error, no toast, no status change, no submission row created. Two layered problems:

1. **The modal button is not calling the new sign route.** It is likely still wired to the legacy `handleSubmitClaim` / `PATCH /api/notes/[id]` path.
2. **Even if it WERE wired correctly, the sign route would crash** because it writes to `is_signed` and `is_locked` columns that do not exist in production `clinical_notes`.

The broken commit is `cfdc6f4` (Phase A Commit 2: Sign rewire + submission writer). Do NOT revert it — fix forward.

## Confirmed facts — production database diagnostic (do not re-check, these are authoritative)

`clinical_notes` table in production has exactly these 18 columns:

- id, patient_id, organization_id, provider_id, encounter_id, template_id
- subjective, objective, assessment, plan, content
- cpt_codes (text[]), icd10_codes (text[]), billing_amount (numeric, default 0)
- status (text, default 'draft')
- signed_at (timestamptz, nullable)
- created_at, updated_at

These columns DO NOT EXIST in production and must not be written to anywhere in the sign flow:

- `is_signed`, `is_locked`, `signed_by`, `locked_at`
- `reviewer_feedback`, `reviewed_at`, `reviewed_by`

`submissions` table in production has these relevant columns:

- id, note_id (FK → clinical_notes.id), patient_id, provider_id, organization_id
- cpt_code (text), icd10_codes (text[]), billing_amount (numeric)
- status (text, default 'pending_audit')
- auditor_id, auditor_status, admin_approved_by, admin_approved_at
- submission_date, payment_date, rejection_reason, created_at, updated_at

## Your task

### Step 1 — Diagnose (read, do not guess)

Read these three files in full:

1. `src/app/api/notes/[id]/sign/route.ts`
2. `src/app/(app)/notes/[id]/page.tsx`
3. `src/app/(app)/notes/new/page.tsx`

For each, identify and report:

- Where the "Sign & Send for Review" button is rendered (file + line number)
- What its onClick handler does (function name, body)
- What HTTP method and path it actually calls (GET / POST / PATCH / PUT + URL)
- For the sign route specifically: the exact UPDATE payload it writes to `clinical_notes`, and whether it inserts into `submissions`

Also grep the full repo for these identifiers and list every file and line that references them:

- `is_signed`
- `is_locked`
- `signed_by`
- `locked_at`
- `reviewer_feedback`
- `reviewed_at`
- `reviewed_by`

Report ALL findings before making any code changes.

### Step 2 — Fix the sign route

File: `src/app/api/notes/[id]/sign/route.ts`

The UPDATE to `clinical_notes` must only reference columns that exist in production. Allowed columns for the sign operation:

- `status` → `'pending_review'`
- `signed_at` → `new Date().toISOString()`
- `updated_at` → `new Date().toISOString()`

Remove every reference to `is_signed`, `is_locked`, `signed_by`, `locked_at` from the UPDATE payload and from any Zod schema or TypeScript type this route imports.

After the UPDATE succeeds, INSERT one row into `submissions` with:

- `note_id`: the note's id
- `patient_id`: the note's patient_id
- `provider_id`: the note's provider_id
- `organization_id`: the note's organization_id
- `cpt_code`: `note.cpt_codes?.[0] ?? null`
- `icd10_codes`: `note.icd10_codes ?? []`
- `billing_amount`: `note.billing_amount ?? 0`
- `status`: `'pending_audit'` (set explicitly even though it's the column default)

If the INSERT fails, roll back the UPDATE (set status back to `'draft'`, signed_at back to null, updated_at back to its pre-UPDATE value). Do not leave the note in a half-signed state.

Emit two audit log events (use the same audit helper already used elsewhere in this repo — do not invent a new one):

- `NOTE_SIGN` with entity_type=`'clinical_note'` and entity_id=note.id
- `SUBMISSION_CREATE` with entity_type=`'submission'` and entity_id=submission.id

Return `200` with JSON `{ noteId, submissionId, status: 'pending_review' }` on success. Return `4xx` with `{ error: string }` on client errors and `500` with `{ error: string }` on server errors. Never return 200 when the submission insert failed.

### Step 3 — Fix the modal button wiring

In whichever file(s) contain the "Sign & Send for Review" button (identified in Step 1), the onClick handler must:

- Call `POST /api/notes/${noteId}/sign`
- Send `Content-Type: application/json` with an empty body `{}`
- On 200 response: close the modal, show a success toast ("Sent for review"), and redirect to `/notes`
- On non-200 response: show an error toast with `(await res.json()).error ?? 'Failed to sign note'` and keep the modal open
- Disable the button and show a loading state (spinner or "Sending…") while the request is in flight
- Be idempotent — clicking twice rapidly must not submit twice

Remove every call to `handleSubmitClaim`, `submitClaim`, `submit-claim`, or `PATCH /api/notes/[id]` that lives inside the post-save modal flow. Those functions can still exist for other paths (admin, super-admin managed billing) — do not delete them. Only disconnect them from the clinician post-save modal.

### Step 4 — TypeScript cleanup

Grep the full repo for `is_signed`, `is_locked`, `signed_by`, `locked_at`, `reviewer_feedback`, `reviewed_at`, `reviewed_by`.

For each hit:

- If it's in a TypeScript type file, Zod schema, or database type definition — remove it.
- If it's in application code that reads/writes these fields — adjust to use only columns that exist (status + signed_at).
- If it's in an unapplied migration SQL file — leave it, but list it in the report.

The production schema is the source of truth. Types must match production, not aspiration.

### Step 5 — Build

Run `npm run build` locally. It must pass. If it fails in files unrelated to the sign/submission flow, stop and list the failures in your report before touching anything else.

### Step 6 — Commit and push

Two separate commits so Codex can verify each independently:

Commit 1 — schema alignment:

```
fix(auditor): remove is_signed/is_locked from sign route + types

Production clinical_notes schema does not have is_signed, is_locked,
signed_by, or locked_at columns. Sign route now writes only status,
signed_at, updated_at. Strips these fields from all TypeScript types
and Zod schemas in the repo so the compiler catches future drift.
```

Commit 2 — button rewire:

```
fix(auditor): wire Sign & Send for Review button to /sign route

The post-save modal button was still calling the legacy
handleSubmitClaim path (PATCH /api/notes/[id]). It now POSTs to
/api/notes/[id]/sign, which transitions the note to pending_review
and creates the corresponding submissions row for auditor review.

Adds loading state, error toast, idempotent double-click guard, and
success redirect to /notes.
```

Both commits: `git commit --no-verify` and `git push --no-verify`.

Confirm `gh auth status` shows `Iowa51` as the active account before pushing. If it shows a different account, run `gh auth switch` to Iowa51 first.

### Step 7 — Report

Write `PHASE_A_FIX_REPORT.md` in the repo root containing:

1. **Step 1 findings** — exact file + line number for each button, the onClick handler bodies, the sign route's current UPDATE payload, and the full list of files/lines referencing the seven non-existent column names.
2. **Files changed** — each file with a one-sentence description of the change.
3. **Commit SHAs** — both commits.
4. **Local build** — pass/fail, duration, and any warnings.
5. **Push confirmation** — remote + branch + result.
6. **Follow-ups / anomalies** — anything suspicious you noticed that is NOT in scope for Phase A. Examples: other files still calling legacy submit-claim paths, migrations that are unapplied in production, type definitions for columns that don't exist elsewhere, places the `reviewer_feedback` column is read but the column is absent from prod. Do not fix these — just list them.

## Hard rules

- Do NOT run tests against production.
- Do NOT revert commit `cfdc6f4`. Fix forward.
- Do NOT start Phase B (auditor approval wiring, workflow transitions, backfill, auditor seed). Stop after pushing Commit 2 and writing the report.
- Do NOT touch files outside the sign flow unless the build fails because of them — in which case report first, fix second.
- All commits use `--no-verify`.