# ROADMAP — The 90-day pack sequence
Each pack reuses the matching `/features/*.md` + `/skills/*.md`. One pack at a time; audit each before the next.

| Pack | Scope | Gate / note |
|------|-------|-------------|
| 01 | **Verify → unblock** (OneDrive, reconcile, entitlements, restore Tier 6) | Phase A read-only + approval; **full review suite before trunk merge** |
| 02 | **Tier 0 — AI hallucination fix** | Gates ALL AI features; **full security round (clinical safety)** |
| 03 | **Top 15 rating scales** live (auto-score/trend) | Unblocked by pack-01 |
| 04 | **Patient portal v1** (intake, messaging, scheduling, payments) | PHI → review suite |
| 05 | **SMS + email reminders** | Codex + acceptance |
| 06 | **MSE builder + safety plan + structured treatment plan** | PHI → review suite |
| 07 | **Group therapy workflow** | Codex + acceptance |
| 08 | **E-prescribing** (non-EPCS / Surescripts) | review suite (safety) |
| 09 | **Claim scrubber + ERA** (chartspark-claims sidecar) | review suite (billing); pick clearinghouse (Stedi) |
| 10 | **Document management** | Codex + acceptance |
| 11 | **AI scribe done right** | After pack-02 only; review suite |
| 12 | **Menu-driven note builder library** | Codex + acceptance |
| A | **agent-orchestrator P4–P7** | Parallel; review suite before OG merge |

**Audit gate (DECISIONS #10):** per-pack = Codex + acceptance. Full 9-agent review suite before any trunk merge, any production deploy, and any security/PHI/clinical pack. Pass = zero open criticals.
