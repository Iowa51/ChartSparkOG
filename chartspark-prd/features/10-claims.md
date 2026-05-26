# PRD-10 — Pre-Submission Claim Scrubber + ERA Auto-Post

**Version:** 1.0
**Track:** D (CC)
**Mode:** Sidecar (`chartspark-claims`)
**Weeks:** 5–8
**Status:** Already architected; this PRD locks the build scope

---

## Why this exists

Two of the highest-revenue-impact behavioral health billing problems:
1. **Claims denied for fixable errors** — wrong POS, missing modifier, mismatched diagnosis pointer. Industry averages 5–10% denial rate; a scrubber that catches errors pre-submission cuts that to <2%.
2. **Manual ERA posting** — accountants/billers spend hours reconciling 835 files to claims by hand. Auto-matching is a 10-hour-per-week saver per biller.

ChartSparkOG already has the Office Ally clearinghouse adapter (AES-256-GCM) and an 835 parser. This sidecar productionizes both with a real workflow.

## Success criteria

- A claim that would have been denied for a fixable reason is caught before submission and surfaced to the biller for correction
- An ERA (835 file) is automatically matched to claims and posted to the patient ledger with no human intervention >90% of the time
- Unmatched ERAs surface to a human review queue with the diff highlighted
- All scrubber decisions are explainable (which rule caught which claim)

## Architecture

**Mode:** Pure sidecar. Reads claims from OG's `billing_claims` table via a scoped role; never modifies OG core.

**Repo:** `RedArkventures/chartspark-claims` at `C:\Users\joman\OneDrive\Desktop\chartspark-claims\`

**Service:** Express on port 3400, deployed to Vercel as `chartspark-claims`

**Vendor (optional):** Stedi for X12 837/835 parsing/validation (alternative: keep using existing OG 835 parser + add 837 validator)

```
┌────────────────────┐    1. submit       ┌─────────────────────┐
│  OG Billing UI     │──────────────────▶│  chartspark-claims  │
│                    │                    │  /scrub             │
│                    │◀──────────────────│  → result + errors  │
└────────────────────┘    2. result       └─────────────────────┘

┌────────────────────┐                    ┌─────────────────────┐
│  Office Ally       │── 835 file ──────▶│  chartspark-claims  │
│  clearinghouse     │                    │  /era/ingest        │
└────────────────────┘                    │  → auto-match       │
                                          └─────────────────────┘
```

## Data model

```sql
CREATE TABLE scrub_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id), -- null = system default
  rule_code TEXT NOT NULL UNIQUE, -- e.g., 'POS_MISMATCH_TELEHEALTH'
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scrub_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  claim_id UUID NOT NULL REFERENCES billing_claims(id),
  scrubbed_at TIMESTAMPTZ DEFAULT NOW(),
  passed BOOLEAN NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]', -- array of { rule_code, severity, message, field }
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE era_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  file_storage_path TEXT NOT NULL,
  payer_id TEXT,
  check_or_eft_number TEXT,
  payment_date DATE,
  total_payment_cents INTEGER NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('ingested', 'matched', 'partial', 'review'))
);

