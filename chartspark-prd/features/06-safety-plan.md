# PRD-06 — Safety Plan + Structured Suicide Risk Assessment

**Version:** 1.0
**Track:** E
**Mode:** Sidecar component + portal integration
**Week:** 10
**Status:** Spec ready

---

## Why this exists

Clinical and legal table stakes for behavioral health. Stanley-Brown Safety Planning Intervention is the evidence-based standard. C-SSRS structured suicide risk assessment (covered in Track A as a rating scale) feeds into this. Without a safety plan tool, ChartSparkOG is not a credible behavioral health EHR.

## Success criteria

A clinician can complete a Stanley-Brown safety plan with a patient in <5 minutes, share it with the patient via portal, and the plan is reviewable and revisable across sessions.

## Stanley-Brown components

1. Warning signs (thoughts, moods, situations)
2. Internal coping strategies
3. People and social settings that provide distraction
4. People to ask for help
5. Professionals + agencies (with phone numbers)
6. Making the environment safe (means restriction)

## Data model

```sql
CREATE TABLE safety_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  effective_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revised', 'discontinued')),
  warning_signs JSONB NOT NULL DEFAULT '[]',
  internal_coping JSONB NOT NULL DEFAULT '[]',
  distraction_contacts JSONB NOT NULL DEFAULT '[]',
  help_contacts JSONB NOT NULL DEFAULT '[]',
  professional_contacts JSONB NOT NULL DEFAULT '[]',
  means_restriction JSONB NOT NULL DEFAULT '[]',
  shared_with_patient_at TIMESTAMPTZ,
  shared_via TEXT CHECK (shared_via IN ('print', 'portal', 'email')),
  -- 988 + Crisis Text Line ALWAYS included in professional_contacts by default
  signed_by_patient BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ
);

-- RLS org-scoped
```

The portal-side renderer is patient-readable, not editable. Safety plans are clinician-authored only.

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_safety_plans.sql`
- `src/app/(app)/patients/[id]/safety-plan/page.tsx` (NEW)
- `src/components/clinical/SafetyPlanBuilder.tsx` (NEW)
- Portal-side viewer in `chartspark-portal` repo (sidecar work, separate file)

**Re-pentest scope:** New table, new clinician routes, portal viewer auth path.

## Acceptance criteria

- [ ] All 6 Stanley-Brown sections implemented
- [ ] 988 Suicide & Crisis Lifeline auto-included in professional contacts
- [ ] Crisis Text Line (text HOME to 741741) auto-included
- [ ] Print/PDF version is patient-friendly (large fonts, no clinical jargon)
- [ ] Portal viewer shows latest active safety plan
- [ ] Revision creates new row; old plan archived not deleted
- [ ] Link to C-SSRS score (Track A) on the same patient
- [ ] Security gate passes

## Risks

- **Crisis resource accuracy:** 988 is the current US standard (replaced 1-800-273-8255 in 2022). Verify with current sources before launch.
- **Patient cannot edit:** strict — patient never edits their own safety plan. Only the clinician.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
