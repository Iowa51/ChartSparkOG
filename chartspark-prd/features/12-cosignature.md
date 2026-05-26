# PRD-12 — Co-Signature Workflow

**Version:** 1.0
**Track:** E
**Mode:** OG-EDIT REQUIRED
**Week:** 12
**Status:** Spec ready

---

## Why this exists

Behavioral health practices employ provisionally-licensed clinicians (LGPC, LMSW, residents, interns) who require supervisor co-signature on every note for it to be billable. Without a structured co-sign workflow, practices use email or in-person paper sign-offs — slow, error-prone, audit-fail. ICANotes+ has co-sign built in.

## Success criteria

- A provisionally-licensed clinician signs a note → it enters a "pending co-sign" state, not billable
- Their assigned supervisor sees the note in a co-sign queue
- Supervisor reviews, optionally edits, and co-signs
- After co-sign, the note becomes billable and locks
- Co-sign metadata is auditable (who, when, IP, optional review notes)

## Data model

```sql
-- Augment users table with supervisor relationships (small OG-edit)
ALTER TABLE users ADD COLUMN requires_cosign BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN supervisor_id UUID REFERENCES users(id);

-- Augment clinical_notes (small OG-edit)
ALTER TABLE clinical_notes ADD COLUMN cosign_required BOOLEAN DEFAULT FALSE;
ALTER TABLE clinical_notes ADD COLUMN cosign_status TEXT DEFAULT 'not_required'
  CHECK (cosign_status IN ('not_required', 'pending', 'completed', 'rejected'));
ALTER TABLE clinical_notes ADD COLUMN cosigned_by UUID REFERENCES users(id);
ALTER TABLE clinical_notes ADD COLUMN cosigned_at TIMESTAMPTZ;
ALTER TABLE clinical_notes ADD COLUMN cosign_notes TEXT;

CREATE TABLE cosign_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  note_id UUID NOT NULL REFERENCES clinical_notes(id),
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('clinician', 'supervisor')),
  action TEXT NOT NULL CHECK (action IN ('signed', 'cosign_requested', 'cosign_approved', 'cosign_rejected', 'cosign_edited')),
  notes TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_cosign_pending ON clinical_notes(org_id, cosign_status) WHERE cosign_status = 'pending';
```

## Business rules

- A note's `cosign_required` is set automatically based on `users.requires_cosign` of the signing clinician
- When a clinician with `requires_cosign = true` signs a note, the note enters `cosign_status = 'pending'`
- The supervisor (from `users.supervisor_id`) sees it in their co-sign queue
- Supervisor can:
  - Approve → `cosign_status = 'completed'`, note locks for billing
  - Reject → `cosign_status = 'rejected'`, note unlocks for editing, clinician notified
  - Edit + approve → edits applied, `cosign_status = 'completed'`, history captured
- Billing claims cannot be generated from notes with `cosign_required = true AND cosign_status != 'completed'`

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_cosign.sql`
- `src/lib/cosign/policies.ts` (NEW) — business rules
- `src/app/(app)/cosign-queue/page.tsx` (NEW) — supervisor's queue
- `src/components/clinical/CosignBanner.tsx` (NEW) — shows on notes pending cosign
- `src/components/clinical/CosignDialog.tsx` (NEW)
- `src/app/api/cosign/route.ts` (NEW endpoints)
- Modify `src/app/api/clinical-notes/[id]/sign/route.ts` — branch on requires_cosign

**Re-pentest scope:** Cosign state machine (cannot bypass cosign requirement), billing claim generation gate, history table integrity.

## Acceptance criteria

- [ ] Provisional clinician signs → note enters pending state
- [ ] Supervisor sees note in their queue
- [ ] Approve transitions note to completed + billable
- [ ] Reject unlocks note + notifies clinician (email + in-app)
- [ ] Edit-and-approve captures both the edit and the approval
- [ ] Billing claim generation refuses non-cosigned notes
- [ ] Cosign history is append-only; cannot be edited
- [ ] RLS scoped so supervisor in org A cannot see queue in org B
- [ ] Security gate passes

## Risks

- **State machine bugs:** the cosign state machine has 4 states. Test every transition + every illegal transition refusal.
- **Supervisor offboarding:** if a supervisor leaves the practice, their pending queue needs reassignment. Build admin tool for this.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `api-endpoints.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
