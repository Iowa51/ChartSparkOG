# PRD-08 — Click-to-Chart Content Engine

**Version:** 1.0
**Track:** F
**Mode:** Sidecar (`chartspark-content`)
**Week:** 11
**Status:** Spec ready

---

## Why this exists

ICANotes' core competitive advantage is the "menu-driven note builder": clinicians click options from curated lists and a coherent narrative paragraph generates automatically. This is the moat — 4500+ behavioral health practices use it specifically for this. ChartSparkOG cannot reach parity without an equivalent.

This sidecar also feeds AI grounding (PRD-13) — the menu skeleton becomes the fact constraint for the AI scribe.

## Success criteria

A clinician can document a 60-minute psychotherapy session in <3 minutes by clicking through option menus across:
- Presenting concerns
- Subjective report (mood, sleep, appetite, function)
- Interventions used (cognitive restructuring, behavioral activation, etc.)
- Patient response
- Plan (continue current treatment, add/adjust medication referral, increase frequency, etc.)

The output is a clinically coherent SOAP-format note ready for review and signature.

## Architecture

**Mode:** Sidecar — `RedArkventures/chartspark-content`. Provides:
- A library of curated option lists ("shrubs") by domain
- A narrative composition engine (deterministic, rule-based, NOT LLM)
- An API the OG chart UI calls to render menus and compose narratives

```
┌────────────────────────────┐
│  OG Patient Chart Page     │
│  <ContentBuilder/>         │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ chartspark-content sidecar │
│ - GET /shrubs/:domain      │
│ - POST /compose            │
└────────────────────────────┘
```

## Data model

```sql
CREATE TABLE content_shrubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id), -- null = system default
  domain TEXT NOT NULL, -- 'subjective_mood', 'interventions', 'plan', etc.
  options JSONB NOT NULL, -- array of { value, label, narrative_phrase, tags }
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  note_id UUID REFERENCES clinical_notes(id),
  selections JSONB NOT NULL, -- the structured input
  generated_narrative TEXT NOT NULL,
  composed_by UUID NOT NULL REFERENCES users(id),
  composed_at TIMESTAMPTZ DEFAULT NOW()
);
```

System-default shrubs (`org_id IS NULL`) ship with the product. Orgs can override or extend per their workflow.

## OG-EDIT REQUIRED (minor)

**Files:**
- `src/components/clinical/ContentBuilder.tsx` (NEW) — calls sidecar API
- `src/app/(app)/patients/[id]/notes/[noteId]/page.tsx` — embed builder

**Re-pentest scope:** Sidecar auth pass-through, narrative output sanitization.

## Acceptance criteria

- [ ] At least 20 system-default shrubs ship at launch (covering common SOAP domains)
- [ ] Narrative composition is deterministic — same selections produce same narrative
- [ ] Composition takes <500ms p95
- [ ] Orgs can create custom shrubs
- [ ] Selections + narrative both stored (re-composable for audit)
- [ ] No LLM in the composition path
- [ ] Generated narrative passes a grammar/readability lint
- [ ] Security gate passes

## Risks

- **Curating shrubs is high-leverage but slow:** the quality of the product depends on the quality of these option lists. Plan 1 week (parallel) with a psychiatrist to validate the v1 set.
- **Coherence:** mechanical composition can produce stilted prose. Composition templates (sentence patterns) matter as much as the options themselves.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `sidecar-scaffolding.md`, `og-edit-protocol.md`, `api-endpoints.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
