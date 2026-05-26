# ChartSpark — Project Notes for Claude

## Database Migrations

Migration files live in `supabase/migrations/`. `supabase/MIGRATION_LEDGER.md` tracks which files have been confirmed applied in production. Before writing code that depends on a migration, check the ledger — most entries are currently marked `unknown` and must be verified against `supabase_migrations.schema_migrations` before being relied on. Run `npx tsx scripts/check-migration-drift.ts` to print the current filename checklist and the verification query.

# ChartSpark — Project Notes for Claude

## Database Migrations

Migration files live in `supabase/migrations/`. `supabase/MIGRATION_LEDGER.md` tracks which files have been confirmed applied in production. Before writing code that depends on a m

## PRD Package — Read Before Any Task

This project follows the PRD package at `chartspark-prd/`.

**Before any task, read in this order:**
1. `chartspark-prd/master/PRD-MASTER.md` — the constitution
2. `chartspark-prd/skills/using-skills.md` — routing for HOW skills
3. The relevant mini-PRD in `chartspark-prd/features/`
4. The HOW skills referenced by step 2

If the PRD contradicts a verbal instruction, the PRD wins. Ask for clarification.

Hard rules (full versions in master PRD):
- Sidecar by default; OG-edit only when the mini-PRD declares "OG-EDIT REQUIRED"
- RLS on every new PHI table; RLS tests mandatory
- Zod validation on every API endpoint
- No PHI in logs, ever
- Fail closed on auth/feature-gate uncertainty
- Files <300 lines, functions <50 lines, no `any` without comment