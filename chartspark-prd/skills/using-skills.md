---
name: using-skills
description: Entry point and discovery guide for all ChartSparkOG build skills. Use this skill whenever starting any task on the ChartSparkOG parity build — it tells you which other skills to read, in what order, based on the kind of work you're about to do. Read this BEFORE reading any feature mini-PRD or writing any code.
---

# Using Skills — ChartSparkOG Parity Build

## What this is

A discovery and routing skill. Tells you which other skills to read based on the kind of work you're about to do.

## When to use it

Every task. Read this first, then the master PRD, then the feature mini-PRD, then the relevant HOW skill(s) for the work type.

## How to use it

### Step 0 — Reconnaissance before any task

Before reading the constitution, confirm where you are and that you can act:

```bash
pwd                                  # working directory
git remote -v                        # remote URL — verify it's the right repo
git branch --show-current            # current branch
git log --oneline -1                 # HEAD — what you would be amending
gh auth status                       # active GitHub account
```

If any of these doesn't match the task's expectations — wrong repo, wrong branch, wrong account, surprising HEAD — STOP and resolve before reading further. `gh auth switch` for account; resolve repo/branch out of band.

Common failure modes the ritual catches: sessions with multiple repos attached anchored to the wrong one; sessions that were correct at start but drifted mid-conversation; stale `gh auth` state from a prior task switching accounts.

**For multi-file tasks:** read every file you will modify IN FULL before drafting any changes. Surface unknowns before code.

**For tasks touching unfamiliar code:** identify any assumption the spec makes that you cannot verify from the code itself. Flag the assumption and STOP rather than coding past it.

CARDINAL: reconnaissance is NOT optional. The cost of reading-before-writing is one or two minutes. The cost of discovering an issue mid-implementation — or worse, post-commit — is hours. Every multi-file task starts with reconnaissance.

### Step 1 — Read the master PRD

Read `master/PRD-MASTER.md` in full. It contains the cardinal principles, security gate, and tech stack. Everything else assumes you know this.

### Step 2 — Identify your task type

Match the work you're about to do against this table and load the relevant skills:

| Task | Skills to read |
|---|---|
| Scaffolding a new sidecar | `sidecar-scaffolding`, `security-first` |
| Adding a new Supabase table | `rls-testing`, `security-first` |
| Writing a new API endpoint | `api-endpoints`, `security-first`, `rls-testing` |
| Adding a frontend component | `frontend-patterns`, `security-first` |
| Modifying ChartSparkOG core | `og-edit-protocol`, `security-first` |
| Writing tests | `testing-patterns` |
| Pre-merge security review | `security-review` |
| AI/LLM feature work | `ai-grounding`, `security-first` |

### Step 3 — Read the feature mini-PRD

Open `features/<NN>-<feature-name>.md` for the feature you're building.

### Step 4 — Begin work

You should now have in context:
1. Master PRD (the constitution)
2. Relevant skills (the HOW)
3. Feature mini-PRD (the WHAT)

If any of these conflict, STOP and ask the human.

## Hard rules (re-stated for emphasis)

These are in the master PRD too but worth repeating because they are the most-violated:

1. **Sidecar by default.** Do not edit ChartSparkOG core unless the mini-PRD declares "OG-EDIT REQUIRED" with a file list.
2. **RLS on every new PHI table.** No exceptions.
3. **Zod validation on every API endpoint.** No exceptions.
4. **No PHI in logs.** Ever.
5. **Fail closed.** Auth/feature-gate failures default to deny.
6. **Don't expand scope.** If the work needs more than the mini-PRD says, stop and ask.

## Reference files

- `master/PRD-MASTER.md` — the constitution
- `features/*.md` — feature mini-PRDs
- `skills/*.md` — the HOW skills (this file is one of them)
