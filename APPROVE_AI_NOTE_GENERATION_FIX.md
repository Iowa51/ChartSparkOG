# APPROVE_AI_NOTE_GENERATION_FIX.md

## Approval — Execute all 4 fixes + 1 scope addition

Excellent diagnostic. Approved to proceed with Step 2 of `FIX_AI_NOTE_GENERATION.md` with specific clarifications below.

---

## Scope

Approved:
- Fix 1: Clinician disclaimer (UI)
- Fix 2: Smart Triage placement + normalizeSOAPHeaders regex tightening
- Fix 3: Prompt tightening + temperature/top_p reduction
- Fix 4: Vitals handling (pass patientId/encounterId, fetch real vitals)

Scope addition (approved):
- **Fix 3 must apply to BOTH `generateSOAPNote` AND `generateSOAPNoteStream`.** CC flagged these share duplicated prompts. Fixing only one leaves streaming mode still hallucinating. Apply identical prompt tightening and identical temperature/top_p reduction to both functions.

Out of scope (capture in roadmap, do NOT fix tonight):
- `getDemoSOAPNote` hardcoded fake vitals — roadmap item
- Full patient-record integration into AI prompt (allergies/medications/problems/conditions) — bigger architectural decision, roadmap item

---

## Clarification 1 — Fix 1: Clinician disclaimer

Add a prominent, persistent banner on the note-writing page that appears whenever AI-generated content is present (i.e., whenever `data.success && data.sections` populated from the AI pipeline).

**Banner text (use this verbatim):**
```
⚠️ AI-generated content — Review carefully before signing

This note was drafted by AI from your clinical observations. Verify all 
medications, vitals, diagnoses, and clinical facts reflect the patient 
accurately before saving. AI can make errors.
```

**Styling:**
- Use an attention-grabbing color (amber/yellow warning palette, not red — red implies error, amber implies caution required)
- Place above the note editor, not buried
- Not dismissable (must persist for the life of the AI-generated session)
- Include a warning icon

**Do not:**
- Make the disclaimer easily closeable
- Use only color to convey it (accessibility — include icon + text)
- Hide it behind a "Show more" toggle

---

## Clarification 2 — Fix 2: Smart Triage placement + regex tightening

Two sub-changes:

**2a. Move Smart Triage out of Assessment section.**
- Render Smart Triage output in a **separate, clearly-demarcated UI panel below the full SOAP note**, not inside any SOAP section
- Remove the `appendTriageToSections` concatenation into Assessment
- The panel should be clearly labeled "Medication Safety — Smart Triage" and visually distinct
- Smart Triage data remains visible and useful; just not inside the narrative prose

**2b. Tighten `normalizeSOAPHeaders` regex.**
- Change the current regex from `/^\s*\*?\*?PLAN\*?\*?:?\s*/im` to require the header be on its own line:
  ```
  /^\s*\*?\*?PLAN\*?\*?\s*:?\s*$/im
  ```
- Apply the same pattern to SUBJECTIVE, OBJECTIVE, ASSESSMENT headers
- Apply the same pattern to the SOAP parsing regex in `generate-note/route.ts:95-97`
- This prevents any prose containing the word "plan" (e.g., "treatment plan is noted") from being misinterpreted as a section header

---

## Clarification 3 — Fix 3: Prompt tightening (applies to BOTH functions)

Apply these changes to BOTH `generateSOAPNote` (line 536) AND `generateSOAPNoteStream` (line 466).

### Remove the bad instructions

Delete instruction #2: "Add realistic vital signs and mental status exam findings to the Objective section"

Delete instruction #5: "Make the note sound natural and varied - avoid repetitive phrasing"

### Add the new grounding rules

Replace instruction #2 with:
```
2. Use ONLY the clinician-provided observations above. Do NOT invent vital 
   signs, medications, durations, baseline comparisons, diagnoses, 
   historical timelines, mental status exam findings, or any other 
   specific clinical facts not explicitly present in the input.
```

