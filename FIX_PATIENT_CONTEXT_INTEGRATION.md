# FIX_PATIENT_CONTEXT_INTEGRATION.md

## Task

Wire patient record context into the AI note generation prompt. This is a follow-up to the 2026-04-18 AI hallucination fix (commits 9181838 through 8654ec4) which tightened the prompt and added vitals context but did NOT add patient demographics, medications, allergies, or active problems.

**Observed gap (2026-04-18 test):**
Despite grounding rules, the AI still fabricated:
- "50-year-old male" when patient is 28 (DOB 8/14/1998 available in record)
- "sertraline 50 mg three weeks ago" when patient's actual medications are Metformin and Tylenoll
- Mental status exam findings ("euthymic mood, congruent affect, linear thought process") when no MSE was dictated

The AI was never given this patient data. It filled the gaps with plausible fabrications.

Read `CLAUDE.md` first for engineering standards.

---

## Scope

**IN scope:**
- Create a data-layer helper `getPatientContextForAI(patientId)` that aggregates patient demographics, medications, allergies, and active problems
- Update the `/api/ai/generate-note` handler to fetch this context and pass it to the AI
- Update BOTH `generateSOAPNote` AND `generateSOAPNoteStream` in `src/services/safeAzureOpenAI.ts` to accept and use this context
- Update the system prompt with context-grounding instructions
- Update the frontend to not need changes (patientId already passed per commit 8654ec4)
- Full edge-case handling (empty medications, missing DOB, etc.)

