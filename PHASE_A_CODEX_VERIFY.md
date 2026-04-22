# Phase A Codex Verification

## Context

Claude Code just completed a two-commit fix for Phase A of the ChartSparkOG auditor workflow. Your job is to independently verify the commits against the specification in `PHASE_A_FIX.md` (same repo root). Do not trust CC's self-report in `PHASE_A_FIX_REPORT.md` — read the actual code.

## Commits to verify

- `3ccbf7a122fc62179d30f7168671b729dfc44053` — schema alignment (is_signed/is_locked/signed_by/locked_at removal)
- `685809e0e915966783e0004a0526ccd927f2da80` — button rewire (Sign & Send for Review → POST /sign)

Base comparison against `6e699a9` (the pre-fix production state).

## Confirmed production schema facts (authoritative — do not re-check)

`clinical_notes` columns that DO exist: id, patient_id, organization_id, provider_id, encounter_id, template_id, subjective, objective, assessment, plan, content, cpt_codes, icd10_codes, billing_amount, status, signed_at, created_at, updated_at.

`clinical_notes` columns that DO NOT exist in production: is_signed, is_locked, signed_by, locked_at, reviewer_feedback, reviewed_at, reviewed_by.

`submissions` columns: id, note_id, patient_id, provider_id, organization_id, cpt_code, icd10_codes, billing_amount, status (default 'pending_audit'), auditor_id, auditor_status, admin_approved_by, admin_approved_at, submission_date, payment_date, rejection_reason, created_at, updated_at.

## Verification checklist

For each item below, output PASS, FAIL, or CONCERN with a one-sentence justification and file:line references. Do not hedge — if something is wrong, say it's wrong.

### Commit 3ccbf7a — schema alignment

1. `src/app/api/notes/[id]/sign/route.ts` UPDATE payload to `clinical_notes` references only `status`, `signed_at`, and `updated_at`. No reference to is_signed, is_locked, signed_by, locked_at anywhere in this file.

2. `status` is set to `'pending_review'` (not `'signed'`, not `'submitted'`, not anything else).

3. `signed_at` is set to `new Date().toISOString()` or equivalent (not a hardcoded string, not null).

4. Grep the full repo for `is_signed`, `is_locked`, `signed_by`, `locked_at`. For each remaining hit (if any), confirm it is either (a) in an unapplied migration SQL file, or (b) in a code comment. Any hit in live TypeScript, Zod schemas, or runtime logic is a FAIL.

5. Grep the full repo for `reviewer_feedback`, `reviewed_at`, `reviewed_by`. Same rule — live references outside migrations are a FAIL. Report every hit regardless.

### Commit 685809e — button rewire

6. The "Sign & Send for Review" button's onClick handler calls `POST /api/notes/${noteId}/sign` (or equivalent template literal). Confirm the method is POST, not PATCH or PUT.

7. The button is disabled while the request is in flight, and shows a loading state (spinner, "Sending…", or equivalent). Idempotent — a double-click cannot submit twice.

8. On 200 response: modal closes, success toast renders, redirect to `/notes`. Verify the redirect is `/notes`, not `/dashboard` or `/notes/[id]`.

9. On non-200 response: error toast shows the response body's `error` field (with a reasonable fallback string). Modal stays open so the user can retry or cancel.

10. The ConfirmModal timing issue (modal closing before error toast could render, per CC's §1 finding) is resolved. Confirm the modal close is sequenced AFTER the response is handled, not before the fetch call.

### Sign route submission insert

11. After the `clinical_notes` UPDATE succeeds, an INSERT into `submissions` fires with these columns: note_id, patient_id, provider_id, organization_id, cpt_code (first element of cpt_codes array or null), icd10_codes, billing_amount, status ('pending_audit').

12. No reference in this INSERT to columns that do not exist in the submissions schema (listed above).

13. If the submission INSERT fails, the clinical_notes UPDATE is rolled back — status reverts to 'draft', signed_at reverts to null. Verify this rollback path exists and is tested by at least one early-return or try/catch structure.

14. The route returns 200 ONLY when both operations succeed. If the submission INSERT fails, the route returns a 5xx with an error message.

### Audit events

15. `NOTE_SIGN` event fires with entity_type='clinical_note' and entity_id=note.id after the UPDATE.

16. `SUBMISSION_CREATE` event fires with entity_type='submission' and entity_id=submission.id after the INSERT.

17. Both audit events use the same audit helper used elsewhere in the repo (grep for existing `NOTE_CREATE` or `NOTE_VIEW` call sites and compare). If CC invented a new audit helper, flag it.

### Regression checks

18. Legacy `handleSubmitClaim` / `submitClaim` functions still exist in admin and super-admin managed-billing flows (expected — they handle post-approval submission to insurance, not the clinician post-save modal). Verify these were NOT deleted.

19. `src/app/(app)/notes/[id]/page.tsx` — the note editor for existing notes — is reachable for notes in status `draft` and `needs_revision` (the `isEditable` gate). Confirm the fix did not break the edit gate.

20. `src/app/(app)/notes/new/page.tsx` — the new note page — still functions for note creation (the modal only fires after save). Confirm the save flow itself was not modified unless explicitly necessary for the fix.

### Build and lint

21. Run `npm run build` in the repo root. Report pass/fail, duration, and any warnings (even if build passes).

22. Run `npm run lint` if the repo has a lint script in package.json. Report any new errors introduced by the two commits.

## Deliverable

Write `PHASE_A_CODEX_VERIFICATION.md` in the repo root with:

- Verdict: PASS / FAIL / PASS WITH CONCERNS
- Item-by-item table: 1–22, each with PASS/FAIL/CONCERN, one-sentence justification, file:line references
- Remaining ghost-column references: full list of every file:line where is_signed / is_locked / signed_by / locked_at / reviewer_feedback / reviewed_at / reviewed_by still appear, categorized as (migration SQL / comment / live code)
- Regression risks: anything you spotted that wasn't on the checklist but could affect production
- Recommendation to James: safe to runtime test in browser, or block and fix first?

Do not modify any code. Do not run tests against production. Read-only verification.