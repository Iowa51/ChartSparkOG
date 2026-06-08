# STATE-OF-TRUTH — Sprint 01 / Architect Pack 01, Phase A

> **Read-only verification report.** Produced under the "verify before you act" rule.
> **Zero changes** were made to the repository (see §"Zero-changes attestation").
> Phase B does **not** begin until the operator reviews and approves this report.

- **Date:** 2026-06-01
- **Repo:** `Iowa51/ChartSparkOG`
- **Branch at time of check:** `develop` @ `1433fdd` (clean tree)
- **Method:** local git inspection, live Supabase queries (SELECT-only, operator-authorized), a temporary read-only `main` worktree built+run for the render check, then fully removed.

---

## TL;DR
- The core reconciliation assumption **holds**: `main` is the authoritative trunk (135 ahead), `develop` has exactly its 5 unique commits, and the Tebra UI lives on `main` and renders.
- **Three material corrections to the planning docs were found** (the kind of drift the verify-first rule exists to catch):
  1. **Production Supabase ref is wrong in `planning/`.** The PRD constitution (§4) and the live app both use **`eepwbtdqtdnqxeznykbh`** ("ChartSparkProduction"), not `locfqctrmbfwsfmcmhbc` as `DOMAIN.md`/`OPEN-QUESTIONS.md` state. (Entitlement tables are missing in **both**, so the entitlement-lock conclusion stands either way.)
  2. **The OG repo is already out of OneDrive** (`C:\dev\ChartSparkOG`). The "repos under OneDrive" premise is already satisfied for OG.
  3. **`stash@{0}` is based on `feature/assessments-tab`, not `develop`**, and there are **two** stashes, not one.
- **Two checks are not fully closeable from this machine** and need operator action: #3 (Vercel deploy branch — CLI unauthorized) and the *visual* half of #6 (verified via served CSS, not a human eyeball).
- **PRD-MASTER.md is not missing** — it lives on `main` at `chartspark-prd/master/PRD-MASTER.md`; it is simply absent from `develop` (where this session started).

---

## The six checks

### 1. Topology from git itself — ✅ MATCHES ASSUMPTION
Commands (local, no fetch):
```
git rev-list --count develop..main   -> 135
git rev-list --count main..develop   -> 5
git log --oneline main..develop:
  1433fdd fix: codex audit round 2 - cpt_codes migration added, 407 tests passing
  f2742d2 fix: codex audit - encounter ownership, orchestrator auth, quality_reviews migration, error state
  222c153 feat: phase 5.5 - superbill auto-population, admin role gate on agent queue
  fbaed3e feat: phase 5 agent integration - End Session button, auditor queue, subscription gate
  40fb754 feat: agent-orchestrator scaffold with base agent, orchestrator, DB migration
```
`main` is **135 commits ahead**; `develop` has exactly **5 unique commits**. Confirms DECISIONS #3 / GIT-RULES. The reconciliation plan (port develop's 5 commits onto a consolidation branch off `main`) is sound.

### 2. Where the Tebra UI lives — ✅ ON MAIN, ABSENT ON DEVELOP
- Tebra commits on `main`: `7bbd36d` (retheme admin/super-admin/auditor sidebars to Tebra tokens), `14d2492` (Playwright visual smoke test for the redesign). Branch `design/tebra-redesign` also exists.
- `git log -i --grep=tebra develop` → **zero** results.
- `src/app/globals.css` differs by **201 lines** (`+121 / −80`) between `develop` and `main`. On `main`, line 63 reads `/* ChartSpark Design System v2.0 — Tebra-Inspired ... */` and defines `--cs-*` tokens (`--cs-teal: #1a5c4f`, `--cs-nav-bg: #0f2e2a`, `--cs-coral`, …). On `develop` there is no `tebra` reference at all.
- **Why develop "showed the old UI" is now explained:** the Tebra redesign simply isn't on `develop`.

