---
name: rls-testing
description: Write RLS (Row-Level Security) tests for every new PHI table in ChartSparkOG. Use whenever you add a new Supabase table that contains PHI, modify an existing RLS policy, or open a PR that touches database schema. RLS tests are MANDATORY for merge — a PR without them is blocked by CI.
---

# RLS Testing — Mandatory for Every PHI Table

## Why this matters

RLS is ChartSparkOG's primary defense against cross-org data leaks. A misconfigured policy means org A can read or write org B's patient data. The only reliable way to catch this is automated tests that try to do exactly that and fail.

## The four tests every PHI table needs

For every new table, write tests that prove:

1. **An authenticated user in org A CAN read their own org's rows**
2. **An authenticated user in org A CANNOT read org B's rows**
3. **An authenticated user in org A CANNOT insert a row with org B's `org_id`**
4. **An authenticated user in org A CANNOT update or delete org B's rows**

If any of these tests pass when they should fail (or fail when they should pass), the RLS is broken and the PR cannot merge.

## Test pattern (Jest + Supabase)

`tests/rls/<table-name>.test.ts`:

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client — bypasses RLS, used for test setup/teardown
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Two test orgs + users, created in beforeAll
let orgA: string, orgB: string;
let userA: { id: string; email: string }, userB: { id: string; email: string };
let userAClient: SupabaseClient, userBClient: SupabaseClient;

beforeAll(async () => {
  // Create two test orgs
  const { data: orgARow } = await admin.from("organizations").insert({ name: "Test Org A" }).select().single();
  const { data: orgBRow } = await admin.from("organizations").insert({ name: "Test Org B" }).select().single();
  orgA = orgARow!.id;
  orgB = orgBRow!.id;

  // Create users in each org
  const { data: userARow } = await admin.auth.admin.createUser({
    email: `test-a-${Date.now()}@example.com`,
    password: "TestPassword123!",
    email_confirm: true,
    user_metadata: { organization_id: orgA },
  });
  userA = { id: userARow.user!.id, email: userARow.user!.email! };

  const { data: userBRow } = await admin.auth.admin.createUser({
    email: `test-b-${Date.now()}@example.com`,
    password: "TestPassword123!",
    email_confirm: true,
    user_metadata: { organization_id: orgB },
  });
  userB = { id: userBRow.user!.id, email: userBRow.user!.email! };

  // Insert into users table linking auth user to org
  await admin.from("users").insert([
    { id: userA.id, organization_id: orgA, email: userA.email },
    { id: userB.id, organization_id: orgB, email: userB.email },
  ]);

  // Sign in each user to get a JWT-scoped client
  userAClient = createClient(url, anonKey);
  await userAClient.auth.signInWithPassword({ email: userA.email, password: "TestPassword123!" });

  userBClient = createClient(url, anonKey);
  await userBClient.auth.signInWithPassword({ email: userB.email, password: "TestPassword123!" });
});

afterAll(async () => {
  // Cleanup — service role bypasses RLS
  await admin.from("<table>").delete().or(`org_id.eq.${orgA},org_id.eq.${orgB}`);
  await admin.from("users").delete().or(`id.eq.${userA.id},id.eq.${userB.id}`);
  await admin.auth.admin.deleteUser(userA.id);
  await admin.auth.admin.deleteUser(userB.id);
  await admin.from("organizations").delete().or(`id.eq.${orgA},id.eq.${orgB}`);
});

describe("RLS on <table>", () => {
  let rowInOrgA: string;
  let rowInOrgB: string;

  beforeAll(async () => {
    // Seed one row in each org using service role
    const { data: a } = await admin.from("<table>").insert({ org_id: orgA, /* other fields */ }).select().single();
    const { data: b } = await admin.from("<table>").insert({ org_id: orgB, /* other fields */ }).select().single();
    rowInOrgA = a!.id;
    rowInOrgB = b!.id;
  });

  test("user in org A CAN read org A's rows", async () => {
    const { data, error } = await userAClient.from("<table>").select().eq("id", rowInOrgA).single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(rowInOrgA);
  });

  test("user in org A CANNOT read org B's rows", async () => {
    const { data, error } = await userAClient.from("<table>").select().eq("id", rowInOrgB).maybeSingle();
    // RLS hides the row — returns null without error, OR returns empty array
    expect(data).toBeNull();
  });

  test("user in org A CANNOT insert a row with org B's org_id", async () => {
    const { error } = await userAClient.from("<table>").insert({ org_id: orgB, /* other fields */ });
    // WITH CHECK should reject — expect a Postgres RLS violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/row-level security|policy/i);
  });

  test("user in org A CANNOT update org B's rows", async () => {
    const { data, error } = await userAClient
      .from("<table>")
      .update({ /* a field to change */ })
      .eq("id", rowInOrgB)
      .select();
    // Either error OR empty data (RLS hides the row from UPDATE)
    expect(data === null || data.length === 0).toBe(true);
  });

  test("user in org A CANNOT delete org B's rows", async () => {
    const { data, error } = await userAClient
      .from("<table>")
      .delete()
      .eq("id", rowInOrgB)
      .select();
    expect(data === null || data.length === 0).toBe(true);
    // Verify row still exists (admin check)
    const { data: stillThere } = await admin.from("<table>").select().eq("id", rowInOrgB).single();
    expect(stillThere).not.toBeNull();
  });
});
```

## Running RLS tests

```bash
npm run test:rls
```

This is wired into CI. The PR is blocked if any RLS test fails.

## Common RLS mistakes to catch

### Missing WITH CHECK on UPDATE

Without WITH CHECK, an attacker can update a row in their own org and change its `org_id` to another org. The USING clause filters the rows you can see; WITH CHECK validates the new values you're trying to write.

```sql
-- ❌ WRONG — missing WITH CHECK
CREATE POLICY <name> ON <table> FOR UPDATE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ✅ RIGHT
CREATE POLICY <name> ON <table> FOR UPDATE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
```

### Permissive policy that lets everyone in

```sql
-- ❌ WRONG — open policy
CREATE POLICY <name> ON <table> FOR SELECT USING (true);
```

Never use `USING (true)`. Even for "public" data, scope to org.

### Using auth.uid() inside SECURITY DEFINER functions called via RPC

If you wrap RLS-protected access in a SECURITY DEFINER function, the function runs as the function owner (typically `postgres`) and bypasses RLS entirely. Either:
- Avoid SECURITY DEFINER for PHI access
- Or explicitly check `auth.uid()` inside the function body

### Forgetting to enable RLS

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
```

Without this, your policies do nothing. Verify with:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Every row should have `rowsecurity = true`.

### Service role bypasses RLS — never use it from user-facing code

The service role key bypasses all RLS. Use it only for:
- Background jobs / cron
- Migrations
- Test setup/teardown
- Audit logging (writes only)

Never expose the service role key to client code or use it to satisfy a user-initiated request.

## See also

- `security-first` — the merge gate
- `sidecar-scaffolding` — where to put your tests
- `api-endpoints` — auth and RLS pattern at the API layer
