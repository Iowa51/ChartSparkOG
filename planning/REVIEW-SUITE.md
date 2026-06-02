# REVIEW-SUITE — The audit layer (Living Document)
> Your multi-agent review suite ("the superpowers") is the AUDIT role at full power. It inspects — it never plans or builds. It plugs into the loop's check step, dialed up for high stakes.

## What it is
- **Quality round** — ~7 domain agents + Codex: TypeScript strictness, architecture, error handling, style.
- **Security round** — ~7 security agents + Codex: authn/authz, injection, HIPAA, API security, dependencies, secrets.
- Output: deduplicated findings → remediation workstreams.

## Where the agent prompts live
The agent prompts reference file paths on disk, so they **must physically sit in the repo**. Put them in
`review-suite/quality/` and `review-suite/security/`. `AGENTS.md` points here.

## Cadence — do NOT run on every pack
- **Per-pack gate (every lap):** Codex + the pack's `acceptance.md`. Enough for ordinary slices.
- **Milestone gate (the full suite):** run before
  - any **merge to the trunk**,
  - any **release / production deploy**,
  - any pack touching **security, PHI, or clinical safety**.

Running the full swarm on every small pack is a sledgehammer on a nail — slow, costly, and it buries the real signal.

## Pass criteria
The gate passes only with **zero open critical findings**. High/medium findings are triaged into the next pack or `OPEN-QUESTIONS.md`.

## Where it lands in this build
Full-suite gates: **pack-01** (before the Phase B merge to trunk), **pack-02 Tier 0** hallucination fix (clinical safety — full security round), and **pre-production deploy**. Everywhere else, Codex + acceptance carries the lap.
