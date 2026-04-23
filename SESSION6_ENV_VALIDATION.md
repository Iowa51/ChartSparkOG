# SESSION6_ENV_VALIDATION.md

Read CLAUDE.md first. One new file, one integration pass, ONE commit.

---

## Problem

There is no env validation at startup. Every file reads process.env directly. If a variable is missing or malformed, the app fails at runtime with cryptic errors instead of refusing to start with a clear message.

---

## Fix: Create src/lib/env.ts

Create a single source of truth for all environment variables using Zod.

### Step 1: Inventory all env vars

Grep the entire src/ directory and project root config files (sentry.*.config.ts, next.config.*, etc.) for process.env. Collect every unique env var name used. Categorize them:

**Required server-side (app won't function without these):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- AZURE_OPENAI_API_KEY (or whatever the Azure key var is named)
- AZURE_OPENAI_ENDPOINT
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

**Required for specific features (app starts but feature degrades):**
- RESEND_API_KEY
- DAILY_API_KEY
- NEXT_PUBLIC_SENTRY_DSN
- CRON_SECRET

**Optional with defaults:**
- NEXT_PUBLIC_DEMO_MODE (default: "false")
- NODE_ENV (default: "development")
- SIDECAR_READY (default: "false")

This list is NOT exhaustive — you MUST grep to find the real list. Include every process.env reference you find.

### Step 2: Build the schema

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Required - app won't start
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // ... etc for all required vars

  // Feature-specific - warn but don't crash
  RESEND_API_KEY: z.string().min(1).optional(),
  // ... etc

  // Optional with defaults
  NEXT_PUBLIC_DEMO_MODE: z.string().default("false"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // ... etc
});

// Parse and validate
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    // In production, refuse to start. In dev, warn loudly.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variables. Check server logs.");
    }
  }
  return result.success ? result.data : (process.env as unknown as z.infer<typeof envSchema>);
}

export const env = validateEnv();
```

### Step 3: Wire it in

Do NOT do a mass find-and-replace of process.env across the whole codebase — that is too risky for one commit. Instead:

1. Create the file with the schema and export.
2. Add an import of env from '@/lib/env' in src/app/layout.tsx (or the root server component) so it runs at app startup. A simple side-effect import is fine:
```typescript
   import '@/lib/env';
```
3. That's it for this commit. Future commits can gradually replace individual process.env reads with env.VAR_NAME.

### Important constraints

- The file must work in BOTH server and edge runtimes. Do not use Node-specific APIs.
- Use z.string().optional() for vars that might not exist, not z.string() which would throw.
- NEXT_PUBLIC_ vars are available client-side too — the schema should handle both server and client contexts. Consider splitting into serverEnv and publicEnv if needed, but keep it simple for v1.
- Do NOT break the build. If a var is actually optional in practice (feature works without it), mark it optional in the schema.

---

## After the fix

Run npm run build. If it passes, commit:

git add -A
git commit -m "fix: add Zod env validation at startup with src/lib/env.ts" --no-verify

Report:
- Total number of env vars found in the codebase
- How many marked required vs optional
- Any vars that surprised you (referenced but never set, or set but never read)
- SHA