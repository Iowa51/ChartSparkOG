# FIX_ICD10_CODES.md

## Context

On 2026-04-18 the AI hallucination fix commits (9181838, 1c25bc8, c3e30e4, 8654ec4, plus 5d65e78 and ed0a35e for patient context integration) tightened the note generator prompt and added grounding rules. One approved instruction was:

> "Remove or strictly gate the ICD-10 auto-suggestion feature. Codes must be provider-selected from actual clinical documentation, not AI-inferred."

This was intended to prevent AI from suggesting codes based on FABRICATED content. It was NOT intended to kill ALL ICD-10 code population — codes pulled from the patient's actual active problem list, or codes manually selected by the clinician, should still work.

However, after testing on 2026-04-18, the finish/submit page now shows ZERO ICD-10 codes. The pre-fix state showed codes like F32.0, F32.1, F32.9 (Major Depressive Disorder variants), R45.851 (Suicidal ideation), F60.3 (Borderline Personality Disorder) — some of which were AI-hallucinated and dangerous, but the mechanism to display codes at all appears to now be broken.

The patient has Type 2 Diabetes (E11.9 equivalent) as an active problem — there's a real code that SHOULD appear from the patient record.

Read `CLAUDE.md` first for engineering standards.

---

## Step 1 — Diagnostic (DO NOT FIX YET)

Report findings and wait for my approval before making any changes.

### 1a — Pre-fix state

Check git history for the ICD-10 code population logic as it existed BEFORE the AI hallucination fix series:

```
git log --all --oneline -- src/app/(app)/notes/new/page.tsx | head -20
git log --all --oneline -- src/app/api/ai/ | head -20
git log --all --oneline -- src/lib/data/notes.ts | head -20
```

Specifically for each of these commits, report what they touched related to ICD-10:
- Before 9181838 (the disclaimer commit)
- 9181838 itself (disclaimer)
- 1c25bc8 (Smart Triage + header regex)
- c3e30e4 (prompt tightening) — THIS is where "remove ICD-10 suggestion" was specified
- 8654ec4 (vitals)
- 5d65e78 / ed0a35e (patient context)

Use `git show <sha> -- <file>` to inspect diffs.

Report back:
- Where did ICD-10 codes come from BEFORE the fix series?
- What mechanism suggested F32.0, F32.1, R45.851, F60.3 in the screenshots from earlier today?
- Was it: (a) AI-inferred from generated content, (b) keyed off the clinician input text, (c) pulled from patient's active problems, (d) a combination, (e) something else?

### 1b — What the fix series changed

For each commit in the fix series, identify changes that affected ICD-10 code handling:

- Was ICD-10 code suggestion logic removed from the system prompt in c3e30e4?
- Were any code lookup functions removed or disabled?
- Did any component prop changes affect the ICD-10 display on /notes/new or the finish/submit page?

Paste the relevant diff hunks.

### 1c — Current code paths

Grep the codebase for ALL ICD-10 related code:

```
grep -rn "ICD\|icd10\|icd_10\|icd-10\|getSuggestedCPTCodes\|suggestedCodes" src/ --include="*.ts" --include="*.tsx"
```

For each match, report:
- File and line
- What function/context it's in
- What state it's currently in (active code, commented out, imported but unused, deleted)

CC previously flagged `src/lib/data/notes.ts::getSuggestedCPTCodes` as having "zero callers" during the encounter_type fix — is that still true? Does it also handle ICD-10 codes?

### 1d — Finish/submit page ICD-10 handling

Locate the finish/submit page/component (likely triggered by the "Save & Finish" button from /notes/new):

- What page/component renders after "Save & Finish"?
- Does it have a UI section for ICD-10 codes?
- If yes, where does that section get its data from (prop, state, API call)?
- If no section exists, where is the submission payload constructed, and does it include ICD-10 codes?

### 1e — Patient active problems → ICD-10 link

The patient has "Type 2 Diabetes" as an active problem. Production `patient_problems` table has an `icd10_code` column (verified earlier).

- Is there ANY code path that pulls patient active problems + their ICD-10 codes into the note workflow?
- Is there a "suggest codes from this patient's problems" function anywhere?
- If not, this may never have existed — the earlier F32.x codes we saw may have been purely AI-generated from note content.

### 1f — Proposed fix plan

Based on findings, propose ONE of these approaches. Do not implement yet — wait for approval:

**Proposal A — Restore AI-generated ICD-10 suggestions with grounding**
Re-enable AI code suggestion, but ONLY suggest codes for diagnoses EXPLICITLY mentioned in clinician input OR present in patient's active problems. No AI-inferred codes from narrative.

**Proposal B — Pull codes from patient's active problems only**
Display the patient's `patient_problems.icd10_code` values on the finish/submit page as "Suggested codes based on active problems." Clinician accepts, modifies, or adds. Simpler and safer.

**Proposal C — Manual clinician selection with lookup**
Build an ICD-10 code picker where clinician types symptoms/conditions and the UI searches a code lookup. No AI involvement.

**Proposal D — Combination**
Default to Proposal B (auto-pull from active problems), PLUS a picker for clinician to add more codes manually (Proposal C), PLUS optionally AI suggestions from CLINICIAN INPUT text only (not AI-generated content).

---

## Cross-cutting constraints

- No new env vars
- No new dependencies unless absolutely required (if a code-lookup library is needed, flag it rather than adding)
- Do not touch Smart Triage
- Do not modify the AI note generation prompt or grounding rules
- Do not touch the existing patient context integration

---

## Reporting

After Step 1: full diagnostic + proposed fix plan + wait for my approval.

After approval, we'll proceed to Step 2 (implementation) based on which proposal is chosen.

---

## Important scope boundary

This is about **restoring a legitimate product feature** (code population from real sources), not about re-enabling hallucinated code suggestions. If the diagnostic reveals that the earlier F32.x/R45.851/F60.3 codes were purely AI-hallucinated with no grounded source, we need to BUILD the grounded feature, not RESTORE the old one. Clarify this distinction in your report.