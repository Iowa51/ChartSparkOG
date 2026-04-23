# ChartSpark — Project Notes for Claude

## Database Migrations

Migration files live in `supabase/migrations/`. `supabase/MIGRATION_LEDGER.md` tracks which files have been confirmed applied in production. Before writing code that depends on a migration, check the ledger — most entries are currently marked `unknown` and must be verified against `supabase_migrations.schema_migrations` before being relied on. Run `npx tsx scripts/check-migration-drift.ts` to print the current filename checklist and the verification query.
