# PRD-01 — Rating Scales Library

**Version:** 1.2
**Track:** A (CC)
**Mode:** Sidecar (`chartspark-assessments`)
**Weeks:** 1–3
**Status:** Ready for build

---

## Why this exists

A behavioral health clinician's daily workflow includes administering standardized rating scales — PHQ-9 for depression, GAD-7 for anxiety, C-SSRS for suicide risk. ICANotes+ ships 100+ scales built-in. Without these, ChartSparkOG isn't a viable EHR for behavioral health.

This is the highest-impact, lowest-risk feature in the parity plan.

**Note on `screening_scores`:** A legacy `screening_scores` table exists in the OG schema as a leftover scaffold from a prior sprint and is not connected to any production code path. It is NOT used by this feature. The three new tables defined below (`assessment_administrations`, `assessment_results`, `assessment_assignments`) are the canonical data model. The legacy table will be dropped in a separate cleanup migration after this feature ships; do not write to it, do not migrate data from it.

## Success criteria

A clinician can:
- Pick from 15 rating scales in a dropdown on the patient chart
- Administer the scale themselves (during a session) or assign it to the patient (delivered via portal)
- See the score, severity band, and one-line interpretation immediately
- View a trend chart of all administrations of any scale over time
- Insert the score + narrative interpretation into a clinical note with one click

## Scope — the 15 scales

| # | Scale | Items | Time | Type | Public domain |
|---|---|---|---|---|---|
| 1 | PHQ-9 | 9 | 2 min | Self-report | Yes |
| 2 | GAD-7 | 7 | 2 min | Self-report | Yes |
| 3 | C-SSRS (Screen + Risk) | ~6 | 3 min | Clinician | Yes (free use) |
| 4 | AUDIT-C | 3 | 1 min | Self-report | Yes |
| 5 | CAGE | 4 | 1 min | Self/clinician | Yes |
| 6 | DAST-10 | 10 | 3 min | Self-report | Yes |
| 7 | MDQ | 13 | 3 min | Self-report | Yes (free use) |
| 8 | PCL-5 | 20 | 5 min | Self-report | Yes |
| 9 | ACE | 10 | 3 min | Self-report | Yes |
| 10 | ASRS | 18 | 5 min | Self-report | Yes (free use) |
| 11 | CIWA-Ar | 10 | 5 min | Clinician | Yes |
| 12 | COWS | 11 | 5 min | Clinician | Yes |
| 13 | DASS-21 | 21 | 5 min | Self-report | Yes |
| 14 | HAM-A | 14 | 10 min | Clinician | Yes |
| 15 | HAM-D | 17 | 15 min | Clinician | Yes |

All 15 are freely usable; no licensing fees. **Out of scope for v1:** copyrighted scales requiring licensing (e.g., BDI-II, MMPI). Defer to v2 with proper licensing budget.

## Architecture

**Mode:** Pure sidecar. Zero OG file edits except adding the feature flag row and one UI hook point (a small JSX edit on the patient chart page — declared below as a minor OG-edit).

**Repo:** `RedArkventures/chartspark-assessments` at `C:\Users\joman\OneDrive\Desktop\chartspark-assessments\`

**Service:** Express on **port 3301** (Track A's assigned port; see master PRD §3.5 for port assignments), deployed to Vercel as `chartspark-assessments`

**Database:** New tables in the shared Supabase project (`eepwbtdqtdnqxeznykbh`)

## Data model

```sql
-- Administrations: an instance of giving a scale
CREATE TABLE assessment_administrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  scale_id TEXT NOT NULL,
  administered_by UUID REFERENCES users(id),
  administered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('clinician', 'portal_self', 'portal_assigned')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  completed_at TIMESTAMPTZ,
  responses JSONB NOT NULL DEFAULT '{}',
  -- TODO(v2): move scale_id validation to a lookup table (scales_catalog)
  -- to avoid destructive ALTER TABLE migrations when adding new scales.
  CONSTRAINT valid_scale CHECK (scale_id IN (
    'phq9','gad7','cssrs','auditc','cage','dast10','mdq','pcl5',
    'ace','asrs','ciwaar','cows','dass21','hama','hamd'
  ))
);

-- Results: scored output of an administration
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  administration_id UUID UNIQUE NOT NULL REFERENCES assessment_administrations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  scale_id TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  sub_scores JSONB,
  severity TEXT NOT NULL,
  severity_code TEXT NOT NULL,
  flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  interpretation TEXT,
  narrative TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignments: clinician schedules a scale for patient to complete via portal
CREATE TABLE assessment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  scale_id TEXT NOT NULL,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date DATE,
  recurring TEXT CHECK (recurring IS NULL OR recurring IN ('weekly', 'biweekly', 'monthly')),
  completed BOOLEAN DEFAULT FALSE,
  administration_id UUID REFERENCES assessment_administrations(id)
);

