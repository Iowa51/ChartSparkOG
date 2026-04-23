# CODEX_VERIFY_SESSIONS_1_8.md

Read-only verification audit. Do NOT fix or commit anything.

14 commits shipped today across 8 sessions. Verify each fix landed correctly.

## Session 1 — Quick fixes

V1. src/app/(admin)/admin/analytics/page.tsx — confirm it references provider_id, NOT user_id, for submission queries.

V2. src/app/api/ai/generate-note/route.ts — confirm response key is hasClinicianInput, NOT hasClinicalInput.

V3. Confirm src/lib/demo-data/patients.ts does NOT exist. If it exists, flag.

V4. Grep src/lib/types/database.ts and src/lib/validation/schemas.ts for the string "amended". Should NOT appear in any note status enum.

## Session 2 — ICD-10 hardening

V5. src/app/(app)/notes/new/page.tsx normalizeSuggestedCodes — confirm every code goes through .trim().toUpperCase() before being returned.

V6. src/app/api/ai/generate-note/route.ts — confirm active-problem ICD-10 codes are .trim().toUpperCase() before dedup.

V7. src/lib/billing/code-analyzer.ts — confirm output codes are .trim().toUpperCase().

V8. src/app/(app)/notes/new/page.tsx — confirm there is a useEffect that fetches note data when editId is set and hydrates suggestedCodes from saved cpt_codes/icd10_codes.

## Session 3 — Emoji cleanup

V9. Grep these 4 files for any emoji characters (Unicode ranges U+1F300-U+1FAFF, or common ones like emoji, checkmarks, warning signs):
- src/components/smart-triage/MedicationSafetyCard.tsx
- src/components/smart-triage/LabMonitoringCard.tsx
- src/components/smart-triage/PrescribingCheckDialog.tsx
- src/lib/ai/smart-triage-prompts.ts

Report any remaining emoji with file and line number. Should be zero.

## Session 4 — notes vs clinical_notes

V10. Run: grep -r "\.from(['\"]notes['\"])" src/
Should return ZERO matches. All note reads must use clinical_notes.

V11. src/lib/managed-billing/claim-generator.ts — confirm it uses .from('clinical_notes') and selects content (not note_content).

## Session 5 — Sentry PHI scrubbing

V12. Confirm src/lib/sentry/scrub-phi.ts exists and exports a beforeSend function.

V13. Confirm sentry.server.config.ts, sentry.edge.config.ts, and sentry.client.config.ts all import and use the beforeSend hook.

V14. Confirm sentry.client.config.ts has replaysSessionSampleRate: 0 and replaysOnErrorSampleRate: 0.

V15. Check the PHI field list in scrub-phi.ts includes at minimum: patient_id, patient_name, first_name, last_name, date_of_birth, ssn, mrn, content, transcript, subjective, objective, assessment, plan, chief_complaint, medications, allergies, problems.

## Session 6 — Env validation

V16. Confirm src/lib/env.ts exists with a Zod schema.

V17. Confirm src/app/layout.tsx imports '@/lib/env' as a side-effect.

V18. Count how many env vars are in the schema. Should be 40+.

## Session 7 — DB migration

V19. Confirm supabase/migrations/20260423000000_inline_expiration_drop_orphan.sql exists.

V20. Confirm it contains CREATE OR REPLACE FUNCTION check_expired_invitations() with the UPDATE logic inlined.

V21. Confirm it contains DROP FUNCTION IF EXISTS expire_old_invitations().

## Session 8 — Admin role change

V22. Confirm src/app/api/admin/users/[userId]/role/route.ts exists.

V23. Verify role hierarchy logic: ADMIN cannot grant ADMIN, cannot touch SUPER_ADMIN, can only swap USER and AUDITOR.

V24. Verify self-change prevention (caller cannot change own role).

V25. Verify audit logging with eventType USER_ROLE_CHANGE.

V26. Verify rate limiting is applied (check for roleChange in rate-limit.ts).

V27. Confirm src/app/api/admin/users/route.ts GET endpoint exists and returns users with role field.

V28. Confirm src/components/admin/ChangeRoleModal.tsx exists with confirmation step and API integration.

V29. Confirm src/app/(admin)/admin/users/page.tsx renders the ChangeRoleModal.

## Build

V30. Run npm run build and report pass/fail.

## Output format

| Item | Status | Evidence |
|------|--------|----------|
| V1   | PASS / FAIL | one-line proof |
| V2   | ... | ... |

At the end, list any FAIL items with details.