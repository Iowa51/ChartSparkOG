---
name: sidecar-scaffolding
description: Scaffold a new sidecar service for the ChartSparkOG parity build. Use whenever you need to create a new independent service (Express, Next.js, or worker) that connects to ChartSparkOG's Supabase database without modifying OG core. This skill ensures every new sidecar follows the same security-first, RLS-scoped, kill-switchable pattern.
---

# Sidecar Scaffolding

## What a sidecar is

An independent service that:
- Lives in its own git repo (`RedArkventures/chartspark-<feature>`)
- Deploys to its own Vercel project or Azure Container App
- Has its own Postgres role with least-privilege RLS policies
- Has its own secrets vault entry (no secret sharing with OG)
- Has a feature flag in OG (off by default)
- Has a kill switch (health endpoint + circuit breaker)

Sidecars never modify ChartSparkOG core files.

## When to scaffold one

You're starting work on any feature in the parity plan that doesn't say "OG-EDIT REQUIRED" in its mini-PRD.

## Canonical sidecar structure

```
chartspark-<feature>/
├── package.json
├── tsconfig.json                  (strict mode)
├── .eslintrc.json                 (with security plugin)
├── .env.example                   (stubs only, no real secrets)
├── .gitignore                     (node_modules, .env, .env.local, dist/)
├── README.md                      (setup + deploy steps)
├── src/
│   ├── server.ts                  (Express bootstrap, port from env)
│   ├── middleware/
│   │   ├── auth.ts                (verify JWT from OG)
│   │   ├── rate-limit.ts
│   │   ├── error-handler.ts       (no stack traces leaked)
│   │   └── request-id.ts          (X-Request-ID for tracing)
│   ├── api/                       (route handlers)
│   ├── lib/
│   │   ├── supabase-client.ts     (scoped service role)
│   │   ├── audit-log.ts           (writes to OG's audit_log)
│   │   └── validation.ts          (Zod helpers)
│   ├── domain/                    (business logic, no HTTP/DB awareness)
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── rls/                       (mandatory — see rls-testing skill)
└── supabase/
    └── migrations/                (new tables for this sidecar)
```

## The scaffolding sequence

### Step 1 — Read the master PRD

If you haven't already, read `master/PRD-MASTER.md`. The tech stack, security gate, and database conventions all apply.

### Step 2 — Create the repo

```bash
# On the developer's machine
mkdir C:\Users\joman\OneDrive\Desktop\chartspark-<feature>
cd C:\Users\joman\OneDrive\Desktop\chartspark-<feature>
git init
gh repo create RedArkventures/chartspark-<feature> --private --source=. --remote=origin
```

### Step 3 — Initialize Node + TypeScript

```bash
npm init -y
npm install --save express zod @supabase/supabase-js helmet cors
npm install --save-dev typescript @types/node @types/express jest ts-jest @types/jest supertest @types/supertest
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-security
npx tsc --init --strict --target es2022 --module commonjs --outDir dist --rootDir src
```

### Step 4 — Lock down `package.json`

```json
{
  "name": "chartspark-<feature>",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "ts-node-dev src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "test": "jest --coverage",
    "test:rls": "jest tests/rls",
    "test:integration": "jest tests/integration"
  }
}
```

### Step 5 — Configure ESLint with security plugin

`.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended"
  ],
  "plugins": ["@typescript-eslint", "security"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "security/detect-object-injection": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Step 6 — Create the Express bootstrap

`src/server.ts` (template — adapt for your feature):

```typescript
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { errorHandler } from "./middleware/error-handler";
import { requestId } from "./middleware/request-id";
import { rateLimit } from "./middleware/rate-limit";

const app = express();

// Port is REQUIRED. Each sidecar has an assigned port (see master PRD §3.5).
// Fail closed if PORT is missing — we never want two sidecars colliding.
const portEnv = process.env.PORT;
if (!portEnv) {
  throw new Error("PORT env var is required. See master PRD §3.5 for assignments.");
}
const port = Number(portEnv);
if (!Number.isFinite(port) || port < 1024 || port > 65535) {
  throw new Error(`PORT must be a valid port number, got: ${portEnv}`);
}

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? false }));
app.use(express.json({ limit: "100kb" }));
app.use(requestId);
app.use(rateLimit);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "chartspark-<feature>" });
});

// Mount routes here
// app.use("/api/v1/...", routerXyz);

app.use(errorHandler);

