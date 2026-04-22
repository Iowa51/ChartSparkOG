# Phase A Codex Verification

## Verdict

**FAIL**

The two commits materially improved the sign route and modal sequencing, but Phase A is not fully clean: ghost `clinical_notes` review columns still appear in live runtime code, and the post-save `Sign & Send for Review` CTA in `src/app/(app)/notes/new/page.tsx` still redirects to `/notes/[id]?action=submit` instead of issuing the `POST /api/notes/${noteId}/sign` call directly.

## Item-by-item Checklist

| # | Status | Verification |
| --- | --- | --- |
| 1 | PASS | `src/app/api/notes/[id]/sign/route.ts` updates only `status`, `signed_at`, and `updated_at`; no `is_signed`, `is_locked`, `signed_by`, or `locked_at` references remain in that file (`src/app/api/notes/[id]/sign/route.ts:99-110`). |
| 2 | PASS | The sign route writes `status: "pending_review"` exactly, not `signed` or another terminal state (`src/app/api/notes/[id]/sign/route.ts:102`). |
| 3 | PASS | `signed_at` is set from `const signedAt = new Date().toISOString()` and then written through the update payload (`src/app/api/notes/[id]/sign/route.ts:95,103`). |
| 4 | PASS | Remaining `is_signed` / `is_locked` / `signed_by` / `locked_at` hits are comments, docs, reports, migrations, or a test script; I found no live TS/Zod/runtime use of those fields in the production path after this fix (`src/lib/validation/schemas.ts:201-202`, `scripts/test-all-routes.ts:243,332`, `supabase/migrations/20260210_add_review_statuses.sql:12-14`). |
| 5 | FAIL | Ghost review-column references still exist in live runtime code: the review API writes `reviewed_at` / `reviewer_feedback`, and the note page still types and renders `reviewer_feedback` / `reviewed_at` from `clinical_notes` even though prod does not have those columns (`src/app/api/notes/[id]/review/route.ts:87,92`, `src/app/(app)/notes/[id]/page.tsx:45-46,362,368-371`). |
| 6 | FAIL | The existing-note confirm flow does `POST /api/notes/${id}/sign` (`src/app/(app)/notes/[id]/page.tsx:126-145,721`), but the post-save `Sign & Send for Review` CTA in `notes/new` still only redirects to `/notes/${savedNoteId}?action=submit` instead of calling `/sign` directly (`src/app/(app)/notes/new/page.tsx:2451-2455`). |
| 7 | PASS | The actual submit-for-review path is idempotent and shows loading state: it guards on `if (signing) return`, passes `isLoading={signing}`, and renders `loadingText="Sending…"` with `asyncConfirm` (`src/app/(app)/notes/[id]/page.tsx:128,721,727-729`; `src/components/ui/ConfirmModal.tsx:20-25,38-40,128,141-144`). |
| 8 | PASS | On success the confirm modal closes, a success message is set, and the page redirects to `/notes` exactly (`src/app/(app)/notes/[id]/page.tsx:148-150`). |
| 9 | PASS | On non-200 the handler reads `errorData.error || "Failed to sign and send for review"` and returns before closing the modal, so the user can retry or cancel (`src/app/(app)/notes/[id]/page.tsx:136-146`). |
| 10 | PASS | The modal-timing bug is fixed: `ConfirmModal` only auto-closes when `!asyncConfirm`, and this flow opts into `asyncConfirm`, so close happens after the fetch succeeds rather than before it starts (`src/components/ui/ConfirmModal.tsx:25,135-139`; `src/app/(app)/notes/[id]/page.tsx:727`). |
| 11 | PASS | After the note update, the route inserts into `submissions` with `note_id`, `patient_id`, `provider_id`, `organization_id`, `cpt_code`, `icd10_codes`, `billing_amount`, and `status: "pending_audit"` exactly as required (`src/app/api/notes/[id]/sign/route.ts:125-138`). |
| 12 | PASS | The submissions insert does not reference non-existent submissions columns; it stays within the confirmed schema surface (`src/app/api/notes/[id]/sign/route.ts:127-135`). |
| 13 | PASS | If the submissions insert fails, the route explicitly rolls the note back to captured prior values (`priorStatus`, `priorSignedAt`, `priorUpdatedAt`) and returns a server error, which is stronger than hardcoding `draft`/`null` (`src/app/api/notes/[id]/sign/route.ts:81-88,140-184`). |
| 14 | PASS | The route returns 200 only on the full happy path; the submission-failure branch returns 500 with a rollback error message (`src/app/api/notes/[id]/sign/route.ts:182-184,235-239`). |
| 15 | PASS | `NOTE_SIGN` is emitted after the update with `resourceType: "clinical_note"` and `resourceId: noteId` (`src/app/api/notes/[id]/sign/route.ts:200-216`). |
| 16 | PASS | `SUBMISSION_CREATE` is emitted after the insert with `resourceType: "submission"` and `resourceId: submission.id` (`src/app/api/notes/[id]/sign/route.ts:218-233`). |
| 17 | PASS | Both events use the repo’s existing audit helper `logAuditEventAsync`, the same helper pattern already used in other API routes (`src/app/api/notes/[id]/sign/route.ts:11,200-233`; `src/lib/security/audit-log.ts:177-187`; `src/app/api/managed-billing/claims/route.ts:68,189`). |
| 18 | PASS | Legacy claim-submission handlers still exist in both managed-billing admin surfaces, so the Phase A fix did not delete the insurance-submission path (`src/app/(admin)/admin/managed-billing/claims/page.tsx:129,313`; `src/app/(admin)/super-admin/managed-billing/claims/page.tsx:142,360`). |
| 19 | PASS | Existing notes remain editable for `draft` and `needs_revision` through the unchanged `isEditable` gate (`src/app/(app)/notes/[id]/page.tsx:343`). |
| 20 | PASS | The new-note save flow still saves first and only shows the success modal after a successful response; the main change is the post-save CTA routing to the existing-note review flow (`src/app/(app)/notes/new/page.tsx:1071,1102,1119-1120,2429-2461`). |
| 21 | PASS | `npm run build` passed in about 126s; build completed successfully but emitted warnings, including Sentry/Next.js deprecation noise around the middleware convention and build-time configuration. |
| 22 | CONCERN | `npm run lint` exists but currently fails repo-wide with 1025 findings (468 errors, 557 warnings), including many unrelated files, so I cannot attribute a clean “new errors introduced by these two commits” result from the global lint run alone. |

