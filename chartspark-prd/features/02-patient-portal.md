# PRD-02 — Patient Portal v1

**Version:** 1.0
**Track:** B (AG)
**Mode:** Sidecar (`chartspark-portal`) — separate Next.js app
**Weeks:** 1–5
**Status:** Ready for build

---

## Why this exists

Every demo of ChartSparkOG to a clinician switching from ICANotes+ ends the same way: "Where's the patient portal?" Without one, patients can't self-register, complete intake online, message securely, schedule, pay, or take portal-delivered assessments. ICANotes+ has both Basic and Premium portals; ChartSparkOG has none.

This is the single largest visible gap in sales demos.

## Success criteria

A patient can:
- Receive an invite link from their clinician's office and create their account (one-time, MFA-enrolled)
- Complete digital intake forms before their first appointment, with e-signature
- Send and receive secure messages with their clinical team
- Schedule, reschedule, and cancel appointments
- View statements and pay online via Stripe
- Take portal-delivered assessments (PHQ-9, GAD-7, etc.) from Track A
- Upload documents to share with their clinician (insurance card, prior records)
- See their upcoming appointments

A clinician can:
- Send a portal invite from the patient chart
- See when a patient has completed assigned intake / assessment
- Reply to portal messages without leaving the clinical workspace
- Approve / decline patient-requested appointment changes

## Scope — v1 features

| Feature | In v1 | Notes |
|---|---|---|
| Invite-only registration | ✅ | No public self-registration |
| MFA enrollment | ✅ | TOTP after first login |
| Digital intake forms | ✅ | Clinician builds, patient completes |
| E-signature | ✅ | Canvas-based signature pad |
| Secure messaging | ✅ | HIPAA-compliant, AES-256-GCM payload |
| Appointment self-scheduling | ✅ | Reads provider availability from OG |
| Appointment cancellation | ✅ | Patient-initiated, clinician approves changes |
| Online payments | ✅ | Stripe (already integrated in OG) |
| Statement viewing | ✅ | Read-only from OG billing tables |
| Document upload (patient → clinician) | ✅ | Insurance cards, prior records, ID |
| Assessment delivery (Track A) | ✅ | Receives, completes, syncs back |
| Telehealth join | ✅ | Patient clicks link → joins Daily.co session |
| Document sharing (clinician → patient) | ❌ | v2 |
| Group messaging | ❌ | v2 |
| Care team view | ❌ | v2 |

## Architecture

**Mode:** Sidecar — a completely separate Next.js 15 app. Patients never touch OG's clinician auth surface.

**Repo:** `RedArkventures/chartspark-portal` at `C:\Users\joman\OneDrive\Desktop\chartspark-portal\`

**Deployment:** Vercel as separate project, served at `portal.chartspark.io`

**Auth:** Supabase Auth with a separate `patient` role (not the same as clinician auth). Patients are stored in `patient_portal_users` and linked to `patients.id` via `patient_id`.

**Database access:** New Postgres role `patient_portal` with RLS policies that scope every query to the authenticated patient's data only.

```
┌─────────────────┐         ┌─────────────────┐
│  chartspark.io  │         │ portal.chart-   │
│  (clinician)    │         │ spark.io        │
│  auth: user     │         │ (patient)       │
│  role: clinician│         │ auth: pt user   │
│  role: clinician│         │ role: pt_portal │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └──────────┬────────────────┘
                    │
        ┌───────────▼────────────┐
        │   Supabase Postgres    │
        │   (shared, RLS-scoped) │
        └────────────────────────┘
```

The portal queries OG's tables (`patients`, `appointments`, `billing_claims`, etc.) through the `patient_portal` role with **patient-specific RLS policies** that ensure a patient sees only their own data.

## Data model

```sql
-- Portal user accounts (separate from clinician users)
CREATE TABLE patient_portal_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE NOT NULL, -- Supabase Auth ID (separate auth namespace)
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  mfa_enrolled BOOLEAN DEFAULT FALSE,
  mfa_enforced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Invite tokens
CREATE TABLE patient_portal_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  token_hash TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES patient_portal_users(id)
);

-- Messages
CREATE TABLE portal_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  thread_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'clinician', 'staff')),
  sender_id UUID NOT NULL,
  body_encrypted TEXT NOT NULL, -- AES-256-GCM
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'
);

