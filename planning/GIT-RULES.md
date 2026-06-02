# GIT-RULES — The branch + environment spine (Living Document)

## Reality (Codex-confirmed — re-verify in pack-01 Phase A)
- `main` = **authoritative trunk**, ~135 commits ahead, includes the **Tebra UI redesign**, PRD docs, security migrations, pentest fixes.
- `develop` = behind, only **5 unique commits**.
- Reconcile: port develop's 5 commits onto a **consolidation branch off main**; resolve ~3 conflict files (agent-orchestrator area); main becomes the deliberate trunk.

## Environment (non-negotiable)
- **Repos must NOT live in OneDrive.** Move ChartSparkOG and chartspark-assessments out (e.g. `C:\dev\`). OneDrive corrupts git.
- **Accounts:** `gh auth switch` before every push — **Iowa51** (ChartSparkOG), **RedArkventures** (chartspark-assessments). Confirm `gh auth status`.

## Per-session preamble (CC runs FIRST)
```
pwd                        # must NOT be under OneDrive
gh auth switch             # Iowa51 for ChartSparkOG
gh auth status ; git remote -v ; git fetch --all ; git status
git branch --show-current  # must equal the designated working branch in STATE.md
```

## Push protocol
Commit on the designated branch; push only after operator approval; PR into the trunk. Branch protection on the trunk blocks direct pushes. No force-push/reset/rebase of shared branches without explicit approval + a backup tag.

## Deploy source
Confirm the deployment builds from the trunk (not a stale branch).
