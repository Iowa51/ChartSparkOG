# FIX_AI_NOTE_GENERATION.md

## Context

The AI note generator expands clinician shorthand into a formal SOAP note. This is the intended design — the AI is supposed to take a brief dictation and expand it into billable prose. However, testing on 2026-04-18 revealed four specific problems that need investigation and fixing.

**Design intent (provided by product owner):**
1. Smart Triage is designed to pull real vitals from patient records and inject medication safety analysis
2. The AI expansion is designed to flesh out shorthand into formal SOAP prose
3. A clinical disclaimer should be visible to clinicians on AI-generated content
4. The AI should NOT invent facts not present in input or patient record

Read `CLAUDE.md` first for engineering standards. Read the AI hallucination block in `OBSERVABILITY_ROADMAP.md` for context on what testing revealed.

---

## Four problems to investigate

### Problem 1 — AI invents vital signs when Smart Triage doesn't supply them

**Observed:** When a test patient with no vital signs recorded was tested, the AI output contained complete fabricated vitals:
```
Vital signs: Blood pressure 128/78 mmHg, heart rate 72 bpm, respiratory 
rate 16 breaths/min, temperature 98.7°F, BMI 26.1 kg/m².
```

**Expected:** If no vitals are available, the Objective section should say something like "[Vital signs not recorded at this encounter]" rather than inventing plausible values.

### Problem 2 — AI expansion invents facts not in input

**Observed:** Given input "Sleeping better, 7-8 hours", the AI generated "Sleep duration has increased from approximately 4 hours per night to 6 hours" — inventing a baseline comparison that wasn't provided. Similarly, "sertraline 50mg daily three weeks ago" was invented when the patient's actual medications (Metformin, Tylenol) were available in the patient record.

**Expected:** Expansion should flesh out shorthand into prose but NOT add specific facts (medication names, durations, baselines, specific numeric comparisons) not present in the clinician's input or the patient record.

### Problem 3 — Smart Triage injection breaks SOAP structure

**Observed:** The Smart Triage Medication Safety block is inserted between the Assessment and Plan sections, with text like "Continued progress is evident, and adherence to the treatment" getting cut off mid-sentence, Smart Triage block appearing, then "is noted." appearing as an orphaned fragment at the start of Plan.

**Expected:** Smart Triage output should appear either (a) in its own clearly-demarcated block after the full SOAP note, or (b) in a sidebar, but NOT spliced into the middle of SOAP sections.

### Problem 4 — Clinician disclaimer missing from UI

**Observed:** Product owner expected a disclaimer on AI-generated content to be visible but it's not showing.

**Expected:** Prominent disclaimer visible to the clinician stating something like "AI-generated content. Review carefully before signing. Verify all medications, vitals, and clinical facts against patient reality."

---

## Step 1 — Diagnostic (DO NOT FIX YET)

Report findings for each of the four problems. Wait for approval before fixing.

### 1a — AI note generation pipeline

Locate and read the note generation code path. Likely entry points:
- `src/app/api/ai/generate-note/route.ts` (API handler)
- Any file containing the Azure OpenAI system prompt

Report:
- File paths in the pipeline
- The full system prompt as currently written (paste it verbatim)
- How patient data (allergies, medications, problems) is passed to the prompt
- How Smart Triage data is passed to the prompt
- What happens when vitals data is empty/missing (does the prompt instruct the AI to leave blank, or does it not mention vitals at all?)

### 1b — Smart Triage integration

Locate the Smart Triage call and how its output gets combined with the note:
- `src/app/api/ai/smart-triage/medication-review/route.ts` or similar
- The component/page that assembles final note output

Report:
- Where Smart Triage output is injected into the SOAP text
- The exact code that places the "── Smart Triage: Medication Safety ──" block
- Whether it's inserted in a structured way or via string concatenation that could break sentence boundaries

### 1c — Clinician disclaimer

Grep for disclaimer/warning text in the note generation UI:
```
grep -rn "verify\|disclaimer\|AI-generated\|review carefully\|ai-generated" src/app/(app)/notes/
grep -rn "verify\|disclaimer" src/components/
```

Report:
- Is there disclaimer code present in the codebase?
- Is it wired up to display but not showing for some reason?
- Is it completely missing?
- If present, what does it say and where is it supposed to appear?

### 1d — Vitals handling specifically

Look at how the patient's vital signs are fetched and passed to the AI:
- Is there a `getPatientVitals()` function?
- Does the note generation call it?
- What does it return when no vitals exist?
- How is that empty result handled in the prompt context?

### 1e — Report recommendations

For each of the four problems, propose a fix approach. Rank by effort:
- Smallest fix first (likely: the disclaimer, just needs to display)
- Then the Smart Triage placement (structural fix to where the block gets inserted)
- Then the system prompt tightening (to prevent invention)
- Finally the vitals handling (ensure empty vitals → "[not recorded]" instead of fabrication)

Wait for my approval before implementing any fixes.

---

## Step 2 — Execute approved fixes (AFTER approval only)

Once I approve the diagnostic findings, implement the four fixes in four separate commits:

**Commit 1:** `fix(notes): ensure AI disclaimer is visible on generated content`
**Commit 2:** `fix(notes): place Smart Triage block after SOAP sections instead of mid-assessment`
**Commit 3:** `fix(notes): tighten system prompt to prevent fabrication of facts not in input`
**Commit 4:** `fix(notes): handle missing vitals gracefully instead of fabricating`

Push each with `--no-verify`.

---

## Cross-cutting constraints

- No new dependencies
- No new env vars
- Preserve existing functionality — the AI expansion feature is intentional and valuable; we're constraining it, not removing it
- Do NOT change Azure OpenAI endpoint or model
- Do NOT change Smart Triage logic (just where its output is placed)
- If the diagnostic reveals more than 4 problems, report them all but do NOT fix them tonight — add to roadmap

---

## Reporting after Step 2

- 4 commit SHAs
- Files changed per commit
- Local `npm run build` result for each
- Pre-commit checklist per CLAUDE.md
- Vercel deploy status
- User test plan (what to paste into the AI to verify each fix)

---

## Why this scope matters

The design intent is legitimate. The AI SHOULD expand clinician shorthand — that's a real clinical productivity feature. We just need to constrain it so the expansion stays faithful to:
1. What the clinician actually said
2. What the patient record actually contains
3. What vitals were actually measured

With those constraints in place, AI-generated notes become safe for clinician review-and-sign workflows. Without them, the feature creates medical documentation fraud risk.

The goal of this fix is not to disable the feature. The goal is to make it work as designed.