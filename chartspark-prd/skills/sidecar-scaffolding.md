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
│   │   ├── audit-log.ts           (calls write_audit_log RPC)
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
npm install --save-dev typescript @types/node @types/express @types/cors jest ts-jest @types/jest supertest @types/supertest
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-security
npx tsc --init --strict --target es2022 --module commonjs --outDir dist --rootDir src
```

> **Note on TypeScript 6.x defaults.** As of TS 6.x, `tsc --init --strict` writes `"verbatimModuleSyntax": true` by default, which forbids ES `import`/`export` syntax under `module: commonjs`. We use ES syntax throughout the templates below, so Step 4 below overrides this back to `false`. Also note: `tsc --init` writes `"types": []` by default — this opts out of auto-loading any @types package, which is correct for the production build but means test files need their own `tsconfig.test.json` with explicit `types: ["node", "jest"]` (see Step 8).

### Step 4 — Lock down `package.json` and `tsconfig.json`

Edit `tsconfig.json` (the file `tsc --init` just wrote) — apply these overrides:

```json
{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "module": "commonjs",
    "target": "es2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noUncheckedSideEffectImports": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*"]
}
```

Key points:
- `verbatimModuleSyntax: false` — required for our ES import syntax under `module: commonjs` (TS 6.x default of `true` breaks the templates below).
- `include: ["src/**/*"]` — confines the production build to `src/`. Tests get their own config in Step 8.
- `types: []` is the TS-6 default; keep it — we override per-config in `tsconfig.test.json`.
- `noUncheckedIndexedAccess: true` — types `obj[key]` as `T | undefined` even after validation. The `?? 0` fallback pattern (with `istanbul ignore next` to satisfy coverage) is the standard idiom; see `testing-patterns` skill.

Now `package.json`:

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
    "typecheck": "tsc -p tsconfig.test.json --noEmit",
    "test": "jest --coverage --passWithNoTests",
    "test:rls": "jest tests/rls --passWithNoTests",
    "test:integration": "jest tests/integration --passWithNoTests"
  }
}
```

### Step 5 — Configure ESLint with security plugin

`.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended-legacy"
  ],
  "plugins": ["@typescript-eslint", "security"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "security/detect-object-injection": "warn",
    "no-console": ["warn", { "allow": ["log", "warn", "error"] }]
  },
  "ignorePatterns": ["dist/", "node_modules/", "coverage/"]
}
```

Three details that matter:

1. **`plugin:security/recommended-legacy`** — `eslint-plugin-security` v3+ split configs by ESLint config format. The `-legacy` variant is for `.eslintrc.json` (what we use); the unsuffixed `recommended` is for the new `eslint.config.js` flat-config format. Wrong name = ESLint fails to load.

2. **`argsIgnorePattern: "^_"` / `varsIgnorePattern: "^_"`** — required for Express's 4-argument error middleware signature (`err, _req, res, _next`). Express counts arguments at runtime to distinguish error handlers from regular middleware, so the 4-arg form is mandatory; the `_` prefix is the standard "intentionally unused" marker.

3. **`"log"` in the no-console allowlist** — server-startup events (`console.log("server.started", …)`) are info-level structured operational telemetry, not warnings. Severity-shifting to `console.warn` would corrupt log streams (alerts would fire on every cold start). The rule stays active to catch stray debug `console.log` in feature code; the allowlist names the three levels we permit.

### `detect-object-injection` and the framework-dispatch pattern

The `security/detect-object-injection` rule flags `obj[variableKey]` access. It catches a real attack class (prototype pollution, arbitrary property access from user input). It also has frequent false positives in framework code where the key is internal-to-the-codebase. When you hit one:

**Inline disable is acceptable IF ALL of these hold:**
- The index originates from code-defined literals or values you control (not user input)
- The data being indexed is Zod-validated upstream
- The result is re-validated (existence check, range check) before branching

**Comment template:**

