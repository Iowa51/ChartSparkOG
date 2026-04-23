# P1_FIX8_MIGRATION_DRIFT.md

Read CLAUDE.md first. Documentation + tooling task, ONE commit.

## Problem

47+ migration files exist but no record of which are applied to production. Risk of shipping code depending on unapplied migrations.

## Tasks

### 1. Create supabase/MIGRATION_LEDGER.md

List every file in supabase/migrations/ as a table with columns: File, Status, Notes.

Set status to "confirmed applied" ONLY for:
- 20260210_add_review_statuses.applied.sql (self-identifies)
- 20260423000000_inline_expiration_drop_orphan.sql (applied in Session 7)

Set all others to "unknown".

At the top, include this verification query for James to run in Supabase SQL Editor:
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

Include instructions to compare query output against the ledger.

### 2. Create scripts/check-migration-drift.ts

Simple script that reads filenames from supabase/migrations/, strips .sql, prints them as a checklist, and prints the SQL query to compare against production.

### 3. Add to CLAUDE.md

Add a short section at the end noting migration files live in supabase/migrations/, MIGRATION_LEDGER.md tracks status, and engineers should check the ledger before depending on a migration.

## After

npm run build. Commit:
git add -A
git commit -m "fix: P1 add migration ledger and drift check tooling" --no-verify

Report: files created, total migration count, SHA.