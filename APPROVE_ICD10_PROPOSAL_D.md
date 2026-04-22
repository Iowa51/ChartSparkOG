# APPROVE_ICD10_PROPOSAL_D.md

## Approval — Execute Proposal D

Excellent diagnostic. Your root-cause analysis correctly identified three nested issues:
1. The old codes were grounded in AI hallucinations (killed by design in c3e30e4)
2. Codes have never been persisted from /notes/new to the database (pre-existing bug)
3. No grounded "pull from patient problems" pipeline has ever existed

Proceeding with **Proposal D (combination)** with one modification: **source badges**.

---

## Schema verification (complete)

Confirmed in production (2026-04-18 SQL check):
- `clinical_notes.cpt_codes` — ARRAY, nullable ✅
- `clinical_notes.icd10_codes` — ARRAY, nullable ✅

No migration needed. Proceed with the persistence fix.

---

## Scope

**IN scope (three commits):**

1. **Commit 1:** Pull ICD-10 codes from patient's active problems into the note-generation response
2. **Commit 2:** Repoint `analyzeNoteForCodes` to run against clinician INPUT instead of AI-generated OUTPUT
3. **Commit 3:** Fix the persistence bug — extend POST /api/notes to write cpt_codes + icd10_codes to the DB

**OUT of scope (roadmap, do NOT touch):**
- ICD-10 Coding Integrity Validator (canonical-term check) — next session
- AI-inferred codes from generated content — intentionally killed
- ICD-10 picker/lookup UI on /notes/new — clinician can manually add on /notes/[id] post-save
- Prompt changes — grounding rules from 2026-04-18 stay as-is
- Smart Triage, patient context, vitals, demo mode — all untouched

---

## Clarification 1 — Source badges for transparency

Each displayed code must carry a visible badge indicating its source. This is critical for clinician trust and for the future validator feature.

**Three possible source values:**

- `'active_problem'` — code came from patient's `patient_problems.icd10_code`
  - Badge color: Green
  - Badge label: "From active problems"
  - Clinician meaning: "This is a pre-existing documented diagnosis"

- `'clinician_input'` — code matched via keyword analyzer on clinician's dictation
  - Badge color: Yellow/Amber
  - Badge label: "From your dictation"
  - Clinician meaning: "Keyword match on what you said — verify before accepting"

- `'manual'` — clinician added the code manually on /notes/[id]
  - Badge color: Blue/Neutral
  - Badge label: "Manually added"
  - Clinician meaning: "You added this explicitly"

**Data shape for the response:**

Instead of `suggestedCodes.icd10: string[]`, return:
```typescript
suggestedCodes.icd10: Array<{
  code: string;
  description: string;
  source: 'active_problem' | 'clinician_input' | 'manual';
}>;
```

