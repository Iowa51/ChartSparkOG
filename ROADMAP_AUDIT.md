# ROADMAP_AUDIT.md

Read CLAUDE.md first. This is a READ-ONLY audit. Do NOT fix anything. Do NOT commit anything.

Your job: check each item below against the current codebase and report its status as one of:
- FIXED — code already handles this correctly
- PARTIALLY FIXED — some work done, remaining gap described
- STILL BROKEN — no fix present
- NOT APPLICABLE — feature/file no longer exists or was replaced

For each item, cite the specific file and line number (or absence) that proves your finding.

Run npm run build at the end to confirm the codebase compiles.

---

## GROUP A — Quick fixes to verify

A1. Admin analytics user_id vs provider_id
Check src/app/(admin)/admin/analytics/page.tsx around line 121. Does it reference submissions.user_id or submissions.provider_id?

A2. hasClinicalInput typo
Check src/app/api/ai/generate-note/route.ts for a variable named hasClinicalInput. Is it misspelled or correctly named? Is it used anywhere?

A3. returnTo param on /patients/new
Check src/app/(app)/patients/new/page.tsx. After successfully creating a patient, does the redirect honor a returnTo query param? Or does it hardcode a destination?

A4. Orphaned demo patients file
Check if src/lib/demo-data/patients.ts exists. If yes, grep the entire codebase for imports of this file. List every file that imports it. If zero imports, mark as safe to delete.

---

## GROUP B — Table and schema issues

B1. notes vs clinical_notes table confusion
Grep the entire src/ directory for the string "clinical_notes" and separately for references to a table named "notes" (in Supabase .from() calls). List every file and line that references each. Which table does the app actually write notes to?

B2. encounters.ts relational embed
Check src/lib/data/encounters.ts around lines 124 and 188. Does it use notes:clinical_notes(*) syntax? Is that valid given the actual table name?

B3. Dual signed-tracking on notes
Check src/app/api/notes/[id]/sign/route.ts. When a note is signed, does the route update:
- status column? To what value?
- is_signed column?
- signed_at column?
- is_locked column?
Do all four columns exist in the schema? Check the Zod schema or any type definition for clinical_notes/notes.

B4. Note status state machine
Grep for every distinct status value used anywhere in the codebase for notes (draft, completed, signed, amended, pending_review, approved, needs_revision). For each value, is it ever SET anywhere (INSERT or UPDATE), or only checked/filtered?

---

## GROUP C — AI and clinical safety

C1. AI hallucination grounding
Read src/app/api/ai/generate-note/route.ts. Find the system prompt sent to Azure OpenAI. Does it contain grounding instructions like "only include facts from the input" or "do not infer medication names"? Quote the relevant prompt text.

C2. AI disclaimer banner
Search for the AI disclaimer banner (commit 9181838 from session history). Is it still present and visible on the notes/new page when AI content is generated? Which component renders it?

C3. ICD-10 auto-suggestion gating
When AI generates a note, how are ICD-10 codes suggested? Are they pulled from:
- Patient active problems only?
- AI inference from note text?
- Both?
Check the generate-note route and the code-analyzer/code-library modules.

---

## GROUP D — ICD-10 hardening

D1. Whitespace trimming on ICD-10 codes
Grep for every .trim() call near ICD-10 code handling. Are codes trimmed before comparison and dedup?

D2. Case normalization
Are ICD-10 codes uppercased before comparison? Check normalizeSuggestedCodes, quickSuggestCodes, and any dedup logic.

D3. Edit path source-tag
When a saved note is loaded for editing on /notes/[id], how are stored code strings reconstructed into the SuggestedCode shape? What source tag do they get?

D4. Static code-library entries
Spot-check 5 random entries in src/lib/billing/code-library.ts for whitespace, lowercase, or format issues.

---

## GROUP E — Emoji and UI cleanup

E1. Check these specific files for emoji characters:
- src/components/smart-triage/MedicationSafetyCard.tsx
- src/components/smart-triage/LabMonitoringCard.tsx
- src/components/smart-triage/PrescribingCheckDialog.tsx
- src/lib/ai/smart-triage-prompts.ts

List every emoji found with file and line number.

---

## GROUP F — Infrastructure

F1. Sentry configuration
Is @sentry/nextjs in package.json? Is there a sentry.client.config.ts or sentry.server.config.ts? Is SENTRY_DSN referenced anywhere? Is there a beforeSend hook that scrubs PHI?

F2. Environment variable validation
Does src/lib/env.ts exist? Is there any Zod-based env validation at startup? Or do files read process.env directly?

F3. Orphaned trigger function
Does the codebase contain any migration file or SQL reference to expire_old_invitations()? Is there a migration file for check_expired_invitations?

---

## GROUP G — Role system

G1. Role vocabulary
Grep for the string 'USER' used as a role value (not as a generic word). List every file. Is CLINICIAN used anywhere as a role value?

G2. Admin role change endpoint
Does /api/admin/users/[id]/role or any equivalent endpoint exist? Check src/app/api/admin/users/ directory.

---

## OUTPUT FORMAT

Present your findings as a table:

| Item | Status | Evidence |
|------|--------|----------|
| A1   | FIXED / STILL BROKEN / etc | file:line — what you found |

After the table, list ONLY the items marked STILL BROKEN or PARTIALLY FIXED, grouped by estimated effort (small / medium / large).

Do NOT fix anything. Do NOT commit anything.