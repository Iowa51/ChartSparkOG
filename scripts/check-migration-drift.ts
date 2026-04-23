import { promises as fs } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main(): Promise<void> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  const versions = entries
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.slice(0, -".sql".length))
    .sort();

  console.log(`Found ${versions.length} migration file(s) in supabase/migrations/:\n`);
  for (const version of versions) {
    console.log(`  [ ] ${version}`);
  }

  console.log(
    "\nRun the following query in the Supabase SQL Editor against production and compare the `version` column against the checklist above:\n",
  );
  console.log("  SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;\n");
  console.log(
    "Any checklist entry that is missing from the query output is a potential drift. Update supabase/MIGRATION_LEDGER.md after reconciliation.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