Same structure for CPT codes (though CPT won't have the 'active_problem' source — always 'clinician_input' or 'manual').

---

## Clarification 2 — Dedup logic

When a patient has Type 2 Diabetes (E11.9) as an active problem AND the clinician dictates "patient has diabetes," both paths may surface E11.9. Deduplicate as follows:

**Rule:** If a code is present in both `active_problem` and `clinician_input` sources, keep the `active_problem` source (it's grounded in persistent patient data, not just a single dictation).

**Implementation:**
- Fetch patient problem codes first
- Run keyword matcher on clinician input
- Merge: for each keyword-matched code, skip if already present from active_problem source
- Final list has no duplicate codes, source preserved

---

## Clarification 3 — Commit 1 implementation

**File changes:**
- `src/app/api/ai/generate-note/route.ts` — extract ICD-10 codes from the patient context helper (already fetched in commit ed0a35e), build `suggestedCodes.icd10FromProblems` or integrate directly into the deduplicated list
- Response type: extend to include source metadata per code
- `src/app/(app)/notes/new/page.tsx` — update the `suggestedCodes` state type, render chips with source-colored badges

**Edge cases:**
- Patient has no active problems with ICD-10 codes → `active_problem` source contributes zero codes, response still includes `clinician_input` codes
- Problem has NULL `icd10_code` field → skip that problem's code (don't include "no code")
- Multiple active problems with different codes → include all

---

## Clarification 4 — Commit 2 implementation

**File changes:**
- `src/app/api/ai/generate-note/route.ts:163` — change `analyzeNoteForCodes(noteForAnalysis, ...)` to `analyzeNoteForCodes(clinicianInput, ...)`
- `clinicianInput` should be the raw dictation text + selected phrases BEFORE AI expansion
- Specifically: the string the clinician actually typed + the phrases they selected (these are authored content, not AI content)

**Reasoning:** The keyword matcher is still valuable — it's deterministic and catches conditions the clinician mentioned. But it must run against text the clinician OWNS, not text the AI generated.

**Do NOT:**
- Change the keyword matcher itself (`analyzeNoteForCodes`)
- Change the static `ICD10_CODES` library
- Modify `quickSuggestCodes` behavior

---

## Clarification 5 — Commit 3 implementation (persistence fix)

**File changes:**

### `src/app/api/notes/route.ts` POST handler
- Current insert at ~line 137-152 omits `cpt_codes` and `icd10_codes` despite them being in the Zod schema
- Extend the insert to include both:
  ```
  cpt_codes: validated.cpt_codes || [],
  icd10_codes: validated.icd10_codes || [],
  ```
- Also handle UPDATE path if notes can be edited and codes updated

### `src/app/(app)/notes/new/page.tsx` noteData payload
- Current payload at ~line 1008-1022 omits codes entirely
- Extend to include:
  ```
  cpt_codes: suggestedCodes.cpt.map(c => c.code),
  icd10_codes: suggestedCodes.icd10.map(c => c.code),
  ```
- (Strip the source metadata before persisting — just save the code strings; source is inferable on the read path based on whether the code matches a current problem or not)

### Schema verification
- Zod `NoteCreateSchema` already accepts `cpt_codes` and `icd10_codes` arrays (per CC diagnostic)
- Production columns are nullable ARRAY type (verified via schema check)
- No migration required

---

## Clarification 6 — Codex verification after deploy

After all three commits ship and Vercel deploys, I will run Codex adversarial verification. CC should make the codebase state easy to verify — clear commit boundaries, good commit messages, no silent behavior changes beyond the scoped work.

---

## Commit structure

**Commit 1:** `feat(notes): include patient active-problem ICD-10 codes in suggestions`
- Route extracts codes from patient context
- Response includes source metadata
- Frontend renders with green "From active problems" badge

**Commit 2:** `fix(notes): run ICD-10 keyword matcher on clinician input, not AI output`
- Single-line change at route.ts:163
- Prevents AI-generated content from driving code suggestions
- Frontend unchanged (same `suggestedCodes.icd10` shape, just sourced differently — but now with source badge from Commit 1)

**Commit 3:** `fix(notes): persist cpt_codes and icd10_codes on note create`
- Extends POST /api/notes insert
- Extends noteData payload in frontend
- Codes now reach /notes/[id] detail page and finish/submit flow

Push each with `--no-verify`.

---

## Reporting after Step 3

- Three commit SHAs in order
- Files changed per commit with one-line description
- Local `npm run build` result for each
- Pre-commit checklist per CLAUDE.md for each
- Vercel deploy status for final commit
- Explicit confirmation that source badges render with correct colors for each source type
- Explicit confirmation that codes from `active_problem` source take priority in dedup
- Any edge case you encountered during implementation
- Any concern about the frontend UI (badge placement, color accessibility, etc.)

---

## Testing plan (user will run after deploy)

### Test 1 — Patient with active problems
Input: same minimal test input as 2026-04-18:
```
depression follow-up. Reports improved mood on current medication. 
Sleeping better, 7-8 hours. No side effects. Appetite normal. 
Denies SI/HI. Continue current treatment plan.
```

**Expected suggested codes:**
- Type 2 Diabetes code (E11.9 or similar) with GREEN "From active problems" badge (from patient record)
- Depression-related code (F32.x or F33.x) with YELLOW "From your dictation" badge (from keyword match on "depression")
- No other codes

**Expected on save:**
- Codes persist to `clinical_notes.icd10_codes` in DB
- Finish/submit page shows the same codes

### Test 2 — Patient with no active problems
Create a new patient with no active problems. Generate a note with the same input.

**Expected:**
- Only YELLOW "From your dictation" badge codes (no green, patient has no problems)
- Still works, no empty-state crash

### Test 3 — Verify persistence
After save, navigate to the note at /notes/[id]. Codes should appear on the detail page. Also verify directly in Supabase:

```sql
SELECT id, cpt_codes, icd10_codes 
FROM clinical_notes 
WHERE patient_id = '9c50ac6f-9abb-4439-b654-70a69c751165'
ORDER BY created_at DESC 
LIMIT 1;
```

Should show populated ARRAY values for icd10_codes at minimum.

### Test 4 — Finish/submit page
Click "Save & Finish" → "Submit to Insurance". The submit/review page should now display the ICD-10 codes (no longer empty).

---

## Cross-cutting constraints

- No new dependencies
- No new env vars
- No changes to the AI prompt or grounding rules
- No changes to patient context integration (keep ed0a35e working)
- No changes to Smart Triage
- No changes to demo mode (`getDemoSOAPNote`)
- No changes to `quickSuggestCodes` or the keyword matcher logic itself
- No "while I'm here" refactors
- If you discover the clinical_notes table is missing any other expected column beyond what we verified (cpt_codes, icd10_codes), STOP and report

---

Proceed. Three commits, push each separately, report all SHAs and deploy status at the end.