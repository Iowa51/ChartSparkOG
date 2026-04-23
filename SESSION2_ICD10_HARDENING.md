# SESSION2_ICD10_HARDENING.md

Read CLAUDE.md first. Three related fixes, ONE commit.

---

## Fix D1 + D2 — Trim and uppercase ICD-10 codes at all comparison/dedup points

**Problem:** ICD-10 codes are only trimmed in one place (generate-note/route.ts:133). No uppercase normalization exists anywhere. If a code enters the system as " e11.9 " or "f32.1", dedup and comparison will silently fail, producing duplicate codes in the UI.

**Files to fix:**

1. **src/app/(app)/notes/new/page.tsx — normalizeSuggestedCodes function (around lines 336-362)**
   When converting raw code values (whether string or object), apply .trim().toUpperCase() to the code value before returning the SuggestedCode object. This is the central normalizer — fixing it covers most paths.

2. **src/app/api/ai/generate-note/route.ts — merge/dedup logic (around lines 201-217)**
   Before dedup comparison, ensure both sides of the comparison use .trim().toUpperCase(). The active_problem path at line 133 already trims — add .toUpperCase() there too. The clinician_input codes from analyzeNoteForCodes also need .trim().toUpperCase() before merge.

3. **src/lib/billing/code-analyzer.ts — quickSuggestCodes and analyzeNoteForCodes output**
   Where these functions build their return arrays, apply .trim().toUpperCase() to each code string before returning. Check around line 241 for quickSuggestCodes and wherever analyzeNoteForCodes builds its result.

4. **src/app/(app)/notes/new/page.tsx — persist path (around lines 1079-1080)**
   Where cpt_codes and icd10_codes are mapped to strings for saving, apply .trim().toUpperCase() to each code.

**Rule:** Every place a code string is created, compared, or stored, it must be .trim().toUpperCase() first. Search for patterns like c.code, item.code, code string handling near ICD-10/CPT and normalize.

---

## Fix D3 — Hydrate stored codes when editing a saved note

**Problem:** When a clinician opens /notes/[id] and then edits the note, the saved cpt_codes and icd10_codes (stored as string arrays) are never loaded back into the SuggestedCode form state. The edit flow starts with empty code chips even though the note has codes saved.

**File:** src/app/(app)/notes/[id]/page.tsx (around lines 109-110 where codes are loaded)

**Fix:**
1. Find where the note data is fetched and cpt_codes/icd10_codes are available as string arrays.
2. When navigating to edit mode (the edit button that goes to /notes/new?edit=...), pass the codes as URL params or store them in sessionStorage so the edit page can pick them up.

**Alternative simpler fix:** In src/app/(app)/notes/new/page.tsx, when editId is present, fetch the existing note from /api/notes/[editId] on mount and pipe the returned cpt_codes and icd10_codes through normalizeSuggestedCodes to populate suggestedCodes state. Use source tag "manual" for restored codes (acceptable — these are codes the clinician already accepted).

Check if the edit path already fetches the note content. If it does, just add code hydration to that same fetch. If it doesn't fetch at all, add a useEffect that fetches when editId is set.

---

## After all fixes

Run npm run build. If it passes, commit:

git add -A
git commit -m "fix: ICD-10 trim/uppercase normalization at all paths, hydrate codes on note edit" --no-verify

Report files changed, lines changed per file, and SHA.