CREATE INDEX idx_messages_thread ON portal_messages(thread_id, sent_at);
CREATE INDEX idx_messages_patient ON portal_messages(org_id, patient_id, sent_at DESC);

-- Intake forms (clinician builds, patient fills)
CREATE TABLE portal_intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL, -- field definitions (JSON Schema-like)
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portal_intake_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  form_id UUID NOT NULL REFERENCES portal_intake_forms(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  response_id UUID
);

CREATE TABLE portal_intake_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  assignment_id UUID UNIQUE NOT NULL REFERENCES portal_intake_assignments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  responses JSONB NOT NULL,
  signed_at TIMESTAMPTZ,
  signature_data TEXT, -- base64 of canvas signature
  ip_address INET,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient-uploaded documents
CREATE TABLE portal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  uploaded_by UUID NOT NULL REFERENCES patient_portal_users(id),
  storage_path TEXT NOT NULL, -- Supabase Storage path
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  category TEXT, -- 'insurance_card' | 'id' | 'prior_records' | 'other'
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment requests (patient-initiated)
CREATE TABLE portal_appointment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  requested_by UUID NOT NULL REFERENCES patient_portal_users(id),
  appointment_id UUID REFERENCES appointments(id), -- null if new request
  request_type TEXT NOT NULL CHECK (request_type IN ('new', 'reschedule', 'cancel')),
  preferred_dates TIMESTAMPTZ[],
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on all tables — patient_portal role sees only their own data
-- Detailed policies in supabase/migrations/<feature>_tables.sql
```

## Critical security architecture

The `patient_portal` Postgres role has RLS policies on **existing OG tables** that scope reads to the authenticated patient's data only:

```sql
CREATE ROLE patient_portal NOINHERIT LOGIN PASSWORD '<rotated>';
GRANT USAGE ON SCHEMA public TO patient_portal;

-- Patient can see only their own demographics
CREATE POLICY portal_patient_self ON patients
  FOR SELECT TO patient_portal
  USING (id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));

-- Patient can see only their own appointments
CREATE POLICY portal_appts_self ON appointments
  FOR SELECT TO patient_portal
  USING (patient_id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));

-- Patient can see only their own billing statements
CREATE POLICY portal_billing_self ON billing_claims
  FOR SELECT TO patient_portal
  USING (patient_id = (
    SELECT patient_id FROM patient_portal_users WHERE auth_user_id = auth.uid()
  ));

