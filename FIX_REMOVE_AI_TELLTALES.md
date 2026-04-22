# FIX_REMOVE_AI_TELLTALES.md

## Task

The Smart Triage output panel contains decorative emoji and symbols that read as "consumer AI chatbot" rather than professional medical software. Strip them and replace with clean, professional severity labels.

Read `CLAUDE.md` first for engineering standards.

---

## Observed tell-tales to remove

The Smart Triage Medication Safety block currently uses:

| Current | Context | Problem |
|---------|---------|---------|
| ⚠ | Black Box Warnings section | Decorative, unprofessional |
| ⚠ | "OVERDUE" lab monitoring items | Decorative |
| ✓ | "Current" lab monitoring items | Decorative |
| 💡 | Clinical Pearls items | Looks like a chatbot |
| ── | Section dividers | Decorative, visual noise |

The three full pages of output may also contain other emoji/symbols I haven't seen — audit the whole Smart Triage output for anything non-professional.

---

## Step 1 — Diagnostic (DO NOT FIX YET)

Find every file that produces Smart Triage output text. Start with:

```
grep -rn "💡\|⚠\|✓\|──\|━━" src/
grep -rn "Smart Triage\|SmartTriage" src/
```

Report:
- Every file and line number where these symbols appear
- Context: is the symbol in a string template, a static constant, or dynamically rendered?
- Whether the symbols are in the AI system prompt (telling the AI to OUTPUT them) OR in application code (post-processing AI output or rendering static content)

Also check:
- `src/app/api/ai/smart-triage/medication-review/route.ts`
- Any prompt file referenced by that route
- Any formatter or display function in the Smart Triage pipeline
- The `formatTriageSummary` function that CC found earlier in `src/app/(app)/notes/new/page.tsx:544` (from the FIX_AI_NOTE_GENERATION.md diagnostic)

Wait for my approval before making any changes.

---

## Step 2 — Proposed replacements (for approval)

Replace the decorative symbols with clean text labels:

| Current | Replace with |
|---------|--------------|
| ⚠ (before section/item) | `[ALERT]` or remove if the section is already labeled |
| 💡 | Remove entirely — use bullet point or nothing. Context alone signals "clinical note" |
| ✓ | Remove entirely or replace with `[CURRENT]` |
| ── Smart Triage: Medication Safety ── | `MEDICATION SAFETY REVIEW` (uppercase section header, no dividers) |
| ── End Smart Triage ── | Remove entirely. Block-ending is already implied by next section. |

### Severity labels style guide

Use these bracketed labels for severity signaling, consistent across the output:

- `[CRITICAL]` — immediate clinical concern, stop-ship level
- `[WARNING]` — important but not emergent
- `[ALERT]` — attention required
- `[OVERDUE]` — missed care item
- `[CURRENT]` — up-to-date item (use sparingly, often unneeded)
- `[NOTE]` — informational, no action required

Apply these consistently. For example:

**Before:**
```
⚠ OVERDUE: Metformin — Renal function (eGFR), Vitamin B12 levels
```

**After:**
```
[OVERDUE] Metformin — Renal function (eGFR), Vitamin B12 levels
```

**Before:**
```
💡 Metformin is the first-line treatment for Type 2 diabetes...
```

**After:**
```
Metformin is the first-line treatment for Type 2 diabetes...
```

(Just remove the bulb — it's a clinical pearl, the context makes that clear)

**Before:**
```
── Smart Triage: Medication Safety ──
Safety Score: 85/100 (Yellow)
```

**After:**
```
MEDICATION SAFETY REVIEW
Safety Score: 85/100 (Moderate Risk)
```

(Also replace color names like "Yellow" with clinical terms "Moderate Risk" — another tell-tale)

### Section title review

Check all Smart Triage section headers for color-coded words:
- "Yellow" → "Moderate Risk"
- "Red" → "High Risk"
- "Green" → "Low Risk"

Same principle — use clinical vocabulary, not consumer UX vocabulary.

---

## Step 3 — Execute approved changes (after my approval)

Single commit, tight scope:

**Commit:** `fix(smart-triage): replace decorative emoji with clinical severity labels`

### Files likely to change:
- Smart Triage route handler or its system prompt
- Any formatter function that post-processes triage output
- Any static template strings

### Files that should NOT change:
- AI note generation prompt (safeAzureOpenAI.ts) — unless CC finds tell-tales there too (if so, flag them separately; a separate commit)
- Patient context integration
- Vitals handling
- ICD-10 code pipeline
- Disclaimer banner text

### Cross-cutting:
- If the decorative emoji are in the SYSTEM PROMPT telling the AI to output them, the fix is prompt engineering
- If they're in APPLICATION CODE adding them after AI output, the fix is removing the code that injects them
- Report which it is in Step 1

Run `npm run build` before pushing.

---

## Reporting after Step 3

- Commit SHA
- Files changed with one-line description
- Local build result
- Pre-commit checklist per CLAUDE.md
- Vercel deploy status
- Full list of emoji/symbols removed (in case I missed any in the screenshot)
- Any ADDITIONAL professional-tone issues found during the audit (e.g., chatbot-style phrasing, exclamation points, casual language) — flag these for separate roadmap items, do NOT fix tonight unless scope-creeping is free

---

## Why this matters

Medical software is held to a higher professionalism standard than consumer apps. Decorative emoji in clinical documentation:
1. Signal "AI-generated" to sophisticated buyers, reducing trust
2. Can survive copy-paste into external EHR or insurance systems, where they look unprofessional
3. Don't survive some medical-grade document formats (PDF export, fax, EDI claim submission)
4. Create accessibility issues for screen readers

The goal is: if a clinician copied this note into Epic tomorrow, nothing would mark it as unusual.

---

## Testing plan (user will run after deploy)

1. Generate a note with the Test Patient (DOB 8/14/1998, on Metformin + Tylenol, T2DM active problem)
2. Verify Smart Triage section contains NO emoji, NO lightbulbs, NO triangles
3. Verify severity labels are bracketed and consistent ([OVERDUE], [WARNING], etc.)
4. Verify Safety Score uses clinical terms (not "Yellow" / "Red" / "Green" alone)
5. Verify the overall output reads as professional medical documentation — could be copied into Epic/Cerner without looking out of place