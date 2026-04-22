# APPROVE_PATIENT_CONTEXT_INTEGRATION.md

## Approval — Execute Step 2

Excellent diagnostic. All three clarifications approved in your favor:

1. **User client (not service role)** — APPROVED. Respects RLS, matches existing `getPatientById` and `vitals` patterns. My original spec was wrong on this; your correction is the right call.

2. **`gender` column labeled as "Sex" in prompt** — APPROVED. Use `patients.gender` as the source, render as "Sex: Male" (etc.) in the prompt output. The mapping is intentional — the AI is prompted with clinical terminology while we use the actual DB column.

3. **`organizationId` parameter in helper signature** — APPROVED. Required for RLS tenant isolation.

Proceed with Step 2 exactly as you proposed in Step 1e.

---

## Execution notes

### Data layer helper

Create `src/lib/data/patient-context.ts` per your proposed signature:

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
  patientId: string,
  organizationId: string,
): Promise<PatientContextForAI | null>;

export function formatPatientContextForPrompt(
  ctx: PatientContextForAI
): string;
```

### Implementation requirements

- Use `Promise.all` for parallel fetches (demographics + meds + allergies + problems)
- Filter medications to `status = 'active'`, problems to `status = 'active'` (don't include discontinued/resolved)
- Use `calculateAge()` from `src/lib/data/utils.ts`, but add guards:
  - If `date_of_birth` is null → age = null
  - If calculated age < 0 (future DOB) → age = null
- Return `null` if patient not found (not an empty object)
- Use existing user-scoped Supabase client pattern from `getPatientById`
- Log errors via `logError` per CLAUDE.md, do NOT throw (graceful degradation)

### Prompt formatting

Use the exact format from your Step 1e proposal:

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

Edge cases per your table — all approved verbatim. Specifically:
- Missing DOB → `- Age: [Not recorded]`
- Missing gender → `- Sex: [Not recorded]`
- Empty medications → `Active Medications: [None recorded]`
- Empty allergies → `Known Allergies: [None recorded]`
- Empty problems → `Active Problems: [None recorded]`
- Medication without dosage/frequency → render name only, no trailing whitespace
- No patientId → skip fetch, omit patientContext from sessionData
- Helper returns null → omit patientContext, log warning, do NOT fail note generation

### Route wiring

In `src/app/api/ai/generate-note/route.ts`:
- Parallelize the vitals fetch + patient context fetch via `Promise.all`
- Pass `context.user.organizationId` to `getPatientContextForAI`
- Add `patientContext` to the sessionData object passed to `generateSOAPNote` / `generateSOAPNoteStream`
- Follow the existing `buildVitalsContext` pattern — add a parallel `buildPatientContext` helper OR call `formatPatientContextForPrompt` inline, whichever is cleaner

### safeAzureOpenAI.ts wiring

**Apply to BOTH `generateSOAPNote` AND `generateSOAPNoteStream`:**

1. Add optional `patientContext?: string` parameter
2. Inject into prompt immediately ABOVE the Vitals block
3. If `patientContext` is undefined/empty string, skip the block entirely (backward compat with old callers if any exist)
4. Append these bullets to the existing CRITICAL GROUNDING RULES block (verbatim):

```
- When mentioning medications, use ONLY the medications listed in "Active Medications" above. Do not substitute, invent, or infer alternatives.
- When referencing demographics (age, sex), use ONLY the values in "Demographics". Do not invent.
- When mentioning allergies or problems, use ONLY what is listed. Do not add plausible-sounding additions.
- If a section of Patient Context is empty (e.g., "Active Medications: [None recorded]"), do not invent entries to fill it.
```

5. Confirm in report that BOTH functions received identical changes

---

## Commit structure

**Commit 1:** `feat(notes): add getPatientContextForAI data-layer helper`
- `src/lib/data/patient-context.ts` (new)
- No changes to AI route or prompt yet — this commit is pure data layer

**Commit 2:** `feat(notes): inject patient context into AI note generation prompt`
- `src/app/api/ai/generate-note/route.ts` (fetch + pass context)
- `src/services/safeAzureOpenAI.ts` (BOTH functions receive the same updates)
- Any schema extensions if needed

Push both with `--no-verify`.

---

## Reporting

After Step 3 complete:
- Both commit SHAs
- Files changed per commit with one-line description each
- Local `npm run build` result for each commit
- Pre-commit checklist per CLAUDE.md
- Vercel deploy status
- **Explicit confirmation: BOTH `generateSOAPNote` AND `generateSOAPNoteStream` updated identically**
- **Explicit confirmation: BOTH grounding rules blocks updated identically**
- Token footprint estimate for typical patient (as you noted: ~200 tokens)
- Any edge case encountered during implementation that wasn't in the spec
- Any production schema concern you want flagged (e.g., "if production patients table doesn't have a `gender` column, this fails at runtime" — just flag, don't investigate)

---

## Cross-cutting constraints

Same as diagnostic spec:
- No new dependencies
- No new env vars
- No changes to Azure OpenAI endpoint or model
- No changes to existing vitals handling (commit 8654ec4)
- No HIPAA minimum-necessary filtering by encounter type — future refinement
- No prior encounter history — future refinement
- No prompt deduplication refactor — future refinement
- No changes to demo mode `getDemoSOAPNote` — separate roadmap item

---

## Testing plan (user will run after deploy)

Use 2026-04-18 test input:
```
depression follow-up. Reports improved mood on current medication. 
Sleeping better, 7-8 hours. No side effects. Appetite normal. 
Denies SI/HI. Continue current treatment plan.
```

After deploy, expected AI output:

**Should appear:**
- "28-year-old male" (from DOB 8/14/1998 and `gender = male`)
- Reference to Metformin and/or Tylenoll if medications are mentioned
- Reference to Peanut / Shellfish allergies if allergies are mentioned
- Reference to Type 2 Diabetes if problems are mentioned
- Vitals section: "[Not recorded at this encounter]" (from prior fix)
- Disclaimer banner (from prior fix)

**Should NOT appear:**
- Invented "50-year-old male"
- Invented "sertraline 50mg three weeks ago"
- Invented mental status exam findings not in clinician input
- Invented sleep baselines ("improved from 4 hours to 6 hours")

If any of the "should NOT appear" items DO appear, the fix is incomplete and we iterate.

---

Proceed. Report after both commits pushed + Vercel deploy.