-- Indexes
CREATE INDEX idx_admin_patient ON assessment_administrations(org_id, patient_id, administered_at DESC);
CREATE INDEX idx_admin_status ON assessment_administrations(org_id, status) WHERE status != 'completed';
CREATE INDEX idx_results_patient_scale ON assessment_results(org_id, patient_id, scale_id, scored_at DESC);
CREATE INDEX idx_assignments_pending ON assessment_assignments(org_id, patient_id) WHERE completed = FALSE;

-- RLS — see security-first skill for full policy pattern
ALTER TABLE assessment_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;

-- Standard org-scoped policies with USING + WITH CHECK on all three tables
```

## API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/scales` | List available scales (id, name, description, item count) |
| GET | `/api/v1/scales/:scaleId` | Get scale definition (items, response options, cutoffs) |
| POST | `/api/v1/administer` | Start a new administration |
| PATCH | `/api/v1/administer/:id` | Update responses (in-progress save) |
| POST | `/api/v1/administer/:id/complete` | Finalize, trigger scoring |
| GET | `/api/v1/results/:id` | Get a single result |
| GET | `/api/v1/results/patient/:patientId` | List all results for patient |
| GET | `/api/v1/results/patient/:patientId/trend/:scaleId` | Trend data for chart |
| POST | `/api/v1/assignments` | Assign scale to patient (portal delivery) |
| DELETE | `/api/v1/assignments/:id` | Cancel pending assignment |
| GET | `/health` | Liveness check |

All routes (except `/health`) require auth + MFA.

## Scoring engine contract

Each scale lives in `src/scales/<scaleId>.ts` exporting:

```typescript
export const phq9: Scale = {
  id: "phq9",
  name: "PHQ-9",
  fullName: "Patient Health Questionnaire-9",
  description: "Depression severity screening",
  timeFrame: "Over the last 2 weeks...",
  type: "self-report",
  scoringRange: [0, 27],
  items: [/* 9 items */],
  scoringFn: scorePhq9,
  narrativeFn: narrativePhq9,
  cutoffs: [
    { min: 0, max: 4, label: "Minimal", code: "minimal" },
    { min: 5, max: 9, label: "Mild", code: "mild" },
    { min: 10, max: 14, label: "Moderate", code: "moderate" },
    { min: 15, max: 19, label: "Moderately Severe", code: "mod_severe" },
    { min: 20, max: 27, label: "Severe", code: "severe" },
  ],
  publicDomain: true,
  specialRules: {
    suicideRiskItem: "q9", // Q9 ≥ 1 triggers `suicide_risk_item` flag
  },
};
```

Scoring is deterministic, fully unit-tested, no LLM involvement.

## Established patterns (from Week 1 build)

These patterns emerged during Week 1's first 5 scales (PHQ-9, GAD-7, C-SSRS, AUDIT-C, CAGE). They are the canonical templates for the remaining 10.

### Generic `Scale<R>` for non-Likert response shapes

The `Scale` interface is generic on its response type, defaulting to `Responses` (the plain `Record<string, number>` Likert-friendly shape). Most scales declare as `: Scale` and let TypeScript infer `Scale<Responses>`. Scales whose items carry richer per-item state (Yes/No + timeframe + behavior context, like C-SSRS) declare their own response type alongside, then `: Scale<CssrsResponses>` etc.

```typescript
// types.ts adds the richer type alongside Responses
export type CssrsResponses = { item1: CssrsItemResponse; ...; item6: CssrsItemResponse };

// cssrs.ts uses the explicit generic
export const cssrs: Scale<CssrsResponses> = { ..., scoringFn: scoreCssrs, ... };
```

The Supabase `responses JSONB` column accommodates either shape. The API endpoint that receives responses Zod-validates against the scale's expected shape before invoking the scoring function.

### Context-aware scoring (when out-of-band data influences the score)

When a scale's scoring depends on data outside the clinical responses — patient sex for AUDIT-C, age for HAM-D pediatric variants — use **parallel signatures with a conservative-default wrapper**:

```typescript
// Rich functions accept the context
export function scoreXxx(responses: Responses, context?: XxxContext): ScoringResult
export function narrativeXxx(result: ScoringResult, context?: XxxContext): string

// Scale wrapper defaults context to undefined (conservative posture)
export const xxx: Scale = {
  scoringFn: (responses) => scoreXxx(responses, undefined),
  narrativeFn: (result) => narrativeXxx(result, undefined),
  ...
};
```

The context type lives in the scale's own file (e.g., `auditc.ts`), not in shared `types.ts`. It's a scoring-time argument, not a framework type.

### Refuse-to-claim-without-data

When a label or flag requires input you don't have, return `null` from the threshold lookup and refuse to emit the flag. The positive-screen flag can still fire under the conservative default; the more specific severity flag (which depends on the missing data) does NOT fire.