```typescript
// Why: <key-var> is a literal value defined by <where>. Not user input.
// Responses are Zod-validated upstream; value is re-checked below.
// eslint-disable-next-line security/detect-object-injection
const value = responses[suicideItem];
```

Place the `eslint-disable-next-line` comment **immediately** before the offending line — comments between the disable and the line break it.

**Never disable the rule globally.** It catches real bugs in feature code where the input chain is less clean.

### Step 6 — Create the Express bootstrap

`src/server.ts` (template — adapt for your feature):

```typescript
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { auth } from "./middleware/auth";
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

// Eager-warmup: load jose, fetch JWKS, validate config at boot.
// Fail loud if anything is misconfigured rather than failing the
// first user request. JWKS is cached for the lifetime of the
// process so the first real request is fast.
auth.warmup()
  .then(() => {
    app.listen(port, () => {
      console.log("server.started", { port, service: "chartspark-<feature>" });
    });
  })
  .catch((err) => {
    console.error("server.start.failed", {
      errorClass: err instanceof Error ? err.constructor.name : "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
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

The test scaffold has three files because TypeScript+Jest+ts-jest in TS 6.x requires explicit configuration.

**1. `tsconfig.test.json`** — a second tsconfig that extends the base and includes `tests/`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": ".",
    "types": ["node", "jest"],
    "ignoreDeprecations": "6.0"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

Why each override:
- `noEmit: true` — typecheck only, never emit
- `rootDir: "."` — the base config sets `rootDir: src`, which rejects any `.ts` file under `tests/`. Override required. Safe because `noEmit: true` makes rootDir's emit-shaping role inert.
- `types: ["node", "jest"]` — base config has `types: []` (opt-out of auto-loading), which is right for production builds but means test files can't see `describe`/`test`/`expect` globals or Node types. Add them per-config.
- `ignoreDeprecations: "6.0"` — ts-jest treats inherited `moduleResolution=node10` deprecation warnings as hard errors. This override is test-config-only and base-config-unaffected.

**2. `jest.config.js`** — Jest config with per-path coverage thresholds:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/types/**"],
  coverageThreshold: {
    // Per-path thresholds. Add an entry as each feature's implementation lands.
    // RULE: when a stub gains real logic, add its path to this block in the
    //       SAME PR. Adding code without adding a threshold path is a
    //       security-gate regression.
    "./src/<feature>/**/*.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  testMatch: ["**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
```

The `transform` block is critical — it points ts-jest at `tsconfig.test.json` so the deprecation override and test-only types are applied during test compilation.

