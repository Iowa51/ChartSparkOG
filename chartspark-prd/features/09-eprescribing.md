# PRD-09 — E-Prescribing (Non-EPCS, Phase 1)

**Version:** 1.0
**Track:** G
**Mode:** OG-EDIT REQUIRED + vendor onboarding
**Week:** 12 (vendor onboarding starts week 4)
**Status:** Vendor-blocked; build is "prep complete" by week 12, not "live"

---

## Why this exists

E-prescribing (eRx) is non-negotiable for psychiatry practices. Surescripts is the only US network. Direct Surescripts onboarding takes 9–12 months; using a reseller (DrFirst, NewCrop, Tabula Rasa) takes 60–90 days. Non-EPCS (non-controlled-substance) is in scope for v1; EPCS (controlled substances, DEA-regulated, requires identity proofing + hardware token) is out of scope for v1.

## Success criteria (90-day target = "prep complete")

By end of week 12:
- Vendor (DrFirst recommended) contract signed
- Sandbox integration working end-to-end
- Production credentials provisioned, awaiting vendor go-live
- UI built and tested in sandbox
- Clinician training docs drafted

By end of week 16 (post-90-day):
- Production go-live with 1 pilot provider (Anchor Point's Jane Njiiri)

## Scope

| In Phase 1 | Out of Phase 1 |
|---|---|
| Non-EPCS prescriptions (SSRIs, SNRIs, mood stabilizers, etc.) | EPCS (Schedule II–V) |
| Patient pharmacy selection | Mail-order routing |
| Drug-drug interaction (DDI) checks | Allergy database (deferred to vendor's) |
| Drug-disease checks | Genomic-guided prescribing |
| Refill request inbox | Real-time prescription benefit (RTPB) |
| Prescription history (Surescripts MedHx) | PDMP queries (deferred — state-by-state) |

## Architecture

**Mode:** OG-edit (this lives close to the clinical workflow). Vendor SDK is called from OG server code only — patient-side never sees Surescripts credentials.

```
┌──────────────────────┐
│  OG Patient Chart    │
│  <PrescribePanel/>   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  OG API              │────▶│  DrFirst SDK         │
│  /api/eprescribe/*   │     │  (Surescripts proxy) │
└──────────────────────┘     └──────────────────────┘
```

## Data model

```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  prescriber_id UUID NOT NULL REFERENCES users(id),
  drug_ndc TEXT NOT NULL, -- National Drug Code
  drug_name TEXT NOT NULL,
  strength TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  sig TEXT NOT NULL, -- prescribing directions
  quantity NUMERIC NOT NULL,
  quantity_unit TEXT NOT NULL,
  refills INTEGER NOT NULL DEFAULT 0,
  daw BOOLEAN DEFAULT FALSE, -- dispense as written
  pharmacy_ncpdp_id TEXT, -- selected pharmacy
  surescripts_message_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'received_by_pharmacy', 'filled', 'cancelled', 'error')),
  sent_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescriber_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  npi TEXT NOT NULL,
  dea_number TEXT, -- only required for EPCS, but stored
  state_license_numbers JSONB, -- { "MD": "...", "VA": "..." }
  surescripts_id TEXT, -- provisioned by vendor
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refill_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  prescription_id UUID REFERENCES prescriptions(id),
  pharmacy_ncpdp_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  responded_by UUID REFERENCES users(id),
  responded_at TIMESTAMPTZ,
  surescripts_message_id TEXT UNIQUE
);

-- RLS org-scoped
```

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_eprescribing.sql`
- `src/lib/eprescribing/drfirst-client.ts` (NEW)
- `src/lib/eprescribing/types.ts` (NEW)
- `src/app/api/eprescribe/*` (NEW endpoints)
- `src/components/clinical/PrescribePanel.tsx` (NEW)
- `src/components/clinical/RefillInbox.tsx` (NEW)

**Re-pentest scope:** All new code, vendor credential handling, refill webhook signature validation.

## Acceptance criteria (week 12)

- [ ] Vendor contract signed (DrFirst preferred)
- [ ] Sandbox prescriber provisioned with NPI + state license
- [ ] DDI check renders in UI for at least 5 sample drug pairs
- [ ] Sandbox prescription sent to test pharmacy successfully
- [ ] Sandbox refill request received and processable
- [ ] Production credentials provisioned (not yet enabled)
- [ ] Clinician training doc written
- [ ] Security gate passes

## Risks

- **Vendor selection:** DrFirst vs NewCrop vs Tabula Rasa pricing varies $5K–$25K setup + per-prescriber/month. Decision needs James in week 4.
- **EPCS slip-in temptation:** controlled substance e-prescribing requires DEA-approved 2FA hardware. Tempting to add quickly; do NOT. EPCS is its own 90-day project.
- **State-by-state PDMP:** outside scope. Practices use the vendor's standalone PDMP portal in v1.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `api-endpoints.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
