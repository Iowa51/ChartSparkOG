---
name: og-edit-protocol
description: Safely modify ChartSparkOG core code when the mini-PRD declares "OG-EDIT REQUIRED" and a sidecar isn't mechanically possible. Use this skill whenever you need to add a file, modify a file, or run a migration inside the ChartSparkOG repo. Every OG-edit triggers re-pentest scope tracking and follows a strict checklist.
---

# OG-Edit Protocol

## When this applies

The mini-PRD for the feature you're building has a section labeled "OG-EDIT REQUIRED" with:
- A list of files you may create or modify
- A justification for why a sidecar can't do this
- The re-pentest scope (which areas to test)

If the mini-PRD does not declare OG-EDIT REQUIRED, you may not modify OG. Period.

## The hard rules

1. **Only touch declared files.** If the mini-PRD lists `src/lib/reminders/twilio-client.ts`, that's what you touch. Not `src/lib/auth/`, not `src/middleware.ts`, not "while you're there."

2. **Files in the audit-protected list are forbidden** even with OG-EDIT REQUIRED unless the mini-PRD explicitly names them and James approved:
   - `src/lib/auth/**`
   - `src/lib/security/**`
   - `src/middleware.ts`
   - `src/app/api/billing/**` (existing billing routes)
   - Any RLS policy migration on existing PHI tables

3. **New tables in OG schema are OK** if declared. New columns on existing PHI tables require explicit James approval per change.

4. **Conventional Commits with `og-edit:` prefix** for every commit that touches OG core:
   ```
   feat(03): add reminder_settings table  [og-edit: new file, new table]
   feat(03): wire cron route for reminders  [og-edit: new route, no existing file touched]
   ```

5. **Re-pentest scope file** updated for every OG-edit batch.

## The 9-step protocol

Before beginning any OG-edit, complete the reconnaissance ritual from `using-skills` skill, Step 0. The protocol below extends that ritual with OG-specific concerns — edit-window verification, audit-protected file checks, and re-pentest scoping.

### Step 1 — Confirm the edit window is open

Verify with James (or check the project status) that the OG freeze has been temporarily lifted for this feature. The git pre-commit hook will block commits otherwise.

### Step 2 — Read the relevant mini-PRD section

The mini-PRD's "OG-EDIT REQUIRED" section lists:
- Files allowed to create or modify
- Tables allowed to create
- Routes allowed to add
- Justification (the "why a sidecar can't")
- Re-pentest scope

You may not exceed any of these. If you need to, STOP and ask James to amend the mini-PRD.

### Step 3 — Read the security-first skill

Re-read it. OG-edits are higher-risk than sidecar work and the patterns are stricter.

### Step 4 — Branch from `main`

```bash
cd C:\Users\joman\OneDrive\Desktop\ChartSparkOG
git checkout main
git pull
git checkout -b feature/<NN>-<short-name>
```

Branch name must reference the feature number.

### Step 5 — Make the changes

Only the declared files. Re-read the mini-PRD list as you work — easy to drift.

### Step 6 — Migration safety

If creating tables:

```sql
-- supabase/migrations/<timestamp>_<feature>_tables.sql

-- Wrap in transaction
BEGIN;

CREATE TABLE <new_table> (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  -- ...
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE <new_table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <name>_select ON <new_table> FOR SELECT
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY <name>_insert ON <new_table> FOR INSERT
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY <name>_update ON <new_table> FOR UPDATE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY <name>_delete ON <new_table> FOR DELETE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

COMMIT;
```

Verify the migration applies cleanly to a fresh local DB before pushing.

Never `ALTER TABLE` an existing PHI table without explicit James approval. Migration drift is a known OG pain point (per observability roadmap).

When the migration creates or modifies `SECURITY DEFINER` functions in the `public` schema, follow the Supabase default-grant pattern in `security-first` skill. `REVOKE ALL ... FROM PUBLIC` is insufficient on Supabase — functions in `public` inherit default `EXECUTE` grants for `anon`, `authenticated`, and `service_role` from `pg_default_acl` that must be revoked explicitly.

### Step 7 — Write tests

Mandatory:
- RLS tests for any new table (see `rls-testing`)
- Unit tests for any new business logic
- Integration tests for any new API route

CI will block merge without these.

### Step 8 — Update the re-pentest scope file

Append to `reports/repentest-scope.md`:

```markdown
## Feature <NN> — <name>

**Branch:** feature/<NN>-<short-name>
**Date:** YYYY-MM-DD
**OG-edit type:** [new files only | new files + table | new files + schema change]

### Files added/modified
- src/lib/reminders/twilio-client.ts (new)
- src/lib/reminders/scheduler.ts (new)
- src/app/api/cron/send-reminders/route.ts (new)
- supabase/migrations/20260525_reminders_tables.sql (new tables only)
- vercel.json (added cron entry)
- package.json (added @twilio/twilio)

### Pentest scope (re-test in week 13)
- New cron route: auth bypass, CRON_SECRET validation
- Twilio webhook: signature validation, replay attack
- New tables: RLS policies (USING + WITH CHECK)
- Feature flag: fail-closed behavior

### Known risk
- 10DLC SMS registration introduces a new outbound vendor — Twilio is in scope for BAA verification.
```

This file is what you hand to Cobalt at week 13.

### Step 9 — Open the PR

PR description must include:
- Mini-PRD reference (e.g., "Implements features/03-reminders.md v1.0")
- OG-edit declaration (which files, why a sidecar wasn't possible)
- Security gate checklist (copy from `security-first` skill)
- Re-pentest scope (link to updated `reports/repentest-scope.md`)

James reviews. Merge only after explicit approval.

## What the pre-commit hook checks

ChartSparkOG has a pre-commit hook that blocks commits if:
- The current branch is `main`
- The freeze flag (`.freeze` file or env var) is set
- Any modified file is in the audit-protected list AND the commit doesn't have `og-edit:` in the message

If you have a legitimate edit and the hook fires anyway, **do not bypass with `--no-verify`**. Stop and ask James to clear the freeze.

## What to do if you discover a security issue while working

You're editing `src/lib/reminders/scheduler.ts` and notice an unrelated SQL injection in `src/app/api/something-else/route.ts`.

**Do not fix it in this PR.** Doing so:
- Expands the OG-edit scope
- Confuses re-pentest scoping
- Mixes unrelated changes

Instead:
1. Document the finding in a new file: `reports/incidental-findings.md`
2. Note the file, line, severity, and suggested fix
3. Continue with your declared scope
4. Tell James in the PR description

James will decide whether to ship a separate hotfix.

## See also

- `security-first` — the merge gate
- `rls-testing` — required for any new table
- `sidecar-scaffolding` — the default when OG-edit isn't required
