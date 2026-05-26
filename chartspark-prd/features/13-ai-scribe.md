# PRD-13 — AI Readability Enhancer + Ambient Scribe (Grounded)

**Version:** 1.0
**Track:** H
**Mode:** Extension of existing `chartspark-scribe` sidecar
**Weeks:** 10–12
**Status:** Spec ready

---

## Why this exists

ICANotes+ now ships "Readability Enhancer" (polishes existing notes) and "Ambient Scribe" (real-time conversation → note). ChartSparkOG already has a Whisper-based scribe sidecar; this PRD extends it with the grounding layer (PRD ai-grounding skill) so it does not hallucinate.

The differentiator vs ICANotes+ is **grounding done right** — outputs that are auditable against extracted facts, with the menu skeleton from PRD-08 as the constraint.

## Success criteria

### Readability Enhancer
A clinician with an existing draft note can click "Enhance" and:
- Get a cleaner, more clinically-toned version
- See a diff (what changed)
- Reject, accept, or partially accept
- Output contains zero clinical facts not present in the input

### Ambient Scribe
A clinician can:
- Click "Start Ambient" at session start with patient consent dialog
- Speak naturally during the session (Whisper transcribes)
- See live transcript with running PHI redaction preview
- At session end, get a draft SOAP note grounded against:
  - The transcript
  - The selections from the content engine menu (PRD-08), if used
- Review and edit before signing
- Output contains zero clinical facts not present in the transcript

## Architecture

**Mode:** Extension of existing `chartspark-scribe` sidecar at `C:\Users\joman\OneDrive\Desktop\chartspark-scribe\`. Adds new endpoints to existing service.

**Models:**
- Whisper (Azure, `joman-mnq40342-eastus2`) — transcription
- GPT-4o (Azure, `chartspark-openai`) — note composition
- Claude Sonnet (Anthropic) — fact extraction + grounding validation (different model from generation to avoid same-model blind spots)

## Grounding pipeline (mandatory)

```
Input (transcript + menu selections)
      │
      ▼
┌──────────────────────────┐
│  Layer 1: Fact extraction│  (Claude — extract medications,
│  → structured ClinicalFacts│   diagnoses, vitals, symptoms)
└──────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│  Layer 2: Constrained gen│  (GPT-4o — generate note using
│  → draft note            │   ONLY ClinicalFacts as content)
└──────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│  Layer 3: Output extract │  (Claude — extract facts from
│  → output facts          │   the generated draft)
└──────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│  Layer 4: Validation     │  Compare input vs output facts.
│  → valid OR blocked      │  Any "invented" fact = blocked.
└──────────────────────────┘
```

Implementation lives in `chartspark-scribe/src/grounding/` (new directory). See `skills/ai-grounding.md` for the canonical pattern.

## API additions

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/enhance` | Readability enhancer: input draft → enhanced draft + diff |
| POST | `/api/v1/scribe/session/start` | Start ambient session |
| POST | `/api/v1/scribe/session/:id/audio` | Stream audio chunks |
| POST | `/api/v1/scribe/session/:id/finalize` | Stop + generate note |
| GET | `/api/v1/scribe/session/:id/transcript` | Retrieve transcript (consented) |
| GET | `/api/v1/scribe/session/:id/note` | Retrieve generated note + grounding report |

## Data model additions (in scribe sidecar's own tables)

```sql
CREATE TABLE scribe_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  clinician_id UUID NOT NULL REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  patient_consent BOOLEAN NOT NULL, -- must be true to proceed
  consent_obtained_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  transcript_storage_path TEXT,
  generated_note_id UUID REFERENCES clinical_notes(id),
  grounding_report JSONB, -- input_facts, output_facts, invented_facts
  status TEXT NOT NULL CHECK (status IN ('active', 'finalizing', 'completed', 'blocked', 'error'))
);

CREATE TABLE ai_grounding_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  scribe_session_id UUID REFERENCES scribe_sessions(id),
  enhanced_note_id UUID REFERENCES clinical_notes(id),
  failure_type TEXT NOT NULL, -- 'invented_medication', 'invented_diagnosis', etc.
  details JSONB NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS org-scoped
```

`ai_grounding_failures` is a critical telemetry table — every blocked output gets logged for prompt iteration.

## Patient consent

Ambient scribe **cannot start** without explicit patient consent. The consent dialog reads:

> "Your clinician would like to use AI to help write notes from today's session. With your permission, the conversation will be recorded and transcribed. The recording is encrypted and stored only as long as needed to generate the note. The AI's draft will be reviewed and edited by your clinician before becoming part of your chart. You may decline now or stop the recording at any time."

[Accept] [Decline]

Consent is logged with timestamp, patient signature (e-signature canvas), and clinician witness.

## Acceptance criteria

- [ ] Readability enhancer produces zero invented facts on 100-note benchmark
- [ ] Ambient scribe produces zero invented facts on 50 simulated sessions
- [ ] Grounding validation runs on every output; failures logged and blocked
- [ ] Patient consent flow works; no consent = no recording
- [ ] Transcript redaction preview is live (PII identified but not deleted from working copy)
- [ ] Grounding tests in CI use real models (rate-limited)
- [ ] Audio storage encrypted at rest; deleted within 7 days of note generation
- [ ] No PHI in logs
- [ ] Security gate passes

## Risks

- **Model drift:** GPT-4o behavior changes between versions. Run grounding test suite on every model version change.
- **Real-time latency:** ambient transcription should appear within 2s of speech. Whisper streaming may add latency.
- **Consent revocation mid-session:** must immediately stop recording and offer "discard recording" option.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `ai-grounding.md` (critical), `api-endpoints.md`, `rls-testing.md`, `testing-patterns.md`
