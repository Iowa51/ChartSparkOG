# PRD-03 — SMS + Email Appointment Reminders

**Version:** 1.0
**Track:** C (Codex)
**Mode:** OG-EDIT REQUIRED (cron must read OG's appointments table)
**Weeks:** 2–4
**Status:** Ready for build

---

## Why this exists

ICANotes+ markets up to 40% reduction in no-shows via automated reminders. Without this, clinicians lose revenue to no-shows during the transition. This is a small feature with outsized impact.

## Success criteria

- Patient who opted in to SMS receives a text 24h and 2h before their appointment
- Patient who opted in to email receives an email 24h before their appointment
- Patient can reply "C" to confirm or "R" to request reschedule
- Clinician sees confirmation status on the appointment in OG
- Reminder activity is logged and viewable in admin dashboard
- Org admin can configure timing (default T-24h and T-2h) and templates

## Scope

| In v1 | Out of v1 |
|---|---|
| SMS via Twilio (10DLC registered) | MMS attachments |
| Email via Resend | Voice/phone reminders |
| Reply "C" / "R" handling | Two-way conversational SMS |
| Per-org template customization | Multi-language templates (English only) |
| Org-level opt-in toggle | Per-appointment-type templates |
| Patient-level opt-in/out | Patient self-service template preference |

## OG-EDIT REQUIRED

**Justification:** The reminder cron must read OG's `appointments` table directly. Building this as a sidecar would require either (a) duplicating appointments data — bad, or (b) creating a webhook from OG on every appointment change — also bad. Direct DB access via a new module in OG is the right pattern.

**Files allowed to modify/create:**
- `supabase/migrations/<ts>_reminders_tables.sql` (NEW)
- `src/lib/reminders/twilio-client.ts` (NEW)
- `src/lib/reminders/email-sender.ts` (NEW)
- `src/lib/reminders/scheduler.ts` (NEW)
- `src/lib/reminders/types.ts` (NEW)
- `src/app/api/cron/send-reminders/route.ts` (NEW)
- `src/app/api/webhooks/twilio-sms-reply/route.ts` (NEW)
- `src/app/(app)/settings/reminders/page.tsx` (NEW) — admin UI
- `vercel.json` — add cron schedule (existing file)
- `package.json` — add `twilio` dep (existing file)
- `.env.example` — add stubs (existing file)

**Files forbidden to modify:** All `src/lib/auth/*`, all `src/lib/security/*`, `src/middleware.ts`, anything in existing billing or patient routes.

**Re-pentest scope:**
- The new cron route (CRON_SECRET validation, race conditions)
- The Twilio webhook (signature validation, replay attack prevention)
- The new tables' RLS policies
- The opt-in flow (TCPA compliance for SMS)

## Data model

```sql
CREATE TABLE reminder_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  sms_enabled BOOLEAN DEFAULT FALSE,
  email_enabled BOOLEAN DEFAULT TRUE,
  hours_before_appointment INTEGER[] NOT NULL DEFAULT ARRAY[24, 2],
  sms_template TEXT NOT NULL DEFAULT 'Reminder: appointment with {provider} on {date} at {time}. Reply C to confirm or R to reschedule.',
  email_template_subject TEXT NOT NULL DEFAULT 'Appointment Reminder',
  email_template_body TEXT NOT NULL,
  from_phone TEXT, -- org's Twilio number (10DLC registered)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminder_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  hours_before INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'responded')),
  response_text TEXT,
  external_id TEXT,
  UNIQUE (appointment_id, hours_before, channel) -- prevent duplicate sends
);

CREATE TABLE patient_reminder_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID UNIQUE NOT NULL REFERENCES patients(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  sms_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in_at TIMESTAMPTZ,
  sms_opt_out_at TIMESTAMPTZ,
  email_opt_in BOOLEAN DEFAULT TRUE,
  email_opt_in_at TIMESTAMPTZ DEFAULT NOW(),
  preferred_phone TEXT,
  preferred_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_reminder_prefs ENABLE ROW LEVEL SECURITY;
-- Standard org-scoped policies
```

## TCPA compliance

SMS opt-in is **explicit and recorded**. Patients must check a box during intake (or in portal settings) that says:

> "By providing my phone number and checking this box, I consent to receive appointment reminders via SMS from {practice name}. Standard message and data rates may apply. Reply STOP to unsubscribe at any time."

The `sms_opt_in_at` timestamp is the proof of consent. STOP replies set `sms_opt_in = false` and `sms_opt_out_at = NOW()`. No reminders go out if `sms_opt_in = false`.

## Acceptance criteria

- [ ] Cron runs every 15 minutes, finds appointments at T-24h and T-2h windows
- [ ] No duplicate reminders (UNIQUE constraint enforced)
- [ ] No reminders if patient opted out
- [ ] No reminders if org has the channel disabled
- [ ] Twilio webhook validates signature; rejects unsigned requests
- [ ] Reply "C" updates appointment `confirmed_at`
- [ ] Reply "R" creates a task in `tasks` table for staff
- [ ] Reply "STOP" updates `patient_reminder_prefs.sms_opt_in_at = false`
- [ ] All reminders logged with status
- [ ] Admin can view reminder log in settings page
- [ ] Security gate passes; RLS tests pass

## Plan

**Week 2:**
- Tables + RLS
- Twilio + Resend wrappers
- Admin settings page

**Week 3:**
- Cron route
- Scheduler logic
- SMS reply webhook

**Week 4:**
- TCPA opt-in flow integration (portal side)
- Reminder log dashboard
- E2E test
- Document re-pentest scope

## Dependencies

- **Blocks:** None
- **Blocked by:** Twilio 10DLC registration (start week 1, takes 2–3 weeks)

## Risks

- **10DLC registration delays:** start day 1 of week 1, even though build is week 2
- **Race conditions in cron:** UNIQUE constraint on `(appointment_id, hours_before, channel)` prevents duplicate sends even on overlapping cron runs

## Skills to read

1. `master/PRD-MASTER.md`
2. `skills/using-skills.md`
3. `skills/security-first.md`
4. `skills/og-edit-protocol.md`
5. `skills/rls-testing.md`
6. `skills/api-endpoints.md`
7. `skills/testing-patterns.md`
8. This mini-PRD
