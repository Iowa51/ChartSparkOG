# PRD-05 — Structured Treatment Plan

**Version:** 1.0
**Track:** E
**Mode:** OG-EDIT REQUIRED
**Week:** 9
**Status:** Spec ready

---

## Why this exists

Payers (Medicaid, Medicare, commercial) require treatment plans with a specific structure: Problem → Goal → Objective → Intervention. Free-text "treatment plans" fail audits. ICANotes+ ships this structure built-in.

## Success criteria

A clinician creates a treatment plan with multiple problems, each with goals, each with measurable objectives and specific interventions. The plan is reviewable, signable, and updates carry forward across sessions.

## Data model

```sql
CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  effective_date DATE NOT NULL,
  review_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'reviewed', 'discontinued')),
  signed_at TIMESTAMPTZ,
  signed_by UUID REFERENCES users(id)
);

CREATE TABLE treatment_plan_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  problem_text TEXT NOT NULL,
  icd10_code TEXT, -- clinician-selected, not AI-suggested
  priority INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE treatment_plan_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID NOT NULL REFERENCES treatment_plan_problems(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE treatment_plan_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES treatment_plan_goals(id) ON DELETE CASCADE,
  objective_text TEXT NOT NULL,
  measurable_criterion TEXT NOT NULL, -- e.g., "PHQ-9 < 10 for 4 weeks"
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  achieved_at TIMESTAMPTZ
);

CREATE TABLE treatment_plan_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES treatment_plan_objectives(id) ON DELETE CASCADE,
  intervention_text TEXT NOT NULL,
  frequency TEXT, -- "weekly", "biweekly", "as needed"
  responsible_party TEXT, -- "clinician", "patient", "family"
  status TEXT NOT NULL DEFAULT 'active'
);

-- RLS on all five tables, org-scoped
```

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_treatment_plans.sql`
- `src/app/(app)/patients/[id]/treatment-plan/page.tsx` (NEW)
- `src/components/clinical/TreatmentPlanBuilder.tsx` (NEW)
- `src/app/api/treatment-plans/route.ts` (NEW + nested routes)

**Re-pentest scope:** Five new tables, new routes, new RLS policies.

## Acceptance criteria

- [ ] Problem → Goal → Objective → Intervention nesting works
- [ ] Each level can be edited independently
- [ ] Sign workflow with clinician sign + optional supervisor co-sign
- [ ] Plan can be copied/revised when reviewed (versioning)
- [ ] Print/PDF export
- [ ] Linked to ICD-10 (clinician selects, no AI suggestion)
- [ ] RLS tests pass for all 5 tables
- [ ] Security gate passes

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