### 3. Deploy source — ⚠️ NOT DETERMINABLE FROM THIS MACHINE (operator action needed)
- `.vercel/project.json` → project `chart-spark-og` (`prj_sm2FIrfn45IpNbqQEgDhr1urHwnd`, org `team_Z9USRSdRNArpvWsQ0hC4sJwf`).
- `vercel.json` contains only cron definitions — **no** production-branch / git config. The production branch is a Vercel **dashboard** setting.
- `vercel whoami` → **"Not authorized"**; no `VERCEL_*` token in env. The live deploy branch therefore **could not be read**.
- **ACTION REQUIRED:** operator runs `vercel login` then `vercel project inspect chart-spark-og` (or checks the dashboard: Project → Settings → Git → Production Branch). **If it is `develop`, repoint to the trunk in Phase B** (Decision #9 / Risk: wrong deploy source = "old UI").

### 4. `stash@{0}` — ⚠️ PARTIAL TIER 6, BUT METADATA DIFFERS FROM STATE.md
```
git stash list:
  stash@{0}: On feature/assessments-tab: tier6-assessmentstab-wip-against-main-branch
  stash@{1}: WIP on main: bebf6a1 merge(pre-production-audit): pentest complete ...
```
- `stash@{0}` diffstat: `.env.example (+7)`, `src/app/(app)/patients/[id]/page.tsx (+69)`, `src/components/vitals/ScreeningPanel.tsx (+7)`, `src/lib/security/audit-log.ts (+9)`, `src/lib/types/database.ts (±2)` — **consistent with Tier 6 AssessmentsTab work** (the AssessmentsTab is wired into the patient detail page + ScreeningPanel). Nothing unexpected/destructive.
- **Discrepancies vs STATE.md** (which said "`stash@{0}` holds partial Tier 6" on `develop`):
  - `stash@{0}` is based **`On feature/assessments-tab`**, not `develop`. Its own name says **"-against-main-branch."**
  - **A second stash exists** (`stash@{1}`, `WIP on main`, pentest-complete). Phase B's "restore Tier 6" step must target the correct stash and the correct base branch.

### 5. AssessmentsTab + entitlements — ✅ TIER 6 CODE PRESENT; TABLES MISSING IN BOTH PROD PROJECTS
- **Tier 6 code present:** `AssessmentsTab` references live in `src/app/(app)/patients/[id]/page.tsx` and `src/components/vitals/ScreeningPanel.tsx` (same files as `stash@{0}`). `features`/`user_features` are referenced across `src/` (`hooks/useFeature.ts`, `lib/features/assign-defaults.ts`, `app/(admin)/admin/features/page.tsx`, `lib/auth/api-auth.ts`, …) and **declared** in `supabase/schema.sql` (L458 `features`, L473 `user_features`). **No migration file** in `supabase/migrations/` creates them.
- **Live prod queries (SELECT-only, count=exact, via Supabase REST with CLI-issued service keys):**

  | Project | Name | Role per docs | `features` | `user_features` |
  |---|---|---|---|---|
  | `eepwbtdqtdnqxeznykbh` | ChartSparkProduction | **PRD §4 prod** + app `.env.local` + CLI-linked | ❌ 404 `PGRST205` (not found) | ❌ 404 `PGRST205` (not found) |
  | `locfqctrmbfwsfmcmhbc` | ChartSparkOG | `planning/` "prod" ref | ❌ 404 `PGRST205` (not found) | ❌ 404 `PGRST205` (not found) |

  Both projects are live, populated DBs (their 404 hints name *other* real tables — `fee_schedules`, `user_recovery_codes`, `templates`), so the 404s mean these specific tables genuinely **do not exist**, not an empty/unreachable DB.
- **Conclusion:** the entitlement tables are **missing in production**, which fully explains AssessmentsTab showing **"Feature Locked."** Phase B must create + seed `features`/`user_features` in **the correct prod project** (see the discrepancy below) so the tab unlocks.

### 6. Render check (build + run `main`) — ✅ TEBRA UI RENDERS (verified via served CSS)
- Created a temporary read-only worktree of `main` at `C:\dev\_csog-main-render` (did not touch `develop`), copied `.env.local`, ran `npm install` (exit 0) and `npm run dev` (Next.js 15 / Turbopack) on port 3999.
- `GET /` → **HTTP 200**; `GET /login` → modern ChartSpark login (rounded-2xl card, lucide icons, `ChartSpark - Clinical Documentation for Nurse Practitioners`).
- The compiled stylesheet the browser receives (`/_next/static/chunks/[root-of-the-server]__52f299bf._.css`, 400 KB) contains the **Tebra Design System v2.0** tokens: `--cs-teal: #1a5c4f` (50×), `--cs-nav-bg: #0f2e2a` (2×, the deep-teal navbar), `--cs-coral` (13×). The legacy `#0d968b` appears only 6× (as the documented "replaces #0d968b" fallback), while the new `--cs-*` system dominates.
- **Caveat:** this confirms the Tebra design tokens are served to the browser; it is **not** a human pixel-level screenshot. The operator may want a quick visual confirmation of the running trunk, but the rendered-CSS evidence strongly indicates the Tebra UI (not the old UI) is what renders.
- Worktree was **fully removed** afterward; repo returned to `develop` @ `1433fdd`.

---

## Discrepancies vs the planning docs (must be reconciled before / during Phase B)

1. **🔴 Production Supabase project ref.** `planning/DOMAIN.md` and `OPEN-QUESTIONS.md` say prod = `locfqctrmbfwsfmcmhbc`. The **PRD constitution** (`chartspark-prd/master/PRD-MASTER.md` §4, on `main`) says prod = **`eepwbtdqtdnqxeznykbh`** ("Already in use, audited"), and the live app (`.env.local` `NEXT_PUBLIC_SUPABASE_URL`) + the Supabase CLI link both point at `eepwbtdqtdnqxeznykbh`. Per Decision #1 ("PRD wins"), **`eepwbtdqtdnqxeznykbh` is production**; `locfqctrmbfwsfmcmhbc` ("ChartSparkOG") appears to be an older/parallel project. **The planning docs' prod ref should be corrected.** Phase B entitlement seeding must target **`eepwbtdqtdnqxeznykbh`**.
2. **🟠 OneDrive premise already satisfied for OG.** STATE.md/GIT-RULES assume repos sit under `OneDrive\Desktop`. The OG repo is already at `C:\dev\ChartSparkOG`, not OneDrive. (NB: PRD §2.2 still references a `C:\Users\joman\OneDrive\Desktop\chartspark-<feature>\` sidecar path — worth updating.) `chartspark-assessments`' location was **not** verified this session.
3. **🟠 Stash metadata.** `stash@{0}` is `On feature/assessments-tab` (name: "against-main-branch"), not `develop`; a second `stash@{1}` (WIP on main, pentest) also exists. Phase B "restore Tier 6" must pick the right stash + base branch.

## Blocks for later (not blocking Phase A; surface before the milestone gate)
- **🔴 review-suite agent prompts absent.** `review-suite/quality/` and `review-suite/security/` contain only `README.md` placeholders — the 9 agent prompt files are **not present**. The milestone 9-agent review-suite gate (required before the Phase B trunk merge) **cannot run** until these are added. (Open Question #6.)
- **🟡 Vercel deploy branch unconfirmed** — see Check #3; needs operator login.
- **🟡 Visual render confirmation** — see Check #6 caveat; CSS-level confirmed, eyeball optional.

## Items confirmed
- `gh` active account = **Iowa51** (correct per GIT-RULES #5). `RedArkventures` also authenticated.
- `git remote -v` → `origin https://github.com/Iowa51/ChartSparkOG.git`.
- PRD-MASTER.md exists on `main` at `chartspark-prd/master/PRD-MASTER.md` (v1.4, 2026-05-28) with mini-PRDs under `chartspark-prd/features/` and skills under `chartspark-prd/skills/`.

---

## Zero-changes attestation
- `git status` after all checks: only the pre-existing untracked planning scaffold (`AGENTS.md`, `architect-packs/`, `architect-prompt.md`, `planning/`, `review-suite/`, `sprints/`) **plus this report** (`docs/STATE-OF-TRUTH.md`). **No tracked-file modifications, nothing staged, no commits, no branch/schema/config changes.**
- Two incidental scratch artifacts created by CLI version/link checks (`supabase/.temp/cli-latest` modification and a new `supabase/.temp/linked-project.json`) were **reverted/removed** so the tree matches baseline.
- The temporary `main` worktree (`C:\dev\_csog-main-render`) was removed; `git worktree list` shows only `C:/dev/ChartSparkOG [develop]`.
- Branch unchanged: `develop` @ `1433fdd`.

## Recommended operator decisions at this gate
1. **Confirm production = `eepwbtdqtdnqxeznykbh`** (PRD) and authorize correcting the `planning/` docs. ✔ already corroborated by app config; needs your sign-off.
2. **Run the Vercel deploy-branch check** (Check #3) and tell Phase B whether a repoint is needed.
3. **Provide the 9 review-suite agent prompt files** before the Phase B trunk merge.
4. **Approve Phase B** (or send any contradiction to `OPEN-QUESTIONS.md`). Phase B remains **not started**.
