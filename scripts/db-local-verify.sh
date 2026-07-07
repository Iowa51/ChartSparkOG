#!/usr/bin/env bash
# Stand up a throwaway Postgres 16 for local verification of the Sprint 0 / P1
# intake data layer, then apply the minimal Supabase primitives + the repo's
# base schema + the vitals migration + this phase's two migrations.
#
# Why not `supabase db reset`? The base tables live in supabase/schema.sql
# (not a timestamped migration) and parts of the migration history were applied
# manually out of band (see supabase/MIGRATION_LEDGER.md), so a from-scratch
# reset fails on unrelated pre-existing history. This harness verifies THIS
# phase in isolation against the real schema.sql base.
#
# Usage:
#   bash scripts/db-local-verify.sh
#   npm run test:db
#
# Requires: Docker running. Binds host port 54322 (the test default).
set -euo pipefail

CONTAINER=chartspark_p1_verify
PORT=54322
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL=(docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

echo "==> (re)creating container $CONTAINER on port $PORT"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres \
  -p "$PORT:5432" postgres:16 >/dev/null

echo "==> waiting for Postgres to accept connections"
for i in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
  [ "$i" = "60" ] && { echo "Postgres did not become ready"; exit 1; }
done

echo "==> applying Supabase primitives (roles + auth schema + auth.uid())"
"${PSQL[@]}" <<'SQL'
-- Roles Supabase provides; RLS policies target `authenticated`.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')          THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')  THEN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
-- Minimal auth.users so public.users.id -> auth.users(id) FK resolves.
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);

-- auth.uid() reads the JWT sub from the request.jwt.claims GUC, like Supabase.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
SQL

echo "==> applying base schema.sql"
"${PSQL[@]}" < "$HERE/supabase/schema.sql"

echo "==> applying vitals migration"
"${PSQL[@]}" < "$HERE/supabase/migrations/20260218_vitals_triage_tables.sql"

echo "==> applying Sprint 0 / P1 migrations (+ P1-FIXES: SM-1/SM-2/RLS-1, vitals RLS)"
"${PSQL[@]}" < "$HERE/supabase/migrations/20260706120000_sprint0_p1_intake_data_layer.sql"
"${PSQL[@]}" < "$HERE/supabase/migrations/20260706120001_sprint0_p1_intake_templates_seed.sql"
"${PSQL[@]}" < "$HERE/supabase/migrations/20260706120002_sprint0_p1_intake_fixes.sql"
"${PSQL[@]}" < "$HERE/supabase/migrations/20260706120003_vitals_rls_org_scoping.sql"

echo "==> granting table/function privileges to Supabase roles (post-DDL)"
"${PSQL[@]}" <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
SQL

echo "==> ready. DB: postgresql://postgres:postgres@127.0.0.1:$PORT/postgres"
echo "    run: npm run test:db"
