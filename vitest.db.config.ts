import { defineConfig } from 'vitest/config';
import path from 'path';

// Dedicated config for the DB-integration suite (src/__tests__/db). The root
// vitest.config.ts intentionally EXCLUDES that directory from the default unit
// run, which also shadows the `vitest run src/__tests__/db` filter — so the DB
// tests need their own config. They require a live Postgres (see
// scripts/db-local-verify.sh) and run in a node environment (no jsdom).
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['src/__tests__/db/**/*.{test,spec}.{js,ts}'],
        // write-audit-log.test.ts needs the fuller reshaped `audit_logs`
        // baseline (action/entity_type/entity_id) + the write_audit_log helper,
        // which is a different harness (`supabase start`) than the intake
        // isolation harness in scripts/db-local-verify.sh. It is intentionally
        // excluded here so `npm run test:db` runs green against that harness;
        // run it separately against a Supabase stack. See supabase/SCHEMA-NOTES.md.
        exclude: ['node_modules/**', 'src/__tests__/db/write-audit-log.test.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