**On per-path thresholds vs global.** The original v1.0 skill used a global 80% threshold. That fails immediately on Day-1 scaffolds because the Day-1 middleware stubs are 0% (correctly — they're placeholders). Per-path thresholds enforce 80% on real implementation code without demanding test coverage of placeholder code that will be replaced. The TODO list in the threshold block makes the stub→real transitions explicit: when a stub gains real code, its path must be added to the threshold block in the same PR.

### Step 9 — Add the migration: tables, sidecar role, and grants

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

-- 5. Audit-write access (REQUIRED for every sidecar).
--    Sidecars NEVER perform direct INSERT on audit_logs. All audit writes
--    go through the SECURITY DEFINER chokepoint public.write_audit_log.
--    See the cardinal principle below for the contract.
--
--    Defense-in-depth: REVOKE first, then GRANT exactly what's needed.
--    Even if the role somehow inherits unwanted privileges from PUBLIC
--    or default ACLs, the REVOKE strips them before the explicit GRANT.
--    Idempotent.
REVOKE ALL ON FUNCTION public.write_audit_log(
    text, text, uuid, uuid, uuid, text, jsonb, text
) FROM sidecar_<feature>;
GRANT EXECUTE ON FUNCTION public.write_audit_log(
    text, text, uuid, uuid, uuid, text, jsonb, text
) TO sidecar_<feature>;
-- The sidecar role gets NO direct grants on the audit_logs table itself
-- — no SELECT, no INSERT, no UPDATE, no DELETE. The audit_logs RLS
-- restricts direct INSERT to service_role only; sidecars are not
-- members of service_role.

-- 6. Sequences (required for UUID generation and any serial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sidecar_<feature>;
```

The sidecar's `SUPABASE_SERVICE_ROLE_KEY_SIDECAR` environment variable holds the connection string for THIS role (not OG's full service role). Mixing them invalidates the least-privilege guarantee.

If your mini-PRD requires SELECT/INSERT/UPDATE/DELETE on additional OG tables beyond what's listed above, declare them explicitly in the mini-PRD's "OG-EDIT REQUIRED" section so they're tracked in the re-pentest scope.

#### The audit-write contract (cardinal)

CARDINAL: Sidecars NEVER perform direct INSERT on the `audit_logs` table. All audit writes go through `public.write_audit_log` via RPC. Sidecar Postgres roles are granted EXECUTE on the function and nothing else on `audit_logs` — no SELECT, no INSERT, no UPDATE, no DELETE. The `audit_logs` RLS restricts direct INSERT to `service_role` only; sidecars are not members of `service_role`.

The deployed function signature:

```sql
public.write_audit_log(
  p_action          text,        -- REQUIRED, UPPERCASE_SNAKE_CASE
  p_entity_type     text,        -- REQUIRED, lowercase singular
  p_user_id         uuid,        -- nullable
  p_organization_id uuid,        -- nullable
  p_entity_id       uuid,        -- nullable (entity audited)
  p_ip_address      text,        -- nullable
  p_details         jsonb,       -- nullable, metadata-only (no PHI)
  p_risk_level      text         -- default 'INFO'; 'HIGH' for safety-relevant
) RETURNS uuid                   -- the inserted audit_logs row id
```

#### Calling write_audit_log from sidecar code

```typescript
await writeAuditLog(client, {
  action: 'ENTITY_CREATED',
  entityType: 'assessment_administration',
  userId: req.user.id,
  organizationId: req.user.organizationId,
  entityId: newId,
  ipAddress: req.ip,
  details: { /* metadata only — NO PHI */ },
  riskLevel: 'INFO',
});
```

- The helper takes a `PoolClient`, not the `Pool`. It must run inside the caller's transaction so a failed audit rolls back the entire request.
- `details` (JSONB) carries metadata ABOUT the access — entity ids, filter shapes, counts, `has_safety_flags` booleans. NEVER the PHI itself.
- On safety-relevant flags (`suicide_risk_*`, `recent_suicidal_behavior`, etc., detected via `hasSafetyRelevantFlags` from the scale registry), `riskLevel: 'HIGH'`. Otherwise `'INFO'`.

#### Read paths audit too

Every successful read of PHI writes one audit row inside `withTransaction`; an audit-write failure rolls back the read and returns 500 — the caller does not receive data whose access could not be logged. 404 paths do NOT audit (no PHI was accessed). See `api-endpoints` skill for the canonical read pattern.

#### Supabase default-grant warning

WARNING: On Supabase, functions in the `public` schema inherit default EXECUTE grants for `anon`, `authenticated`, and `service_role` from `pg_default_acl`. `REVOKE ALL ON FUNCTION ... FROM PUBLIC` does NOT remove these default grants. Every SECURITY DEFINER function in `public` must explicitly REVOKE EXECUTE from `anon`, `authenticated`, and `service_role` at definition time. See `security-first` skill for the full pattern.

#### Authoring migration SQL on Windows

Write migration files as UTF-8 WITHOUT BOM. PowerShell's `Set-Content -Encoding UTF8` emits a BOM that Supabase CLI rejects. Use `[System.IO.File]::WriteAllText` with `[System.Text.UTF8Encoding]::new($false)`, or PowerShell 6+'s `-Encoding UTF8NoBOM`. Avoid `Get-Content -Raw` to re-read existing files — it reads via the Windows-1252 code page and corrupts multi-byte UTF-8 characters (em-dashes, smart quotes, etc.).

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
