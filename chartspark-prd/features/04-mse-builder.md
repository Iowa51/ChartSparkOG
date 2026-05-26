# PRD-04 — Mental Status Exam (MSE) Builder

**Version:** 1.0
**Track:** E
**Mode:** Sidecar component (inside `chartspark-content`) + OG-edit (chart UI hook)
**Week:** 9
**Status:** Spec ready; build after Tracks A–D

---

## Why this exists

The Mental Status Exam is the most frequently documented section in psychiatric notes. ICANotes+ ships a structured builder; ChartSparkOG has none. Clinicians type the same observations into free text every session, slowly.

## Success criteria

A clinician can document a full MSE in under 90 seconds by clicking through structured options across 10 domains, producing a narrative paragraph ready to insert into the note.

## The 10 domains

| Domain | Example options |
|---|---|
| Appearance | well-groomed, disheveled, age-appropriate, etc. |
| Behavior | cooperative, agitated, psychomotor retardation, etc. |
| Speech | normal rate/tone, pressured, soft, slowed, etc. |
| Mood | "depressed" / "anxious" / "euthymic" + free text |
| Affect | congruent, blunted, labile, etc. |
| Thought Process | linear, tangential, circumstantial, flight of ideas |
| Thought Content | no SI/HI, intrusive thoughts, delusions, etc. |
| Perception | no hallucinations, AVH, VH, etc. |
| Cognition | oriented x3, impaired memory, etc. |
| Insight & Judgment | good, fair, poor |

Each domain has a curated list of common options (a "shrub" in ICANotes language). Clinician clicks options → narrative renders.

## Architecture

**Mode:** Component inside `chartspark-content` sidecar. Renders inside OG patient chart via the same OG-edit window used by Track A.

**Data model:** Reuse `clinical_notes` table; the MSE is stored as a structured `mse_data` JSONB field on the note plus the generated narrative in the note body.

```sql
-- Existing clinical_notes table — add column (small OG-edit)
ALTER TABLE clinical_notes ADD COLUMN mse_data JSONB;
```

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_add_mse_data_column.sql`
- `src/app/(app)/patients/[id]/notes/[noteId]/page.tsx` — embed MSE component
- `src/components/clinical/MseBuilder.tsx` (NEW)

**Re-pentest scope:** The column addition (RLS already in place on `clinical_notes`); the new component's data flow.

## Acceptance criteria

- [ ] All 10 domains have curated option lists
- [ ] Selection generates a narrative paragraph in clinical English
- [ ] Free-text override per domain available
- [ ] MSE narrative inserts into clinical note section
- [ ] Past MSEs viewable as trend (e.g., "Mood: euthymic → anxious → euthymic over 3 visits")
- [ ] Security gate passes

## Risks

- Curating the option lists requires clinical input. Schedule a 30-min call with a psychiatrist (Anchor Point) in week 8 to validate the lists before building.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `frontend-patterns.md`, `testing-patterns.md`
