# CODEX_VERIFY_ICD10_PROPOSAL_D.md

## Task

Independently verify CC's implementation of Proposal D — the three-commit ICD-10 code suggestion and persistence fix. This is adversarial review per the CODEX.md standing charter — challenge green lights, find what CC missed.

## Context

CC's work delivered three commits on main:
- **82f675e** — `feat(notes): include patient active-problem ICD-10 codes in suggestions`
- **c8fb1c1** — `fix(notes): run ICD-10 keyword matcher on clinician input, not AI output`
- **d1dca7f** — `fix(notes): persist cpt_codes and icd10_codes on note create`

The approval spec is in `APPROVE_ICD10_PROPOSAL_D.md` in the repo root.

Pre-verification context (from CC's report):
- Local builds passed for all three commits
- Vercel deploy completed for d1dca7f
- CC recovered from a corrupt `import-in-the-middle` package during commit 1 — package.json reverted, verified clean via git diff

---

## Scope of verification

**IN scope:**
- Verify all three commits present and pushed
- Verify each commit's claimed behavior is what actually shipped
- Verify no accidental package.json / package-lock.json drift (CC reverted but let's confirm)
- Verify source badge logic is correct (dedup, priority, color mapping)
- Verify persistence bug is actually fixed (POST writes to DB)
- Verify payload shape transformation at the frontend-to-backend boundary
- Verify no scope creep into forbidden areas (AI prompt, Smart Triage, vitals handling, demo mode except for the shape-wrapping)

**OUT of scope:**
- Re-running CC's tests
- Visual UI verification (chip density, color accessibility — user will eyeball)
- Verifying Azure OpenAI output quality

---

## Step 1 — Commit integrity verification

### 1a — Verify all three commits pushed

```bash
git log --oneline -5
```

Expected: commits `82f675e`, `c8fb1c1`, `d1dca7f` present in that order (oldest to newest).

Report:
- Are all three SHAs visible?
- Is HEAD at or after d1dca7f?
- Is the branch up to date with origin/main?

### 1b — Verify no package.json / package-lock.json drift

CC reported a recovery from a corrupt `import-in-the-middle` install. Verify cleanup was actually clean:

```bash
git diff origin/main~3 origin/main -- package.json package-lock.json
```

Expected: NO changes to package.json or package-lock.json across all three commits. If there are any changes, that's a scope violation.

Also:
```bash
git log --oneline -- package.json package-lock.json | head -10
```

Report whether any of these three commits touched dependencies. None should.

---

## Step 2 — Commit 82f675e review (source badges + active-problem codes)

Read the commit diff:
```bash
git show 82f675e
```

### 2a — Backend changes in `src/app/api/ai/generate-note/route.ts`

Verify:
- [ ] Active problem ICD-10 codes are extracted from patient context (fetched via `getPatientContextForAI` from commit ed0a35e)
- [ ] Response shape for suggestedCodes.icd10 and suggestedCodes.cpt is `Array<{code, description, source}>`, NOT `string[]`
- [ ] Source field is one of: `'active_problem' | 'clinician_input' | 'manual'`
- [ ] Dedup uses a Set, not a nested loop, and prefers active_problem over clinician_input (as CC claimed)

### 2b — Frontend changes in `src/app/(app)/notes/new/page.tsx`

Verify:
- [ ] State type updated to accept the new object shape
- [ ] `codeSourceStyles` object defines three color variants (emerald, amber, blue)
- [ ] Each variant has a dark-mode class
- [ ] Badges render both color AND text label (accessibility — color-only is insufficient)
- [ ] `normalizeSuggestedCodes` helper exists to handle both legacy string[] shape and new object[] shape

### 2c — Edge case coverage

Mentally walk through these scenarios and verify the code handles them:
- Patient has no active problems with ICD codes → `active_problem` source contributes zero codes, other sources still work
- Patient problem has NULL `icd10_code` field → that problem is skipped, not rendered as empty code
- Multiple problems with different codes → all included
- Same code from two active problems → dedup handles (Set)
- Same code from active problem AND keyword match → active_problem wins

### 2d — No scope creep

Verify this commit did NOT:
- Modify the AI prompt or grounding rules in `src/services/safeAzureOpenAI.ts`
- Modify Smart Triage
- Modify `quickSuggestCodes` or the keyword matcher logic itself
- Modify patient context helper (`src/lib/data/patient-context.ts`)
- Modify demo mode (`getDemoSOAPNote`)
- Change vitals handling

---

## Step 3 — Commit c8fb1c1 review (keyword matcher repoint)

Read:
```bash
git show c8fb1c1
```

### 3a — Single-file surgical change

Verify this is a narrow change to `src/app/api/ai/generate-note/route.ts` only:
- [ ] `analyzeNoteForCodes` now called against `fullInput` (or equivalent clinician input variable) NOT the AI-generated SOAP text
- [ ] Input variable represents the CLINICIAN's actual dictation + phrase selections, NOT the AI-generated note
- [ ] The call site moved or the argument changed — confirm what exactly

### 3b — No accidental changes

Verify this commit is as small as CC claimed:
- [ ] Only one file modified
- [ ] Only the specific call site changed
- [ ] No other logic modified within that file

Flag if the commit is suspiciously large or touches multiple files.

---

## Step 4 — Commit d1dca7f review (persistence fix)

Read:
```bash
git show d1dca7f
```

### 4a — Backend persistence in `src/app/api/notes/route.ts`

Verify:
- [ ] INSERT now includes `cpt_codes` and `icd10_codes` in the column list
- [ ] Values come from the validated Zod payload, not hardcoded empty arrays
- [ ] Handles the case where codes are undefined → defaults to empty array `[]`
- [ ] If there's an UPDATE path in the same file, it's either updated OR deliberately left as-is (note which)

### 4b — Frontend payload in `src/app/(app)/notes/new/page.tsx`

Verify:
- [ ] `noteData` object passed to the POST now includes `cpt_codes` and `icd10_codes`
- [ ] Values are `string[]` (extracted from the new object shape via `.map(c => c.code)`)
- [ ] Source metadata is STRIPPED before persisting — only code strings reach the DB (source will be inferred on read by matching against current patient problems)
- [ ] Both create and edit paths handle the transformation consistently

### 4c — Schema alignment

Production columns verified on 2026-04-18:
- `clinical_notes.cpt_codes` — ARRAY, nullable
- `clinical_notes.icd10_codes` — ARRAY, nullable

Verify:
- [ ] The Supabase `.insert()` call passes arrays matching the column types
- [ ] No type coercion issues (e.g., passing object[] where string[] expected)

---

## Step 5 — Cross-cutting consistency checks

### 5a — Shape transformation boundaries

The shape changes across the flow:

| Layer | Shape |
|-------|-------|
| DB | `string[]` (ARRAY of code strings) |
| API response (generate-note) | `Array<{code, description, source}>` |
| Frontend state | `Array<{code, description, source}>` |
| POST payload (save note) | `string[]` |
| DB column | `string[]` |

Verify the transformations at each boundary:
- [ ] `generate-note` route returns objects with source metadata ✓ (from commit 82f675e)
- [ ] Frontend displays objects with badges ✓
- [ ] Frontend strips objects to string[] before POST ✓ (from commit d1dca7f)
- [ ] Backend receives string[] from Zod schema and writes to DB ✓

Flag any boundary where the transformation is missing or wrong.

### 5b — Read path (what happens when viewing a saved note)

Check `src/app/(app)/notes/[id]/page.tsx`:
- [ ] This file reads `note.icd10_codes` (string[]) from the DB — no change expected
- [ ] Display should continue to work since it was already rendering string[]
- [ ] Any code here that references the new object shape would be a bug (it shouldn't — DB is string[])

### 5c — No orphaned object references

Grep the codebase for any place that assumes `suggestedCodes.icd10: string[]` after commit 82f675e:
```
grep -rn "suggestedCodes.icd10\|suggestedCodes.cpt" src/ --include="*.ts" --include="*.tsx"
```

Each reference should now expect the new object shape OR go through `normalizeSuggestedCodes`. Any bare string[] access would be a bug.

---

## Step 6 — Build and type-check verification

```bash
cd C:/Users/joman/OneDrive/Desktop/ChartSparkOG
npm run build 2>&1 | tail -30
```

Verify:
- [ ] Build succeeds with exit 0
- [ ] No new TypeScript errors introduced
- [ ] Specifically no "Property 'code' does not exist on type 'string'" errors (which would indicate a missed shape transformation)

---

## Step 7 — Deployment risk flags

CC's report mentioned a corrupt `import-in-the-middle` package during commit 1 build. This hints at environment fragility. Verify:

- [ ] Current HEAD builds cleanly from scratch (not just from incremental state)
- [ ] No artifacts of the corrupt install remain in the repo (spurious files added to git)

```bash
git status
```

Expected: clean working tree. If any files are tracked/modified that shouldn't be, flag them.

---

## Step 8 — Report

Produce the standard CODEX.md 5-section format:

### 1. Claims vs Reality
What CC said is done vs what is actually done. Any discrepancies between CC's report and the diff reality.

### 2. Correctness
Does the code do what it's supposed to do? Any logic errors, type errors, boundary bugs, dedup issues.

### 3. Completeness
Anything CC missed? Edge cases not handled? Scope gaps?

### 4. Consistency
Are the shape transformations at each boundary correct? Does the read path (viewing existing notes) still work? Any orphaned `string[]` assumptions?

### 5. Deployment Risk
What could fail at runtime in production? Schema mismatches, undefined variables, race conditions in the dedup, edge cases around null/undefined codes, etc.

---

## Adversarial mindset reminders

From CODEX.md:
- CC just reported "all clean" — your job is to find what's NOT clean
- Look especially at the shape transformation boundaries — that's where bugs hide
- The dedup logic is new — verify it actually works, not just that it exists
- The persistence fix is TWO files (frontend payload + backend insert) — both must be correct for the feature to work end-to-end

Specific traps to watch for:
1. Backend writes the codes but frontend doesn't send them (or vice versa) — both needed
2. `.map(c => c.code)` assumes object shape but falls through legacy string[] path, causing `c.code` to be undefined
3. Dedup Set only populated for one type (ICD but not CPT, or vice versa)
4. Source field sometimes missing when it should be present (frontend normalizes legacy shape but forgets to tag source)
5. Schema type mismatch — Supabase rejects object array when expecting string array, or accepts it silently (Supabase can be lenient on this in weird ways)
6. Edit/UPDATE path at POST /api/notes — CC only mentioned INSERT. If edit exists, it may still have the old bug.
7. Normalizer function `normalizeSuggestedCodes` — verify it handles ALL the input shapes it claims to: both legacy string[] and new object[] forms