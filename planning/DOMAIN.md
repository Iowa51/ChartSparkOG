# DOMAIN — Business Context (see PRD-MASTER.md for the full constitution)

## Vision
ChartSparkOG = the obvious modern alternative to ICANotes+ for outpatient psychiatry + therapy: faster docs, real AI (not bolt-on), modern security, unified patient experience.

## Success criteria (90 days) — a clinician switching from ICANotes+ can:
- Find the 15 daily rating scales (PHQ-9, GAD-7, C-SSRS…), auto-scored and trended
- Send a portal invite; patient completes intake before the first visit
- Get SMS + email reminders automatically
- Document an MSE in <2 min; build a Problem→Goal→Objective→Intervention plan
- Document a group session in <5 min with individualized notes
- Submit a claim that passes a pre-submission scrubber and posts ERA automatically
- Co-sign a supervisee's note; upload a release-of-information doc
- Use AI that does NOT invent clinical facts
- Trust the security enough to bet their license on it

## The "right 60%"
Win focused outpatient psychiatry + therapy with the right 60% of ICANotes' surface area.

## Non-goals (90 days)
Inpatient/residential (eMAR, census), ONC Cures cert (separate parallel track), EPCS, MIPS, non-English, native mobile.

## Key facts
Production Supabase: `eepwbtdqtdnqxeznykbh` ("ChartSparkProduction"; per PRD §4, `.env.local`, and the Supabase CLI link). The older `locfqctrmbfwsfmcmhbc` ("ChartSparkOG") is a parallel/deprecated project, NOT production — see Decision #11. Sidecars: chartspark-assessments, agent-orchestrator, chartspark-scribe, chartspark-fhir-mcp.

## Glossary
ICANotes+ · MSE · C-SSRS/PHQ-9/GAD-7 · ERA · EPCS · entitlement tables (`features`/`user_features`) · Tebra UI.