```typescript
function severeThreshold(sex: AuditCContext["patientSex"]): number | null {
  if (sex === "male") return 7;
  if (sex === "female") return 5;
  return null;  // unknown sex — refuse to assert severity
}
```

### `noUncheckedIndexedAccess` defensive-fallback in `reduce`

Every scale that sums Likert items uses the same `?? 0` + `istanbul ignore next` template after `validateResponses`. See `testing-patterns` skill for the canonical block.

### Stable narrative markers

Narratives use **stable phrasing** that clinicians can scan for:

- **"Clinically indicated: ..."** — surfaces actionable findings (C-SSRS High, AUDIT-C severe-use, CAGE positive). Treat as a contract; any future scale that wants to surface "this requires clinician action" uses this exact prefix.
- **"thresholds not applied"** — appears in narratives where out-of-band context was missing and a conservative posture was used. Tells the clinician the result is preliminary pending demographic data.

### `POSITIVE_THRESHOLD` (or similar) as a named constant

Pulling the binary cutoff out as a named constant (vs embedding it in both the cutoffs array and the flag logic) is the readable pattern. Future scales adopt it; existing scales backport in a refactoring day.

### Public-domain attribution

Every scale's source file leads with a comment block naming the original authors, year, publication, and explicit licensing terms (free clinical/research/educational use). This is for audit traceability — if a scale's licensing changes, the comment tells the reviewer where to verify.

## OG-edit declarations

This feature requires **two minor OG edits**:

### OG-edit 1: Feature flag row (data only)

Insert one row into `feature_flags`:
```sql
INSERT INTO feature_flags (key, default_enabled, description) VALUES
  ('rating_scales_enabled', false, 'Track 01: Rating scales sidecar');
```

### OG-edit 2: UI hook on patient chart page

**Files allowed to modify:**
- `src/app/(app)/patients/[id]/page.tsx` — add an `<AssessmentsTab>` component import + render
- `src/components/patient/AssessmentsTab.tsx` — NEW file, calls the sidecar API

**Files forbidden to modify:** Everything else.

**Re-pentest scope:**
- The new component's auth pass-through
- CORS on the sidecar API
- Feature flag fail-closed behavior

## Acceptance criteria

- [ ] All 15 scales load, score, and produce narratives
- [ ] Each scale has full Jest coverage including edge cases (all-zero, all-max, missing items, out-of-range)
- [ ] RLS tests pass for all 3 new tables (see `rls-testing` skill)
- [ ] PHQ-9 Q9 ≥ 1 triggers `suicide_risk_item` flag and surfaces a UI alert
- [ ] C-SSRS lifetime + recent suicide risk triggers immediate clinician notification
- [ ] Trend chart renders for any scale with ≥2 administrations
- [ ] Score + narrative inserts into clinical note via one click
- [ ] Portal delivery: patient receives assignment → completes → score syncs back
- [ ] Feature flag defaults OFF; orgs see nothing until enabled
- [ ] No PHI in logs (verify with manual log review)
- [ ] Security gate checklist passes (see `security-first` skill)

## Week-by-week plan

**Week 1 — Foundation + 5 scales**
- Day 1: Scaffold repo using `sidecar-scaffolding` skill
- Day 2: Scale interface, scoring engine, narrative generator framework
- Day 3: PHQ-9 (with suicide flag) + GAD-7
- Day 4: C-SSRS + AUDIT-C
- Day 5: CAGE; deploy preview; full Jest coverage on first 5

**Week 2 — 10 more scales**
- Day 1: DAST-10, MDQ
- Day 2: PCL-5, ACE
- Day 3: ASRS, CIWA-Ar
- Day 4: COWS, DASS-21
- Day 5: HAM-A, HAM-D (clinician-rated UX)

**Week 3 — Integration + UI**
- Day 1–2: OG-edit window opens; build `AssessmentsTab` component in OG
- Day 3: Trending chart + score insertion into note
- Day 4: Portal delivery flow (depends on Track B portal being up — coordinate)
- Day 5: QA pass, deploy to production preview, hand off to James for review

## Dependencies

- **Blocks:** Track B portal delivery (week 5) needs `assessment_assignments` table — coordinate API contracts.
- **Blocked by:** None — Track A starts week 1.

## Risks

- **C-SSRS complexity:** multi-branch logic (lifetime → recent → severity). Budget extra time on day 4 week 1.
- **HAM-A / HAM-D clinician UX:** these are clinician-rated, longer, used less frequently. Validate with James before building the UI.

## Skills to read before starting

1. `master/PRD-MASTER.md`
2. `skills/using-skills.md`
3. `skills/security-first.md`
4. `skills/sidecar-scaffolding.md`
5. `skills/rls-testing.md`
6. `skills/api-endpoints.md`
7. `skills/testing-patterns.md`
8. This mini-PRD

Then begin.
