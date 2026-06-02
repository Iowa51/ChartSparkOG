# DECISIONS — House Rules (Living Document)

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | `PRD-MASTER.md` (v1.1) is the constitution; PRD beats verbal instructions | One source of truth | 2026-05-31 |
| 2 | **Verify before acting** — never trust an AI's narrative of state over git + the rendered screen | Derailed twice otherwise | 2026-05-31 |
| 3 | **`main` is the authoritative trunk** (~135 commits incl. Tebra UI). Reconcile by porting `develop`'s 5 commits onto a consolidation branch off `main` | Corrects the backwards analysis | 2026-05-31 |
| 4 | **Repos live OUTSIDE OneDrive**; never run git under OneDrive sync | OneDrive caused file-locks + merge-tree failures | 2026-05-31 |
| 5 | `gh auth switch` before every push: **Iowa51** (OG), **RedArkventures** (assessments) | Two accounts → wrong-account pushes | 2026-05-31 |
| 6 | **Tier 0 gate:** no AI-facing feature ships until the hallucination fix passes | AI is a malpractice liability until grounded | 2026-05-31 |
| 7 | Branch protection on the trunk; CC commits, operator pushes; plan mode default | Human at the gate on a live product | 2026-05-31 |
| 8 | Scope = the **right 60%**; non-goals (inpatient, ONC cert, EPCS, MIPS, non-English, native mobile) out for 90 days | Win a focused segment | 2026-05-31 |
| 9 | Confirm the **deploy source branch** points at the trunk | A second cause of "old UI" | 2026-05-31 |
| 10 | **Audit cadence:** per-pack gate = Codex + acceptance; **milestone gate = the 9-agent review suite** (quality + security rounds) before any trunk merge, release/deploy, and any security/PHI/clinical pack. Pass = zero open criticals. Agent prompts live in `review-suite/` | The suite is a heavy, high-value gate — scheduled, not per-pack | 2026-05-31 |
| 11 | **Production Supabase is `eepwbtdqtdnqxeznykbh`** ("ChartSparkProduction"). `locfqctrmbfwsfmcmhbc` ("ChartSparkOG") is an older/parallel project, NOT production. Corrected `DOMAIN.md` + `OPEN-QUESTIONS.md`; Phase B entitlement seeding targets `eepwbtdqtdnqxeznykbh` | PRD §4 (`PRD-MASTER.md` line 236, "already in use, audited"), `.env.local` `NEXT_PUBLIC_SUPABASE_URL`, and the Supabase CLI link all agree; anon-key JWT `ref` claim decodes to the same. Per Decision #1, PRD wins | 2026-06-01 |
