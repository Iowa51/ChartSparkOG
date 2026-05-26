# PRD-15 — Practice Suite Bundle (FrontDesk AI ↔ ChartSparkOG)

**Version:** 1.0
**Track:** I
**Mode:** Webhook integration between two products
**Week:** 12
**Status:** Spec ready

---

## Why this exists

FrontDesk AI (separate ChartSpark product) is a HIPAA-compliant chatbot for mental health practitioner websites that captures patient leads and screens for risk. When bundled with ChartSparkOG, a lead captured by FrontDesk AI should flow directly into ChartSparkOG as a patient record with assessment data prefilled. This creates a "Practice Suite" sales motion that neither product has alone — and ICANotes+ does not offer.

## Success criteria

A practice using both products:
- A website visitor chats with FrontDesk AI bot
- Bot screens for risk (deterministic lexicon → ML classifier → LLM judge)
- High-risk visitor gets immediate crisis resources (988, Crisis Text Line)
- Lower-risk visitor gets matched with a clinician slot
- Lead capture data is sent to ChartSparkOG via signed webhook
- ChartSparkOG creates a patient record with intake data prefilled
- Clinician sees the lead in a new "Inbound Leads" queue
- Clinician can convert lead → patient + send portal invite (PRD-02)

## Architecture

**Mode:** Webhook from FrontDesk AI to ChartSparkOG. Both products remain independent; the integration is a signed HTTP request.

```
┌────────────────────┐    POST /api/leads/inbound    ┌────────────────────┐
│  FrontDesk AI      │──────────────────────────────▶│  ChartSparkOG       │
│  (practice site)   │   HMAC-SHA256 signed          │  /api/leads/inbound │
└────────────────────┘                                └─────────┬──────────┘
                                                                │
                                                                ▼
                                                    ┌────────────────────┐
                                                    │  Lead queue        │
                                                    │  + patient draft   │
                                                    └────────────────────┘
```

## Data model (in OG)

```sql
CREATE TABLE inbound_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  source TEXT NOT NULL DEFAULT 'frontdesk_ai',
  external_lead_id TEXT UNIQUE NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  -- Captured data (with patient consent given on the bot side)
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  reason_for_outreach TEXT,
  insurance_summary TEXT, -- payer + member id if collected
  preferred_provider_id UUID REFERENCES users(id),
  preferred_dates JSONB,
  -- Risk screening result
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  risk_flags JSONB,
  -- Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'converted', 'declined', 'duplicate')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  converted_to_patient_id UUID REFERENCES patients(id),
  notes TEXT
);

CREATE INDEX idx_leads_status_org ON inbound_leads(org_id, status, received_at DESC);
ALTER TABLE inbound_leads ENABLE ROW LEVEL SECURITY;
-- Org-scoped policies
```

## Webhook signature

```
X-FrontDesk-Signature: t=<unix-ts>,v1=<HMAC-SHA256>
```

Where the payload signed is `t + "." + raw_body`. Receiver:
- Rejects if timestamp older than 5 minutes (replay protection)
- Computes HMAC with shared secret, compares constant-time
- Rejects on any mismatch

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_inbound_leads.sql`
- `src/app/api/leads/inbound/route.ts` (NEW) — webhook receiver
- `src/app/(app)/leads/page.tsx` (NEW) — lead queue UI
- `src/components/leads/LeadCard.tsx` (NEW)
- `src/components/leads/ConvertLeadDialog.tsx` (NEW)
- `src/lib/leads/convert.ts` (NEW) — lead → patient conversion logic
- `src/lib/security/hmac.ts` — verify-only addition if not already present

**Re-pentest scope:** The webhook receiver (HMAC validation, replay protection, rate limit), the lead conversion logic, the lead queue RLS.

## Acceptance criteria

- [ ] Webhook receives signed payload; rejects unsigned
- [ ] Webhook rejects stale timestamps (>5 min)
- [ ] Duplicate detection by `external_lead_id` (idempotent receives)
- [ ] High-risk leads tagged and surfaced at top of queue
- [ ] One-click "Convert to Patient" creates patient + sends portal invite (depends on PRD-02)
- [ ] RLS prevents cross-org lead visibility
- [ ] Security gate passes

## Risks

- **Webhook secret rotation:** must coordinate between FrontDesk AI and OG. Use a key-version field to enable rotation without downtime.
- **PHI in webhook payloads:** by definition, leads contain identifying info. Webhook receiver logs only IDs and signature validity, never payload content.
- **FrontDesk AI not yet production-ready:** if it's still in dev, this PRD's go-live shifts. Build the receiver anyway; it just sits idle.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `api-endpoints.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