Add as a new first-priority instruction (before the existing #1):
```
CRITICAL GROUNDING RULES:
- You are expanding the clinician's shorthand into formal SOAP prose
- Expansion means: converting brief dictation into professional medical 
  language
- Expansion does NOT mean: adding facts not stated by the clinician
- If a section has no clinician input, write exactly: 
  "[Not documented at this encounter — clinician to complete]"
- Do NOT fill in plausible-sounding details to make the note feel complete
- If vital signs were recorded, they will be provided to you explicitly. 
  If not provided, do not include specific values in Objective.
```

Update the system message to add:
```
You must not invent any specific clinical fact (medication name, dose, 
duration, vital sign value, baseline comparison, diagnosis, mental 
status finding) that is not present in the user-provided observations. 
Your role is to format and expand, not to generate clinical content.
```

### Change model parameters

- Temperature: 0.7 → **0.3** (in both functions)
- top_p: 0.95 → **0.8** (in both functions)

High temperature encourages novel-fact generation. Low temperature keeps the model closer to its instructions.

---

## Clarification 4 — Fix 4: Vitals handling

### 4a. Request schema change

In `src/app/api/ai/generate-note/route.ts`:
- Add `patientId` (required UUID) and `encounterId` (optional UUID) to the Zod schema
- If `patientId` is missing, return 400 with clear error
- The frontend (notes/new page) already knows both — wire them in the fetch call

### 4b. Fetch real vitals

If vitals data layer doesn't exist:
- Create `src/lib/data/vitals.ts` with `getPatientLatestVitals(patientId: string, encounterId?: string)` helper
- Query the `vitals` table for the most recent vitals record for this patient
- If encounterId provided, prefer vitals from that encounter over older vitals
- Return null if no vitals exist

If vitals data layer already exists (grep first):
- Just add a helper call site

### 4c. Pass vitals to prompt

Modify the prompt context to include:
```
Vitals recorded:
- Blood pressure: ${vitals.bp || '[Not recorded]'}
- Heart rate: ${vitals.hr || '[Not recorded]'}
- Temperature: ${vitals.temp || '[Not recorded]'}
- Respiratory rate: ${vitals.rr || '[Not recorded]'}
- BMI: ${vitals.bmi || '[Not recorded]'}
- Recorded at: ${vitals.recorded_at || '[Not applicable]'}
```

When vitals is null entirely:
```
Vitals recorded: [Not recorded at this encounter]
```

Add to the prompt instructions:
```
If "Vitals recorded" shows "[Not recorded at this encounter]", write 
exactly that phrase into the Objective section. Do NOT invent vital 
sign values.

If specific vital signs are marked "[Not recorded]" individually, 
include only the ones that ARE recorded. Do NOT fill in missing values.
```

---

## Commit structure

Four commits, one per fix:

**Commit 1:** `fix(notes): add AI-generated content disclaimer banner`

**Commit 2:** `fix(notes): place Smart Triage in separate panel + tighten header regex`

**Commit 3:** `fix(notes): tighten AI prompt to prevent clinical fact fabrication`
- Note: apply to both generateSOAPNote and generateSOAPNoteStream
- Include temperature + top_p changes in both

**Commit 4:** `fix(notes): fetch real vitals instead of letting AI fabricate them`

Push each with `--no-verify`.

---

## Reporting after Step 2

- 4 commit SHAs
- Files changed per commit with one-line description
- Local `npm run build` result for each
- Pre-commit checklist per CLAUDE.md
- Vercel deploy status for final commit
- Confirmation that fix 3 was applied to BOTH generateSOAPNote AND generateSOAPNoteStream
- Any patient-record questions that came up during Fix 4 (e.g., "should the AI also get medications passed in?" — yes ideally but that's roadmap, not this patch)

---

## Cross-cutting constraints

- No new dependencies
- No new env vars  
- No changes to Azure OpenAI endpoint or model
- No changes to Smart Triage pipeline itself (only UI placement)
- If you find yourself wanting to also fix the demo mode fake vitals, STOP — roadmap item
- If you find yourself wanting to also wire allergies/meds/problems into the prompt, STOP — roadmap item
- If the vitals table structure is different from what you assumed, ASK — do not guess

---

## Roadmap items to capture (include in final report)

1. `getDemoSOAPNote` at safeAzureOpenAI.ts:784 hardcodes fake vitals for demo mode. Demo mode also misrepresents the feature. Refactor to use same grounding rules as production, or disable demo mode until patient data is wired.

2. **Full patient-record integration into AI prompt.** Currently only vitals are being wired. Allergies, medications, active problems, prior encounters — none of these reach the AI. For the AI to expand safely, it needs to know what the patient actually takes and what their actual diagnoses are. Bigger architectural decision — how much context is appropriate? HIPAA constraints on sending PHI to Azure OpenAI (BAA is in place, but we should think about minimum-necessary disclosure principles).

3. **Prompt deduplication.** `generateSOAPNote` and `generateSOAPNoteStream` share duplicated prompts. If either is changed without the other, drift occurs. Extract shared prompt to a constant or function.

4. **Model parameter audit across all AI features.** If temperature/top_p are tuned this high in SOAP note generation, they may be similarly tuned high in Smart Triage, clinical AI chat, and other AI endpoints. Systematic audit warranted.

---

## Testing plan (user will run after deploys)

### After Fix 1 deploys (disclaimer)
- Generate a note
- Confirm disclaimer banner appears above the note in amber
- Try to dismiss — should not be dismissable

### After Fix 2 deploys (Smart Triage)
- Generate a note
- Confirm Smart Triage appears in its own panel BELOW the SOAP note, not inside Assessment
- Verify Assessment section text is not cut off mid-sentence

### After Fix 3 deploys (prompt tightening)
- Use the same minimal test input as 2026-04-18 testing:
  "depression follow-up. Reports improved mood on current medication. 
  Sleeping better, 7-8 hours. No side effects. Appetite normal. 
  Denies SI/HI. Continue current treatment plan."
- Verify output does NOT contain:
  - Invented medication names (no sertraline, no specific doses)
  - Invented sleep comparisons (no "4 hours to 6 hours")
  - Invented duration ("three weeks ago" etc.)
  - Invented demographics ("50-year-old male")
  - Auto-assigned ICD-10 codes (or at least, only codes matching input)
- Verify the Objective section either uses real vitals or says "[Not documented at this encounter — clinician to complete]"

### After Fix 4 deploys (vitals)
- Generate a note on the test patient (who has no vitals recorded)
- Verify Objective section says "[Not recorded at this encounter]" for vitals, NOT fabricated values
- Then record vitals for the test patient (if that feature exists — may need a separate path)
- Generate another note — verify those real vitals appear in Objective

---

Proceed. Report after all 4 commits pushed + Vercel deploy.