-- (and so on for messages, documents, assessment_assignments)
```

The portal application code uses the `patient_portal` role's connection string. Even if the app code has a bug, RLS prevents cross-patient data leaks.

## OG-edit declarations

This feature requires **multiple OG edits** because of the patient_portal role + RLS policies on existing tables. The mini-PRD declares:

**Files allowed to modify:**
- `supabase/migrations/<ts>_patient_portal_role.sql` (NEW) — creates role + RLS policies
- `src/app/(app)/patients/[id]/page.tsx` — adds "Send Portal Invite" button + status indicator
- `src/components/patient/PortalInviteDialog.tsx` (NEW)
- `src/components/patient/PortalMessages.tsx` (NEW) — shows portal message thread inside clinical workspace
- `src/app/api/portal-invites/route.ts` (NEW) — clinician-side invite endpoint
- `src/app/api/portal-messages/route.ts` (NEW) — clinician-side message endpoint

**Files forbidden to modify:** All `src/lib/auth/*`, `src/lib/security/*`, `src/middleware.ts`, existing billing routes, existing RLS policies on patient tables (we ADD policies for the new role, we don't modify existing ones).

**Re-pentest scope:**
- The `patient_portal` Postgres role's grants and RLS policies
- The clinician-side invite + message endpoints
- The portal app's auth flow (login, MFA, invite claim)
- The patient_portal_users / patient_portal_invites table RLS
- Stripe webhook handling on the portal side

## API surface

### Portal API (patient-facing, on `portal.chartspark.io`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/claim-invite` | Token | Claim invite, set password |
| POST | `/api/auth/login` | Email+pw | Login |
| POST | `/api/auth/mfa/enroll` | Patient | Enroll TOTP |
| POST | `/api/auth/mfa/verify` | Patient | Verify TOTP |
| GET | `/api/me` | Patient | Get own profile |
| GET | `/api/intake-forms` | Patient | List assigned intake forms |
| POST | `/api/intake-responses` | Patient | Submit a completed intake |
| GET | `/api/messages` | Patient | List message threads |
| POST | `/api/messages` | Patient | Send a message |
| GET | `/api/appointments` | Patient | List own appointments |
| POST | `/api/appointment-requests` | Patient | Request new/reschedule/cancel |
| GET | `/api/billing/statements` | Patient | List own statements |
| POST | `/api/billing/pay` | Patient | Stripe checkout for an invoice |
| POST | `/api/documents/upload` | Patient | Upload to Supabase Storage |
| GET | `/api/assessments` | Patient | List assigned assessments |
| POST | `/api/assessments/:id/submit` | Patient | Submit completed assessment |

### OG API (clinician-facing, on `chartspark.io`) — these are the OG-edits

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/portal-invites` | Clinician | Create + email invite |
| GET | `/api/portal-invites/patient/:id` | Clinician | List patient's portal status |
| GET | `/api/portal-messages/patient/:id` | Clinician | List patient's message threads |
| POST | `/api/portal-messages` | Clinician | Reply to a thread |

## Acceptance criteria

- [ ] Invite flow works end-to-end (clinician sends → patient receives email → claims → MFA enrolls → logs in)
- [ ] Intake form builder works (clinician creates a form from JSON Schema fields)
- [ ] Patient completes intake, e-signs, submits; clinician sees submission in patient chart
- [ ] Messaging works bi-directionally, payloads encrypted at rest, audit-logged
- [ ] Appointment request flow: patient requests → clinician approves → appointment created
- [ ] Stripe payment flow tested end-to-end with a real test card
- [ ] Document upload works with file size limits (10MB) and mime-type validation
- [ ] Track A assessments flow through portal (depends on Track A delivery API)
- [ ] All RLS tests pass (cross-patient access is blocked at the database level)
- [ ] Security gate checklist passes
- [ ] DNS for `portal.chartspark.io` resolves and SSL valid
- [ ] No PHI in URLs (no patient names, IDs are UUIDs only)
- [ ] No PHI in client-side localStorage / sessionStorage

## Week-by-week plan

**Week 1 — Foundation + auth**
- Next.js 15 + Tailwind + shadcn scaffold
- Patient auth (separate Supabase Auth namespace)
- Invite claim flow
- MFA enrollment
- Subdomain DNS + Vercel deploy

**Week 2 — Intake forms**
- Form builder (clinician side, in OG — this is the OG-edit week)
- Form renderer (patient side, in portal)
- E-signature canvas
- Submission → patient demographics update flow

**Week 3 — Messaging**
- Thread list, thread view
- AES-256-GCM payload encryption
- Clinician-side message inbox component (OG)
- Audit logging on every message
- Push notification webhook to OG when patient sends

**Week 4 — Appointments + payments**
- Patient appointment self-scheduling (reads OG availability)
- Appointment request approval flow
- Stripe checkout
- Statement viewing
- Document upload

**Week 5 — Assessments + polish**
- Track A integration (assessment delivery)
- Telehealth join button (uses Daily.co link from appointment)
- QA pass
- Production deploy

## Dependencies

- **Blocks:** Track A's portal delivery flow needs the portal up to deliver assessments (week 5)
- **Blocked by:** None — Track B starts week 1

## Risks

- **DNS / SSL setup:** subdomain config can take 24–48h to propagate. Start week 1 day 1.
- **Patient identity verification:** invite-only model means we trust the clinician's email. If the clinician sends to the wrong email, the wrong person gets access. Mitigation: invite expires in 7 days, MFA required, audit log captures all access.
- **AES-256-GCM key management:** the encryption key must rotate. Use the same key management as OG's existing PHI encryption.
- **Stripe webhook signature validation:** must be bulletproof. One bug = anyone can mark invoices as paid.

## Skills to read before starting

1. `master/PRD-MASTER.md`
2. `skills/using-skills.md`
3. `skills/security-first.md`
4. `skills/sidecar-scaffolding.md` (the portal is a sidecar, just a Next.js one not Express)
5. `skills/rls-testing.md`
6. `skills/api-endpoints.md`
7. `skills/frontend-patterns.md`
8. `skills/og-edit-protocol.md` (for the week 2 OG-edit window)
9. `skills/testing-patterns.md`
10. This mini-PRD

Then begin.
