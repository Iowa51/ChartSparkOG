# PRD-07 — Group Therapy Workflow

**Version:** 1.0
**Track:** E
**Mode:** OG-EDIT REQUIRED
**Week:** 10
**Status:** Spec ready

---

## Why this exists

Group therapy is a significant revenue source for behavioral health practices (CPT 90853 = group psychotherapy, ~$30–50/patient/session, billed for each attendee). Documenting groups one-note-at-a-time takes 45+ minutes; ICANotes+ ships a "session → N individualized notes" workflow that cuts this to <10 minutes. Without this, ChartSparkOG loses group practices entirely.

## Success criteria

A clinician can:
- Create a group session record with one shared theme/topic/curriculum
- Attach N attendees (existing patients)
- Document each attendee's individual participation in <60 seconds per attendee
- Generate N individualized notes (one per attendee) sharing the group context but with unique per-patient content
- Bill all N attendees with CPT 90853 in one click

## Data model

```sql
CREATE TABLE group_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  facilitated_by UUID NOT NULL REFERENCES users(id),
  co_facilitator_id UUID REFERENCES users(id),
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  group_name TEXT NOT NULL,
  modality TEXT, -- 'CBT', 'DBT', 'process', 'psychoeducation', etc.
  topic TEXT NOT NULL,
  shared_content TEXT, -- curriculum, exercises, discussion points
  cpt_code TEXT NOT NULL DEFAULT '90853',
  pos_code TEXT NOT NULL, -- place of service
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_session_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  attended BOOLEAN DEFAULT TRUE,
  participation_text TEXT, -- patient-specific notes
  affect_observed TEXT,
  goals_progress TEXT,
  individual_note_id UUID REFERENCES clinical_notes(id), -- generated note
  billing_claim_id UUID REFERENCES billing_claims(id),
  UNIQUE(group_session_id, patient_id)
);

CREATE INDEX idx_group_sessions_org_date ON group_sessions(org_id, session_date DESC);
CREATE INDEX idx_group_attendees_patient ON group_session_attendees(org_id, patient_id);

ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_session_attendees ENABLE ROW LEVEL SECURITY;
-- Org-scoped policies
```

## Note generation

When a group session is finalized:
- For each attendee, create a `clinical_notes` row
- Note body = shared_content + " " + attendee's participation_text
- Each note is signed independently by the facilitator
- Each note is independently billable (90853)

This is **not** an AI-generated note. It's deterministic string composition. AI is not in the loop here.

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_group_sessions.sql`
- `src/app/(app)/groups/page.tsx` (NEW — group session list)
- `src/app/(app)/groups/[id]/page.tsx` (NEW — group session editor)
- `src/components/clinical/GroupSessionBuilder.tsx` (NEW)
- `src/app/api/group-sessions/route.ts` (NEW + nested)

**Re-pentest scope:** New tables, new routes, batch claim creation logic.

## Acceptance criteria

- [ ] Create group session with metadata
- [ ] Add/remove attendees
- [ ] Each attendee has independent participation text
- [ ] Finalize creates N individual notes
- [ ] Finalize creates N billing claims with CPT 90853
- [ ] Audit log captures each note + claim creation
- [ ] RLS prevents cross-org visibility of group sessions
- [ ] Security gate passes

## Risks

- **Billing accuracy:** wrong POS or CPT modifier on group session = denied claims. Validate against state Medicaid + Medicare rules before launch.
- **Patient consent for group:** outside scope of this PRD; assume practices have their own consent workflow.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