**OUT of scope:**
- HIPAA minimum-necessary filtering by encounter type (psych vs primary care) — do the simple "pass all relevant fields" approach for now, filtering by encounter type is a future refinement
- Recent encounter history / prior notes — not passing these
- Prompt deduplication refactor (CC's roadmap item) — apply changes to both functions separately rather than refactoring now
- Demo mode (`getDemoSOAPNote`) — its hardcoded fake vitals are a separate roadmap item

---

## Step 1 — Diagnostic (DO NOT FIX YET)

Report findings. Wait for my approval before making any changes.

### 1a — Inventory existing patient-related data layer

Check `src/lib/data/` for existing helpers:
```
ls src/lib/data/
grep -rn "PatientAllergy\|PatientMedication\|PatientProblem" src/lib/data/
```

For each patient-related table (allergies, medications, problems), report:
- Existing data-layer function name if present
- File path
- Signature (parameters, return type)
- Whether it can be called server-side (service role client vs user client)

If a helper doesn't exist for a table, report that. We'll build what's needed.

### 1b — Verify production schemas for the patient-context tables

Run a lightweight `information_schema.columns` check approach in your diagnostic — list what CC expects based on `src/lib/types/database.ts` and flag any mismatch risk based on the encounters drift we already saw.

Specifically, for each of these tables, report the expected columns from `database.ts`:
- `patient_allergies` (should have: id, patient_id, allergy, severity, reaction, notes, created_at, created_by)
- `patient_medications` (should have: id, patient_id, medication, dosage, frequency, route, prescriber, status, start_date, end_date, created_at, updated_at, created_by — we saw this full shape in the React #31 error earlier)
- `patient_problems` (should have: id, patient_id, problem, icd10_code, status, onset_date, created_at)
- `patients` (should have: id, first_name, last_name, date_of_birth, sex or gender, created_at, etc.)

**Important:** do NOT run queries against production Supabase during Step 1 — that wastes tokens. Just report what the `database.ts` interfaces declare. The user (James) will verify production schema if needed before we execute.

### 1c — Current generate-note route structure

Read `src/app/api/ai/generate-note/route.ts` and report:
- Current request schema (after commit 8654ec4 it should have patientId and encounterId)
- Current session data object being built before calling generateSOAPNote
- The `buildVitalsContext` helper added in commit 8654ec4 — confirm its structure, we'll mirror the pattern for patient context

### 1d — Current safeAzureOpenAI.ts prompt context

Read `src/services/safeAzureOpenAI.ts`:
- How `vitalsContext` is currently injected into the prompt (from commit 8654ec4)
- The current grounding rules block
- The full system prompt location (line numbers) in BOTH `generateSOAPNote` (line ~536) and `generateSOAPNoteStream` (line ~466)

### 1e — Proposed implementation plan

Based on findings, propose:

1. **Data layer helper signature** — exact TypeScript signature for `getPatientContextForAI`, including return type shape
2. **Prompt context format** — exact string format that will be injected, something like:
   ```
   Patient Context:
   Demographics:
   - Age: 28
   - Sex: Male
   
   Active Medications:
   - Metformin 500mg BID
   - Tylenoll 500mg PRN
   
   Known Allergies:
   - Peanut (severe)
   - Shellfish (moderate)
   
   Active Problems:
   - Type 2 Diabetes Mellitus (E11.9)
   ```
3. **Prompt grounding additions** — exact wording to add to the CRITICAL GROUNDING RULES block:
   ```
   - When mentioning medications, use ONLY the medications listed in "Active Medications" above. Do not substitute, invent, or infer alternatives.
   - When referencing demographics (age, sex), use ONLY the values in "Demographics". Do not invent.
   - When mentioning allergies or problems, use ONLY what is listed. Do not add plausible-sounding additions.
   - If a section of Patient Context is empty (e.g., "Active Medications: [None recorded]"), do not invent entries to fill it.
   ```
4. **Edge case handling**:
   - Missing DOB → "Age: [Not recorded]"
   - Empty medications list → "Active Medications: [None recorded]"
   - Empty allergies → "Known Allergies: [None recorded]"
   - Missing sex → "Sex: [Not recorded]"
   - No patientId in request → patient context entirely omitted from prompt, existing behavior preserved (backward compatible)

Wait for my approval before proceeding to Step 2.

---

## Step 2 — Execute approved implementation (AFTER approval only)

### 2a — Create data-layer helper

Create `src/lib/data/patient-context.ts` (or similar). Function signature approximately:

```typescript
export interface PatientContextForAI {
  demographics: {
    age: number | null;
    sex: string | null;
  };
  medications: Array<{
    name: string;
    dosage: string | null;
    frequency: string | null;
  }>;
  allergies: Array<{
    allergen: string;
    severity: string | null;
    reaction: string | null;
  }>;
  problems: Array<{
    problem: string;
    icd10_code: string | null;
  }>;
}

export async function getPatientContextForAI(
  patientId: string
): Promise<PatientContextForAI | null>
```

Implementation notes:
- Use service role client for server-side fetching
- Filter medications to `status = 'active'` (or equivalent) — don't include discontinued meds
- Filter problems to `status = 'active'` — don't include resolved problems
- For age calculation from DOB: handle edge cases (null DOB, future DOB, etc.)
- Return null if patient doesn't exist, not an empty object
- Log errors via `logError` per CLAUDE.md standards
- Use `Promise.all` to fetch medications/allergies/problems in parallel (performance)

### 2b — Helper to format context as prompt-injectable string

Add a function `formatPatientContextForPrompt(ctx: PatientContextForAI): string` that produces the structured text block shown in Step 1e above. Handle all edge cases (empty arrays, null fields).

### 2c — Wire into generate-note route

In `src/app/api/ai/generate-note/route.ts`:
- After fetching vitals (existing from 8654ec4), fetch patient context
- Format it using the helper above
- Pass as `sessionData.patientContext`

Run vitals fetch and patient context fetch in parallel with `Promise.all` — don't serialize them.

### 2d — Wire into safeAzureOpenAI.ts

Add `patientContext?: string` parameter to both `generateSOAPNote` and `generateSOAPNoteStream`:
- Inject into prompt just above the Vitals block
- If `patientContext` is undefined/empty, skip the block entirely (backward compatible)

Add new grounding rules to the CRITICAL GROUNDING RULES block (in BOTH functions). Exact wording from Step 1e above.

### 2e — Verify prompt still fits within Azure OpenAI token limits

Estimate the added prompt length:
- Typical patient with 5 meds, 2 allergies, 3 problems: ~200-300 tokens
- Heavy patient with 20 meds, 10 allergies, 15 problems: ~800-1000 tokens

Confirm this fits within the Azure OpenAI GPT-4o context window (128K) with margin. If there's concern for heavy patients, add a comment about it but don't implement truncation tonight (roadmap).

---

## Step 3 — Verify and commit

Per-commit verification:
1. `npm run build` passes locally
2. No TypeScript errors
3. Pre-commit checklist per CLAUDE.md

### Commit structure

**Commit 1:** `feat(notes): add getPatientContextForAI data-layer helper`
- Create `src/lib/data/patient-context.ts`
- Unit-testable in isolation

**Commit 2:** `feat(notes): inject patient context into AI note generation prompt`
- Updates to `src/app/api/ai/generate-note/route.ts`
- Updates to `src/services/safeAzureOpenAI.ts` (BOTH functions)
- Updates to grounding rules
- Schema extensions if needed

Push both with `--no-verify`.

---

## Reporting after Step 3

- Both commit SHAs
- Files changed per commit with brief description
- Local `npm run build` result for each
- Pre-commit checklist per CLAUDE.md
- Vercel deploy status
- **Explicit confirmation that BOTH generateSOAPNote AND generateSOAPNoteStream were updated**
- **Explicit confirmation that grounding rules were updated in BOTH**
- Any production schema verification needed before deployment works (if CC uncovered a mismatch risk during diagnostic)
- Any edge case you encountered that wasn't in the spec

---

## Cross-cutting constraints

- No new dependencies
- No new env vars
- No changes to Azure OpenAI endpoint or model
- No changes to existing vitals handling (commit 8654ec4)
- No HIPAA minimum-necessary filtering by encounter type — future refinement
- No prior encounter history integration — future refinement
- No prompt deduplication refactor — future refinement
- If production schema appears to differ from `database.ts` type declarations (similar to the encounters drift), STOP and report — we'll verify production separately before executing

---

## Testing plan (user will run after deploy)

Use 2026-04-18 minimal test input:
```
depression follow-up. Reports improved mood on current medication. 
Sleeping better, 7-8 hours. No side effects. Appetite normal. 
Denies SI/HI. Continue current treatment plan.
```

Expected AI output after fix:
- Demographics match actual patient: "28-year-old male" (Test Patient DOB 8/14/1998)
- Medication references match actual patient record: "Metformin" and/or "Tylenoll" — NOT fabricated sertraline
- No invented dosages unless explicitly in patient record
- Allergies section (if AI references them) uses actual Peanut/Shellfish, not invented
- Active problems section uses actual "Type 2 Diabetes" (existing in patient record)
- Vitals section continues to say "[Not recorded at this encounter]" (unchanged from 8654ec4)
- MSE section either placeholder text or absent — NOT fabricated findings

If any of the above fails, the fix is incomplete. Paste findings and iterate.

---

## Why this scope discipline matters

This is a significant change. It touches multiple files, introduces new data-fetching patterns, and modifies the AI prompt context in a way that affects every subsequent note generation. Getting it right requires care.

Scope creep that would make this worse:
- Trying to also do minimum-necessary filtering tonight (HIPAA design decision that needs clinician input)
- Trying to also refactor the duplicated prompts (increases risk)
- Trying to also fix demo mode fake vitals (unrelated)
- Trying to also add prior encounter history (bigger scope)

Keep it focused: demographics + meds + allergies + problems. Ship it. Test it. Iterate later.