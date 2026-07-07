# ChartSparkOG — Family Medicine Intake + Weno eRx
## Project Plan v1.1 — COMPRESSED FOR AUG 1 GO-LIVE

**Repo:** Iowa51/ChartSparkOG · **Supabase:** locfqctrmbfwsfmcmhbc
**Deployments:** app.chartspark.io (provider), portal.chartspark.io (patient)
**Workflow:** Claude (Architect) -> CC (Builder) -> Codex (Reviewer) -> James (Operator). No phase merges without Codex sign-off.

**v1.1:** Client = Maryland, committed, regular Schedule II prescriber. HARD GO-LIVE: Aug 1, 2026 — incumbent EHR contract ends. Workstream D (EHR transition) added.

## 1. Objective
**By Aug 1:** NP practices on ChartSparkOG — charting, portal intake, provider reconciliation + signed intake -> note; prescribing (incl. EPCS) via standalone WENO Online bridge.
**By ~Sep 1:** Integrated Phase 4 eRx replaces bridge (NewRx from reconciled structured data; controlled signing on WENO Online audited screens).
**DoD (Aug 1):** Real patient completes portal intake -> NP reconciles + signs -> note auto-populated -> NP writes a script (incl. C-II) via WENO Online with reconciled med/allergy data on screen.

## 2. Success criteria
- S1 Intake data structured + coded (ICD-10/SNOMED, RxNorm, coded allergies in normalized tables)
- S2 Template engine specialty-agnostic (FM template = pure JSONB data; zero specialty logic in code)
- S3 Zero cross-tenant leakage (RLS negative tests on every new table)
- S4 Patient-entered data never treated as verified (server-side state machine: patient_entered -> provider_review -> reconciled -> signed)
- S5 eRx consumes intake data with no re-keying (P4)
- S6 EPCS with zero DEA audit burden (bridge: standalone WENO Online; integrated: Path A signing handoff)
- S7 No patient-data gap at cutover (incumbent export received + loaded before Aug 1)

## 3. Workstreams
A Internal build (P1-P3 pre-Aug-1; P4 August) · B External/vendor (Weno, DEA IDP — starts week 0) · C Client/commercial · D EHR transition (export, import, cutover)

## 4. Week 0 (Jul 6-10) — non-negotiable starts
- W1 Request full data export from incumbent EHR in writing (demographics, problems, meds, allergies, notes/CCDs, Rx history). HIGHEST RISK ITEM.
- W2 NP DEA identity proofing + 2FA (1-2 wk lead; gates all controlled prescribing)
- W3 Weno meeting incl. Sch-II pharmacy coverage review for her MD area (top ~10 pharmacies). GO/NO-GO. Confirm current API pricing.
- W4 Standalone WENO Online prescriber account + EPCS service (day-one bridge)
- W5 Weno API agreement + sign-on (~$1,600, confirm) -> sandbox credentials
- W6 BAA with Weno
- W7 Pilot agreement + written Aug-1-vs-Sep-1 scope expectations
- W8 NP confirms CRISP (MD PDMP) access — manual query before opioid/benzo scripts

## 5. Phases
P1 Data layer + template engine (Jul 6-12): 9 new coded tables + RLS + state machine + FM & smoke-test seed templates + SCHEMA-NOTES.md. [DONE — Codex APPROVE-WITH-FIXES, remediated, delta-approved. Includes vitals RLS org-scoping fix + generate-note cross-org read patch.]
P1D Import from incumbent export (as export arrives): map CCD/CSV -> patients/problems/meds/allergies, source=external_import, reconciled=false, forced through P3 reconciliation. Idempotent, dry-run mode.
P2 Portal intake (Jul 13-24, MVP cut): template-driven renderer in Patient Portal v1, save/resume, coded pickers (RxNorm/ICD-10/allergy+NKDA), OLDCARTS, 14-system ROS grid, conditional OB/GYN, consents, mobile-first, feature-flagged. Deferred: NCPDP-bound pharmacy picker (P4), auto-calculators.
P3 Reconciliation + note auto-population (Jul 20-31, overlaps P2): queue, per-row accept/edit/reject (patient-entered AND imported), server-side state machine, sign -> immutable snapshot, note auto-population (pre-filled, never auto-finalized), encounter-time vitals populate encounter_id. NP dry run Jul 29-30 = go-live gate.
AUG 1 GO LIVE: OG charting/intake/notes + WENO Online bridge prescribing + manual CRISP.
P4 Integrated Weno eRx (Aug 1-29): Path A — NewRx in OG UI from reconciled rows only; controlled signing handoff to WENO Online; NCPDP directory binding; CancelRx; fallbacks; eRx audit log. Production ~Sep 1.

## 6. Slack analysis
P2/P3 near-zero slack. If W1 export slips past ~Jul 20: go live with manual core-data entry for scheduled patients; full import completes in August. Scope ratchets down; the date does not move.

## 7. Risk register (abridged)
R1 Weno Sch-II pharmacy coverage weak in MD -> W3 go/no-go; DoseSpot fallback; P1-P3 vendor-agnostic
R2 Incumbent export delayed/obstructed -> W1 in writing now; manual-entry fallback
R3 IDP not done by Aug 1 -> W2 starts week 0; bridge account
R4 P2/P3 slip -> pre-agreed MVP cuts; date fixed
R5 Unverified data reaches prescribing -> S4 state machine; imports forced through reconciliation
R6 Schema drift / RLS regression -> inspect-first, additive-only, RLS negative tests, Codex gate
R7 Template engine over-fits FM -> smoke-test template criterion
R8 Intake too long on mobile -> <25 min target, save/resume

## 8. Standards (every phase)
Additive idempotent migrations · RLS + negative tests on every new table · no PHI in logs · Codex review before push · push under Iowa51 · feature flags until phase exit · SCHEMA-NOTES.md on every data-model decision.

## 9. Decision log
Jul 6: Client MD, committed, regular Sch-II; go-live hard-set Aug 1. Aug 1 scope = P1-P3 + WENO Online bridge; P4 ~Sep 1. Workstream D added; imported data forced through reconciliation. P2 = Patient Portal v1; P3 = app.chartspark.io. ChartSparkOG works on main (not develop). P2/P3 read-write the NEW coded tables only; legacy free-text tables reachable only via P1D import path. Sprint 0 closed: 71/71 tests via wired test:db; CODEX-REVIEW-P1.md + DELTA in repo as audit trail.
