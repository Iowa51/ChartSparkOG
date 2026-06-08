# AGENTS.md — Project Router (ChartSparkOG · ICANotes+ parity build)
> Read this FIRST. Existing, live project on a 90-day parity build. Two rules override everything: verify before you act, and the PRD is the constitution.

## What this is
**ChartSparkOG** — behavioral-health EHR (PMHNP), live at `app.chartspark.io`. Goal: feature parity with **ICANotes+** in 90 days (the *right 60%*, not 100%). Repo: `Iowa51/ChartSparkOG`.

## The constitution
`PRD-MASTER.md` (v1.1) is the single source of truth. Mini-PRDs in `/features/*.md` are scoped tasks; skills in `/skills/*.md` are the HOW. **If the PRD contradicts a verbal instruction, the PRD wins.**

## Two overriding rules
1. **Verify before you act.** Never trust an AI's *narrative* of git/app state over git itself + the rendered screen. State surprised us twice (a backwards branch analysis; an old UI rendering). Every pack confirms the state it depends on before changing anything.
2. **PRD reading order**, every task: this file → `planning/` → the relevant `/features/` mini-PRD → the relevant `/skills/` file → begin.

## How to work
1. **Start in plan mode** (`claude --permission-mode plan`).
2. Read `planning/STATE.md`, `DECISIONS.md`, `GIT-RULES.md`, `FEATURE-STATUS.md`, `REVIEW-SUITE.md`.
3. Obey `GIT-RULES.md` exactly — wrong branch / wrong account / OneDrive are how this derailed.
4. Work the next pack in `architect-packs/` (start at pack-01). Build only against written requirements + blueprint + acceptance.

## The audit gate
Per-pack: Codex + the pack's `acceptance.md`. Milestone (trunk merge, release/deploy, any security/PHI/clinical pack): the full **9-agent review suite** — see `planning/REVIEW-SUITE.md`; agent prompts live in `review-suite/`.

## Roles
Architect (LLM chat) plans · Builder (Claude Code) builds on the designated branch · Reviewer (Codex + the review suite) audits · Operator (you) approves every gate.

## The one rule
If the state isn't *proven*, STOP. No commit moves, no file moves, no schema changes until the verification report is reviewed and approved.
