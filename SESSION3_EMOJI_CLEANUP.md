# SESSION3_EMOJI_CLEANUP.md

Read CLAUDE.md first. One cosmetic fix across 4 files, ONE commit.

---

## Context

Clinical software should look like professional medical software, not a consumer chatbot. Emoji characters in the UI undermine clinician trust. Replace every emoji with text labels or Lucide icons that are already used elsewhere in the app.

---

## File 1: src/components/smart-triage/MedicationSafetyCard.tsx

- Line ~50: ⚡ → replace with a Lucide icon (e.g. AlertTriangle or Zap) or text label like [INTERACTION]
- Line ~130: 🤰 → replace with text label [PREGNANCY] or a relevant Lucide icon
- Line ~152: 💡 → replace with text label "Clinical Pearls" as plain text header (no emoji), or use Lucide Lightbulb icon

---

## File 2: src/components/smart-triage/LabMonitoringCard.tsx

- Line ~23: ✓ → replace with Lucide CheckCircle2 icon or text [OK]
- Line ~25: ⚠️ → replace with Lucide AlertTriangle icon or text [ALERT]
- Line ~31: 🧪 → replace with Lucide FlaskConical icon or text "Lab Monitoring" as plain text
- Line ~48: ⚠️ → same as line 25, use Lucide AlertTriangle
- Line ~60: ✓ → same as line 23, use Lucide CheckCircle2

---

## File 3: src/components/smart-triage/PrescribingCheckDialog.tsx

- Line ~97: 🔍 → replace with Lucide Search icon
- Line ~163: ⚠️ → replace with Lucide AlertTriangle icon
- Line ~212: ✓ → replace with Lucide CheckCircle2 icon

---

## File 4: src/lib/ai/smart-triage-prompts.ts

- Line ~236: ⚠️ → replace with [ALERT]
- Line ~237: 📋 → replace with [SUMMARY]
- Line ~238: 💊 → replace with [MEDICATIONS]
- Line ~239: 📅 → replace with [SCHEDULE]
- Line ~240: 🔄 → replace with [FOLLOW-UP]

This file generates text for demo fallback, not UI components, so use bracketed text labels not Lucide icons.

---

## Rules

- Import any Lucide icons at the top of each file only if not already imported
- Keep the same sizing and color classes as surrounding elements
- Do NOT change any logic, layout, or functionality — only replace emoji characters
- If an emoji is inside a JSX text node next to other text, replace it inline with the icon component or label

---

## After all fixes

Run npm run build. If it passes, commit:

git add -A
git commit -m "fix: replace emoji with clinical labels and Lucide icons across smart-triage UI" --no-verify

Report files changed, number of emoji replaced per file, and SHA.