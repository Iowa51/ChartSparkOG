# ChartSparkOG Parity Build — PRD Package

This is the complete specification for the 90-day push to bring ChartSparkOG to ICANotes+ feature parity.

It is designed to be consumed by **AI agents** (Claude Code, Antigravity, Codex) and **human engineers** alike.

---

## What's in this package

```
chartspark-prd/
├── README.md                       (this file)
├── master/
│   └── PRD-MASTER.md               The constitution. Read first.
├── skills/                         The HOW — coding patterns for AI agents
│   ├── using-skills.md             Entry point — read this first in every session
│   ├── security-first.md           Big 9 security patterns (the merge gate)
│   ├── sidecar-scaffolding.md      Canonical pattern for new sidecar services
│   ├── rls-testing.md              Mandatory pattern for PHI tables
│   ├── api-endpoints.md            5-layer pattern for API routes
│   ├── og-edit-protocol.md         How to safely modify OG core
│   ├── frontend-patterns.md        Next.js 15 + shadcn conventions
│   ├── testing-patterns.md         Jest + Supertest + Playwright
│   └── ai-grounding.md             4-layer pattern to prevent LLM hallucination
└── features/                       The WHAT — one mini-PRD per feature
    ├── 01-rating-scales.md         15 scales (PHQ-9, GAD-7, C-SSRS, etc.)
    ├── 02-patient-portal.md        portal.chartspark.io
    ├── 03-reminders.md             SMS + email appointment reminders
    ├── 04-mse-builder.md           Mental Status Exam structured builder
    ├── 05-treatment-plan.md        Problem → Goal → Objective → Intervention
    ├── 06-safety-plan.md           Stanley-Brown safety planning
    ├── 07-group-therapy.md         1 session → N notes + 90853 billing
    ├── 08-content-engine.md        Click-to-chart menu-driven note builder
    ├── 09-eprescribing.md          Surescripts via DrFirst (non-EPCS)
    ├── 10-claims.md                Pre-submission scrubber + ERA auto-post
    ├── 11-documents.md             Scan/upload to patient chart
    ├── 12-cosignature.md           Supervisor co-sign for provisional clinicians
    ├── 13-ai-scribe.md             Grounded ambient scribe + readability enhancer
    ├── 14-security-marketing.md    Public /security page on chartspark.io
    └── 15-practice-suite.md        FrontDesk AI ↔ ChartSparkOG bundle
```

---

## How an AI agent (CC, AG, Codex) uses this

**Every session, every task, in this order:**

1. **Read `master/PRD-MASTER.md`** — the cardinal principles, security gate, tech stack, glossary.
2. **Read `skills/using-skills.md`** — it tells you which other skills to read based on the kind of work you're doing.
3. **Read the relevant mini-PRD** in `features/`.
4. **Read the relevant HOW skills** in `skills/` (the using-skills file tells you which).
5. **Begin work.**

You should now have in context:
- The constitution (master PRD)
- The HOW patterns (skills)
- The WHAT for this specific task (mini-PRD)

If any of these conflict, **stop and ask the human**. Do not paper over the conflict.

---

## How a human engineer uses this

Same order, except you've probably already internalized the master PRD and most skills. For a new feature, you'll mostly look at the mini-PRD and refresh on any skill you haven't touched in a while.

When you write a prompt for an AI agent, the canonical pattern is:

```text
Read in order:
1. chartspark-prd/master/PRD-MASTER.md
2. chartspark-prd/skills/using-skills.md
3. chartspark-prd/features/<NN>-<name>.md

Then perform the next pending task in week <N>. Do not exceed the
declared scope. If you need clarification, ask. Begin.
```

For Claude Code specifically (per workflow): drop the above into a `.txt` file in the project directory and feed CC the one-liner "Read prompt.txt and follow all instructions."

---

## Track structure

The 90-day plan runs **four parallel tracks** during weeks 1–8, then converges:

| Track | Tool | Lead features | Weeks |
|---|---|---|---|
| **A** | Claude Code | Rating Scales (PRD-01) | 1–3 |
| **B** | Antigravity | Patient Portal (PRD-02) | 1–5 |
| **C** | Codex | Reminders (PRD-03) | 2–4 |
| **D** | Claude Code | Claims (PRD-10) | 5–8 |

Weeks 9–12: convergence on remaining features (MSE, treatment plan, safety plan, group therapy, content engine, e-prescribing prep, documents, cosignature, AI scribe extension, security page, practice suite integration).

Week 13: Cobalt re-pentest covering all OG-edits, consolidated.

---

## Cardinal rules (re-stated; the master PRD has the full version)

1. **Security is the first feature.** Every PR passes the security gate in master section 5.
2. **Sidecar by default.** Edit OG only when the mini-PRD declares OG-EDIT REQUIRED.
3. **Simple code over clever code.** Files <300 lines, functions <50 lines, no `any`.
4. **Spec-driven, not vibe-driven.** Not in the PRD = don't build it. Ask.
5. **Test before merge.** ≥80% coverage; RLS tests mandatory for new PHI tables.
6. **No PHI in logs, ever.**
7. **Fail closed.** Auth or feature-gate failures default to deny.

---

## When the PRD needs to change

The PRD evolves, but not by AI initiative. To amend:

1. Human (James) updates the affected file(s)
2. Bump version (e.g., `v1.0` → `v1.1`)
3. Add changelog entry at the bottom of the file
4. Notify any in-flight work

AI agents do not edit PRD files. If you find an error or gap, surface it in your PR or task notes — do not silently fix.

---

## Status as of v1.0 (2026-05-25)

- ✅ Master PRD complete
- ✅ All 15 mini-PRDs complete
- ✅ All 9 skills complete
- ⏳ Implementation: not yet started

Next: begin Track A (Rating Scales) on a Monday — see `features/01-rating-scales.md` week 1 plan.

---

## Questions / amendments

Email: james@redarkventures.com
GitHub: RedArkventures (or Iowa51 for ChartSparkOG specifically)