## Remaining Ghost-column References

### Live Code

- `src/app/api/notes/[id]/review/route.ts:87` — `reviewed_at` write against `clinical_notes` runtime path.
- `src/app/api/notes/[id]/review/route.ts:92` — `reviewer_feedback` write against `clinical_notes` runtime path.
- `src/app/(app)/notes/[id]/page.tsx:45` — `reviewer_feedback?: string` still typed on the note model.
- `src/app/(app)/notes/[id]/page.tsx:46` — `reviewed_at?: string` still typed on the note model.
- `src/app/(app)/notes/[id]/page.tsx:362` — UI branch checks `note.reviewer_feedback`.
- `src/app/(app)/notes/[id]/page.tsx:368` — UI renders `note.reviewer_feedback`.
- `src/app/(app)/notes/[id]/page.tsx:369` — UI checks `note.reviewed_at`.
- `src/app/(app)/notes/[id]/page.tsx:371` — UI renders `new Date(note.reviewed_at)`.
- `src/app/api/admin/profile-approvals/route.ts:48` — `reviewed_by` write, but for `pending_profile_changes`, not `clinical_notes`.
- `src/app/api/admin/profile-approvals/route.ts:49` — `reviewed_at` write, but for `pending_profile_changes`, not `clinical_notes`.
- `src/app/api/admin/profile-approvals/route.ts:66` — `reviewed_by` write, but for `pending_profile_changes`, not `clinical_notes`.
- `src/app/api/admin/profile-approvals/route.ts:67` — `reviewed_at` write, but for `pending_profile_changes`, not `clinical_notes`.
- `src/lib/types/smart-triage.ts:125` — `reviewed_by` type on `vitals_triage`, not `clinical_notes`.
- `src/lib/types/smart-triage.ts:126` — `reviewed_at` type on `vitals_triage`, not `clinical_notes`.
- `scripts/test-all-routes.ts:243` — `is_signed` remains in a test script payload.
- `scripts/test-all-routes.ts:332` — `is_signed` remains in test-script explanatory text.

### Migration SQL / SQL Docs

- `supabase/migrations/20260210_add_review_statuses.sql:12` — `reviewer_feedback`.
- `supabase/migrations/20260210_add_review_statuses.sql:13` — `reviewed_at`.
- `supabase/migrations/20260210_add_review_statuses.sql:14` — `reviewed_by`.
- `supabase/migrations/20260218_vitals_triage_tables.sql:110` — `reviewed_by` on `vitals_triage`.
- `supabase/migrations/20260218_vitals_triage_tables.sql:111` — `reviewed_at` on `vitals_triage`.
- `supabase/migrations/20260125120002_pending_profile_changes.sql:13` — `reviewed_by` on `pending_profile_changes`.
- `supabase/migrations/20260125120002_pending_profile_changes.sql:14` — `reviewed_at` on `pending_profile_changes`.
- `docs/db/migration_2026_01_05.sql:111` — `signed_by` in documentation SQL.

### Comments / Docs / Reports

- `src/lib/validation/schemas.ts:201-202` — comment documenting removed ghost note columns.
- `APPROVE_DASHBOARD_STATS_FIX.md:19`
- `AUDITOR_PHASE_A.md:136,140,278,360,388`
- `AUDIT_REPORT.md:90`
- `FIX_SUBMIT_PATH_AND_INVESTIGATE_AUDITOR.md:5,29,36,45,49,101,102,110`
- `PHASE_A_FIX.md:8,25-26,55-61,75,112,133,135-136,168`
- `PHASE_A_CODEX_VERIFY.md:9,18,28,34,36,88`
- `OBSERVABILITY_ROADMAP.md:385`
- `PHASE_A_FIX_REPORT.md:43,45,53,55-56,59,62,71,79,83,87,89,94,103,117-121,135,160-162,167,171-172`
- `reports/junior-dev-advocate-report.md:205`
- `reports/api-designer-report.md:407`
- `reports/api-designer-final-report.md:215,219,221`

## Regression Risks

- The biggest production risk left in this area is not the sign route anymore; it is the review route still writing `reviewer_feedback` and `reviewed_at` to `clinical_notes`, which will fail against the stated production schema.
- The Phase A spec said the post-save `Sign & Send for Review` CTA should call `/api/notes/${noteId}/sign` directly, but the implementation still uses a redirect hop through `/notes/[id]?action=submit`; that is functionally workable, but it is not the exact wiring requested and leaves more UI state between save and sign.
- The lingering `scripts/test-all-routes.ts` references to `is_signed` mean local test collateral is already stale relative to the production schema, so future debugging can drift again unless that script is cleaned up.
- Global lint is noisy enough that it will not reliably protect this workflow today; a future regression in these touched files could be buried under unrelated repository-wide failures.

## Recommendation to James

**Block and fix first.**

The sign route itself is in much better shape and is probably browser-testable in isolation, but Phase A as specified is not complete because live code still references non-existent `clinical_notes` review columns and the post-save CTA wiring does not match the requested direct-POST design. Fix those before treating this as runtime-test ready.
