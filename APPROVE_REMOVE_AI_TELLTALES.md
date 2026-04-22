# APPROVE_REMOVE_AI_TELLTALES.md

## Approved — execute Step 2

Excellent diagnostic. All note-text tell-tales are confined to `formatTriageSummary` in `src/app/(app)/notes/new/page.tsx` (lines 601–666). Single-file surgical fix.

---

## Specific replacements

### Line 605 — Section opener
**Before:** `── Smart Triage: Medication Safety ──`  
**After:** `MEDICATION SAFETY REVIEW`

### Line 609 — Color fallback
**Before:** fallback returns "Green" / "Yellow" / "Red"  
**After:** return "Low Risk" / "Moderate Risk" / "High Risk"

### Line 611 — Safety Score line
**Before:** `Safety Score: 85/100 (Yellow)`  
**After:** `Safety Score: 85/100 (Moderate Risk)`

### Line 631 — Black Box Warning prefix
**Before:** `⚠ {warning_text}`  
**After:** `[WARNING] {warning_text}`

### Line 642 — Lab monitoring status prefix (ternary)
**Before:**
- `⚠ OVERDUE: {med}` 
- `📋 Due: {med}`
- `✓ Current: {med}`

**After:**
- `[OVERDUE] {med}`
- `[DUE] {med}`
- `{med}` (remove the "Current" prefix entirely — if it's not overdue or due, the absence of a label implies current)

### Line 654 — Clinical Pearl prefix
**Before:** `💡 {pearl}`  
**After:** `{pearl}` (just the text, keep any existing bullet/dash formatting, remove the emoji)

### Line 664 — Section closer
**Before:** `── End Smart Triage ──`  
**After:** Remove entirely. Section boundary is implied by the next content.

---

## getSafetyLevel in src/lib/types/smart-triage.ts

Inspect this function. Two possibilities:

**If it returns color word strings** ("Green"/"Yellow"/"Red"):
- Update to return severity words ("Low Risk"/"Moderate Risk"/"High Risk")
- Check callers to ensure the return value isn't compared against "Green"/"Yellow"/"Red" string literals elsewhere (would break if so)

**If it returns enum values** (like 'green'/'yellow'/'red' as an enum):
- Leave the function alone — just map the enum to severity words in the formatter

Report which path was taken and why.

---

## Scope boundaries — explicitly out of scope

### Do NOT touch these UI component files:
- `src/components/smart-triage/MedicationSafetyCard.tsx:152` — UI header with 💡
- `src/components/smart-triage/LabMonitoringCard.tsx:23,25,48,60` — status chips with ✓ / ⚠️
- `src/components/smart-triage/PrescribingCheckDialog.tsx:163,212` — dialog emoji

These render in UI panels but are NOT copied into note body text. They'll be addressed as a separate roadmap item.

### Do NOT touch:
- `src/lib/ai/smart-triage-prompts.ts:236–240` — `getDemoChartSummaryResponse` emoji in chart-summary demo output (roadmap item)
- The AI prompt itself in `src/lib/ai/smart-triage-prompts.ts:31–64` — it's already clean (doesn't instruct AI to emit emoji)

---

## Commit structure

Single commit:

**Commit:** `fix(smart-triage): replace decorative emoji with clinical severity labels in note body`

Push with `--no-verify`.

---

## Reporting after commit

- Commit SHA
- Vercel deploy status
- Before/after of the `formatTriageSummary` function (full diff)
- Whether `getSafetyLevel` was touched (and why)
- Confirmation no UI component files were modified
- Any additional tell-tales discovered during implementation that weren't in the Step 1 diagnostic (full audit once you're in the file)

---

## Roadmap items for me to capture (do not fix tonight)

Add to OBSERVABILITY_ROADMAP.md:

```markdown
### AI tell-tale cleanup — UI surfaces (follow-up to 2026-04-18 note-body fix)

Note body text was cleaned in commit [SHA]. Remaining emoji/symbols in UI-only surfaces:

- [ ] `src/components/smart-triage/MedicationSafetyCard.tsx:152` — 💡 Clinical Pearls header
- [ ] `src/components/smart-triage/LabMonitoringCard.tsx:23,25,48,60` — ✓ / ⚠️ status chips
- [ ] `src/components/smart-triage/PrescribingCheckDialog.tsx:163,212` — ⚠️ header + ✓ button label
- [ ] `src/lib/ai/smart-triage-prompts.ts:236–240` — chart-summary demo fallback uses ⚠️, 📋, 💊, 📅, 🔄

Replace with bracketed severity labels consistent with the note-body treatment. Clinical tool should look like professional medical software, not a consumer chatbot.
```

---

## Cross-cutting constraints

- No new dependencies
- No new env vars
- No changes to AI prompt (already clean per Step 1 diagnostic)
- No changes to Smart Triage data pipeline or API
- No changes to ICD-10 code pipeline
- No changes to note persistence logic
- No "while I'm here" refactors

---

## Testing plan (user will run after deploy)

1. Hard reload clinician browser (Ctrl+Shift+R)
2. Generate a fresh note on Test Patient using the 2026-04-18 minimal input
3. Scroll the note output and verify:
   - No 💡, ⚠, ✓, 📋, or other emoji in the note body
   - No decorative `──` dividers
   - Section headers use uppercase (e.g., "MEDICATION SAFETY REVIEW")
   - Severity labels use brackets ([WARNING], [OVERDUE], [DUE])
   - "Safety Score" uses clinical terms (Low/Moderate/High Risk), not color names
4. Verify the note still reads professionally — copy/paste a section into a plain text editor to confirm nothing decorative survives
5. Verify ICD-10 code chips (from commit 6738ec7) still render correctly with source badges — those are UI components, unaffected by this fix

Proceed.