# Architect Pack 01 — Verify State, Then Unblock the Engine
> Two phases, strict order, gated. Phase A is READ-ONLY and produces proof. Nothing in Phase B runs until you review and approve Phase A.

## Objective
Prove what is actually true (branches, UI, deploy source, stash, entitlements), then — on your approval — unblock: out of OneDrive, branches reconciled, deploy repointed, entitlement tables created, Tier 6 restored.

---

## PHASE A — VERIFICATION (LOCKED FIRST · read-only · plan mode · ZERO changes)
Produce `docs/STATE-OF-TRUTH.md`. Make NO change of any kind. Then STOP for operator review.

### The six checks
1. **Topology from git itself:** `git log --oneline main..develop` and `develop..main`; confirm main ~135 ahead, develop has its 5 unique commits.
2. **Where the Tebra UI lives:** locate the redesign commits/files; confirm present on `main`, absent on `develop`.
3. **Deploy source:** which branch the live/preview deploy builds from. If `develop`, flag it.
4. **`stash@{0}`:** inspect; confirm partial Tier 6, nothing unexpected.
5. **AssessmentsTab + entitlements:** Tier 6 code present; `features`/`user_features` genuinely missing in prod (`eepwbtdqtdnqxeznykbh`).
6. **Render check:** build and run the trunk (`main`) locally; visually confirm the **Tebra UI renders, not the old one**.

### Phase A acceptance (gate)
- [ ] `docs/STATE-OF-TRUTH.md` answers all six with evidence.
- [ ] No change of any kind was made.
- [ ] Operator reviewed and approved before Phase B.

---

## PHASE B — UNBLOCK (only after Phase A approved)
1. **Out of OneDrive:** move ChartSparkOG and chartspark-assessments out (e.g. `C:\dev\`). Re-verify git works.
2. **Reconcile (per Codex, confirmed by Phase A):** tag a backup; consolidation branch off `main`; cherry-pick develop's 5 commits; resolve the ~3 conflicts. No shared-history rewrite without approval. Make `main` the deliberate trunk.
3. **Repoint the deploy source** to the trunk if Phase A found it wrong.
4. **Entitlements:** create + seed `features`/`user_features` in prod so AssessmentsTab unlocks.
5. **Restore Tier 6:** apply `stash@{0}` onto the designated branch; confirm AssessmentsTab live + unlocked.
6. Set the designated working branch in `STATE.md`; enable branch protection on the trunk.

### Phase B acceptance (done means)
- [ ] Both repos out of OneDrive; git clean.
- [ ] Backup tag; develop's 5 commits ported onto the consolidation branch off main; 3 conflicts resolved; no commits lost.
- [ ] Deploy builds from the trunk; deployed app shows the Tebra UI.
- [ ] `features`/`user_features` exist + seeded; AssessmentsTab unlocked and functional.
- [ ] Tier 6 stash restored on the designated branch.
- [ ] STATE.md names the designated working branch; trunk branch-protected.
- [ ] **Milestone audit gate:** the 9-agent review suite passes with zero open criticals **before** the merge to trunk (see `planning/REVIEW-SUITE.md`).
- [ ] STATE.md + DECISIONS.md updated.

## Handoff prompt for Claude Code
```
Read AGENTS.md and all of planning/ (esp. GIT-RULES.md + REVIEW-SUITE.md) and PRD-MASTER.md. Start in
plan mode. Execute architect-pack-01 PHASE A ONLY: produce docs/STATE-OF-TRUTH.md answering the six checks
with evidence. Make ZERO changes. Verify topology from git itself, where the Tebra UI lives, the deploy
source, stash@{0}, the entitlement tables, and render the trunk to confirm the Tebra UI shows. STOP and
present the report. Do NOT begin Phase B until I approve. Before the eventual trunk merge, run the 9-agent
review suite (zero open criticals).
```