app.listen(port, () => {
  console.log("server.started", { port, service: "chartspark-<feature>" });
});
```

### Step 7 — Create the Supabase client

`src/lib/supabase-client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_SIDECAR;

if (!url || !serviceRoleKey) {
  throw new Error("Missing Supabase env vars");
}

// Sidecar uses a dedicated service role with least-privilege grants.
// Do NOT use the same key as ChartSparkOG core.
export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

### Step 8 — Set up the test scaffold

`jest.config.js`:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/types/**"],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  testMatch: ["**/tests/**/*.test.ts"],
};
```

### Step 9 — Add the migration for new tables AND provision the sidecar Postgres role

The sidecar runs as its own Postgres role with least-privilege grants. This is what makes the sidecar pattern secure: even if the sidecar code is fully compromised, the role can only touch what's explicitly granted.

`supabase/migrations/<timestamp>_create_<feature>_tables.sql`:

```sql
-- Apply via supabase CLI; do NOT modify OG's migrations directory

-- 1. Create the sidecar's tables
CREATE TABLE <feature>_main_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  -- ... fields specific to this feature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE <feature>_main_table ENABLE ROW LEVEL SECURITY;

-- USING + WITH CHECK policies (see security-first skill)
CREATE POLICY <feature>_select ON <feature>_main_table FOR SELECT
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
-- ... (insert, update, delete policies)

-- 2. Provision the sidecar's Postgres role
CREATE ROLE sidecar_<feature> NOINHERIT LOGIN PASSWORD '<rotated_via_vault>';
GRANT USAGE ON SCHEMA public TO sidecar_<feature>;

-- 3. Grant on this sidecar's OWN tables (full CRUD)
GRANT SELECT, INSERT, UPDATE, DELETE ON <feature>_main_table TO sidecar_<feature>;
-- ... (grants for each table this sidecar owns)

-- 4. Grant on OG tables this sidecar must READ (least privilege)
--    Replace with the actual OG tables your mini-PRD declares you need.
GRANT SELECT ON patients TO sidecar_<feature>;
GRANT SELECT ON organizations TO sidecar_<feature>;
GRANT SELECT ON users TO sidecar_<feature>;

-- 5. Audit log write access (REQUIRED for every sidecar)
--    Every PHI action this sidecar performs must write to audit_log.
GRANT INSERT ON audit_log TO sidecar_<feature>;
-- Note: SELECT/UPDATE/DELETE on audit_log are NEVER granted to sidecars.
-- Audit log is append-only by design.

-- 6. Sequences (required for UUID generation and any serial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sidecar_<feature>;
```

The sidecar's `SUPABASE_SERVICE_ROLE_KEY_SIDECAR` environment variable holds the connection string for THIS role (not OG's full service role). Mixing them invalidates the least-privilege guarantee.

If your mini-PRD requires SELECT/INSERT/UPDATE/DELETE on additional OG tables beyond what's listed above, declare them explicitly in the mini-PRD's "OG-EDIT REQUIRED" section so they're tracked in the re-pentest scope.

### Step 10 — Register the feature flag in OG

This is the ONLY OG touch for a pure sidecar — adding the flag row.

```sql
-- Run against OG's feature_flags table
INSERT INTO feature_flags (key, default_enabled, description) VALUES
  ('<feature>_enabled', false, '<feature>: <short description>');
```

The flag is OFF for all orgs by default. Enable per-org via the admin panel when ready.

### Step 11 — Deploy

```bash
# Vercel for Express on Node
vercel link
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY_SIDECAR
vercel deploy --prod
```

### Step 12 — Document in README

The README must include:
- What the service does (one paragraph)
- How to run locally (`npm install`, `npm run dev`)
- Environment variables (without values)
- API endpoints (table: method, path, auth, purpose)
- Migration steps
- Kill switch instructions (how to disable via OG feature flag)

## Hard rules

1. The sidecar must not have any path-based dependency on ChartSparkOG (no `../ChartSparkOG/...` imports).
2. The sidecar must not write to any OG table outside its declared scope in the mini-PRD.
3. The sidecar must have its own secrets — do not reuse OG's Supabase service role key.
4. The sidecar must respect the OG feature flag — refuse to serve requests when the flag is OFF for that org.
5. The sidecar must include a kill switch (the OG flag IS the kill switch).

## See also

- `security-first` — the merge gate
- `rls-testing` — how to test the RLS policies on your new tables
- `api-endpoints` — full API route pattern
- `og-edit-protocol` — if you have to modify OG (only when mini-PRD says so)