CREATE TABLE era_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  era_file_id UUID NOT NULL REFERENCES era_files(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  claim_id UUID REFERENCES billing_claims(id),
  patient_id UUID REFERENCES patients(id),
  paid_amount_cents INTEGER NOT NULL,
  adjustment_amount_cents INTEGER DEFAULT 0,
  patient_responsibility_cents INTEGER DEFAULT 0,
  reason_codes JSONB,
  auto_matched BOOLEAN NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

-- RLS org-scoped
```

## Scrubber rule set (v1)

At minimum:

| Rule code | Description | Severity |
|---|---|---|
| `MISSING_POS` | Place of service missing | error |
| `POS_MISMATCH_TELEHEALTH` | Telehealth session without POS 02/10 | error |
| `MISSING_MODIFIER_TELEHEALTH` | Telehealth without GT or 95 modifier | error |
| `INVALID_DX_POINTER` | Diagnosis pointer references nonexistent dx | error |
| `EXPIRED_AUTH` | Prior auth required but expired | error |
| `MISSING_AUTH_REQUIRED` | Payer requires auth, none provided | error |
| `DUPLICATE_CLAIM` | Same patient, same date, same CPT, same payer | error |
| `CPT_AGE_MISMATCH` | CPT inappropriate for patient age | warning |
| `CPT_GENDER_MISMATCH` | CPT inappropriate for patient gender | warning |
| `UNIT_OUT_OF_RANGE` | Units field outside normal range for CPT | warning |
| `MODIFIER_INVALID_COMBO` | Modifier combination not allowed | error |
| `NDC_FORMAT_INVALID` | NDC drug code malformed | error |
| `PROVIDER_NOT_ENROLLED` | Rendering provider not enrolled with payer | error |
| `FACILITY_CODE_MISSING` | Facility-based claim missing 837I fields | error |
| `TAXONOMY_REQUIRED` | Payer requires taxonomy code | error |

Each rule is a pure function: `(claim) => { passed: boolean, message?: string }`. Fully unit-tested.

## ERA auto-matching

Match strategy in order:
1. Exact match: claim # in 835 corresponds to a `billing_claims.id` or `external_claim_id`
2. Tuple match: patient + date of service + CPT + billed amount
3. Fuzzy match: same as above, but billed amount within 1¢

Confidence ≥ 95% → auto-post. Confidence 80–94% → flag for human review with diff. Confidence <80% → manual review queue.

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/scrub` | Scrub a claim, return findings |
| POST | `/api/v1/scrub/batch` | Scrub many claims |
| GET | `/api/v1/scrub/results/:claimId` | Get latest scrub result for a claim |
| GET | `/api/v1/scrub/rules` | List active rules (for transparency) |
| POST | `/api/v1/era/ingest` | Upload an 835 file |
| GET | `/api/v1/era/:fileId` | Get parsed ERA |
| GET | `/api/v1/era/review-queue` | List ERAs needing human review |
| POST | `/api/v1/era/postings/:id/confirm` | Confirm manual review |
| GET | `/health` | Liveness |

All routes require auth + MFA. Billers role has access; clinicians do not.

## Acceptance criteria

- [ ] 15 scrubber rules implemented with unit tests
- [ ] Scrub completes in <500ms per claim p95
- [ ] Each finding includes which field caused it (for UI display)
- [ ] ERA auto-match achieves >90% on test corpus (use sample 835 files from Office Ally)
- [ ] Unmatched ERAs surface to review queue with diff
- [ ] Manual override capability with audit log
- [ ] RLS tests pass for all 4 tables
- [ ] Security gate passes
- [ ] No PHI in logs

## Week-by-week plan

**Week 5:** Scaffold sidecar, tables, RLS, basic Stedi (or X12 parser) integration
**Week 6:** 15 scrubber rules + unit tests
**Week 7:** ERA ingestion + auto-matching engine
**Week 8:** UI integration (OG-side review queue), e2e tests, deploy

## OG-EDIT (minor — UI hooks)

**Files:**
- `src/components/billing/ScrubResults.tsx` (NEW)
- `src/components/billing/EraReviewQueue.tsx` (NEW)
- `src/app/(app)/billing/scrub/page.tsx` (NEW)
- `src/app/(app)/billing/era/page.tsx` (NEW)

**Re-pentest scope:** Sidecar API surface, signed webhook from clearinghouse, batch processing race conditions.

## Risks

- **Stedi licensing cost:** alternative is keep using OG's existing 835 parser. Cost/benefit decision needs James in week 5.
- **Auto-match false positives:** posting wrong payment to wrong claim = accounting nightmare. Conservative confidence thresholds; bias toward manual review.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `sidecar-scaffolding.md`, `api-endpoints.md`, `rls-testing.md`, `testing-patterns.md`
