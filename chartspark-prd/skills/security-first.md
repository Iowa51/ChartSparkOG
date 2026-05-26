---
name: security-first
description: Apply security-first patterns to all ChartSparkOG code — input validation, auth checks, RLS, audit logging, secret handling, error responses, fail-closed defaults. Use whenever you are writing new code, modifying existing code, or reviewing code for the ChartSparkOG parity build. Security is not optional and not last; it is the first feature.
---

# Security-First Coding for ChartSparkOG

## The principle

Every line of code is reviewed against OWASP Top 10 and HIPAA Security Rule before merge. Security is not a phase; it is woven through every feature. If you skip a check "because the feature is small," you have introduced a vulnerability.

## The Big 9 — every PR must satisfy these

### 1. Input validation (Zod, no exceptions)

```typescript
// ❌ NEVER
export async function POST(req: Request) {
  const body = await req.json();
  const result = await doThing(body.patientId, body.note);
  return Response.json(result);
}

// ✅ ALWAYS
import { z } from "zod";

const inputSchema = z.object({
  patientId: z.string().uuid(),
  note: z.string().min(1).max(50000),
});

export async function POST(req: Request) {
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Invalid request" } },
      { status: 422 }
    );
  }
  const result = await doThing(parsed.data.patientId, parsed.data.note);
  return Response.json(result);
}
```

### 2. Auth check (explicit, every route)

```typescript
// ✅ Every PHI route starts like this
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }
  if (!user.mfaVerified) {
    return Response.json(
      { error: { code: "MFA_REQUIRED", message: "MFA verification required" } },
      { status: 403 }
    );
  }
  // ... rest of handler
}
```

Use `getUser()`, never `getSession()` (the latter does not verify JWT signature).

### 3. RLS on every PHI table

If the table contains PHI, it has RLS enabled with USING + WITH CHECK policies. Read the `rls-testing` skill for the test pattern.

```sql
-- ✅ Every PHI table
CREATE TABLE patient_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_org_select ON patient_notes
  FOR SELECT
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY notes_org_insert ON patient_notes
  FOR INSERT
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY notes_org_update ON patient_notes
  FOR UPDATE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY notes_org_delete ON patient_notes
  FOR DELETE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
```

WITH CHECK is mandatory for INSERT/UPDATE. Without it, RLS only filters reads — an attacker can update a row across orgs.

### 4. Audit logging on PHI access

Every read and write of PHI is logged. The audit log itself is append-only with its own RLS.

```typescript
import { auditLog } from "@/lib/security/audit-log";

// ✅ After successful PHI access
await auditLog({
  actorId: user.id,
  orgId: user.orgId,
  action: "patient.note.read",
  resourceType: "patient_note",
  resourceId: noteId,
  // ❌ Never include the note content itself
});
```

### 5. No PHI in logs (anywhere)

```typescript
// ❌ NEVER
console.log("Created note for", patient.name, "with diagnosis", note.diagnosis);

// ✅ ALWAYS
console.log("note.created", { noteId: note.id, orgId: note.orgId });
```

Allowed log fields: IDs, timestamps, error codes, request IDs, action verbs.
Forbidden log fields: names, DOBs, emails, phones, SSNs, addresses, diagnoses, medications, free-text clinical content.

### 6. Stable error codes (no stack traces leaked)

```typescript
// ❌ NEVER
catch (err) {
  return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
}

// ✅ ALWAYS
catch (err) {
  const requestId = crypto.randomUUID();
  console.error("note.create.failed", { requestId, errorCode: err.code });
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Request failed", requestId } },
    { status: 500 }
  );
}
```

Stable error codes used across the app:
- `UNAUTHORIZED` (401)
- `MFA_REQUIRED` (403)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INVALID_INPUT` (422)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)
- `SERVICE_UNAVAILABLE` (503)

### 7. Fail closed

```typescript
// ❌ NEVER
const featureEnabled = await getFeatureFlag(orgId, "rating_scales") ?? true;

// ✅ ALWAYS
const featureEnabled = await getFeatureFlag(orgId, "rating_scales") ?? false;
```

If the check fails, the user does not get access.

### 8. Rate limit auth and PHI routes

```typescript
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const limited = await rateLimit(req, { window: "1m", max: 100 });
  if (limited) {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }
  // ...
}
```

Defaults:
- Auth routes: 10/minute per IP
- PHI routes: 100/minute per user
- Public webhooks: 1000/minute per source IP (with HMAC validation)

### 9. Secrets never in code

- No API keys, tokens, passwords in code or `.env` committed files
- `.env.example` has only stub names, no real values
- All secrets in Vercel env vars or Azure Key Vault
- Rotation schedule: 90 days for non-customer-facing, 30 days for sensitive (Supabase service role, PHI encryption keys)

## Pre-merge mental checklist

Before opening a PR, the agent runs through this list:

- [ ] Every API endpoint validates input with Zod
- [ ] Every API endpoint has an explicit auth check
- [ ] Every PHI route checks MFA
- [ ] Every new table has RLS with USING + WITH CHECK
- [ ] Every PHI access is audit-logged
- [ ] No `console.log` contains PHI
- [ ] No `error.stack` returned to client
- [ ] Feature flag added, defaults to OFF
- [ ] Rate limits applied
- [ ] No secrets in commit
- [ ] TypeScript strict passes with zero `any`
- [ ] All new code has ≥80% test coverage
- [ ] RLS tests written for every new table

If any box is unchecked, the PR is not ready.

## Forbidden patterns (auto-reject)

- Raw SQL string interpolation (use parameterized queries)
- `eval()`, `Function()`, `vm.runInThisContext()`
- `dangerouslySetInnerHTML` (React) without DOMPurify
- `document.write`
- Direct `fetch()` to user-controlled URLs (SSRF risk)
- Catching errors and silently swallowing them
- `// @ts-ignore` or `// @ts-expect-error` without a comment explaining why
- `any` type without a comment explaining why

## On `security/detect-object-injection` warnings

ESLint's `security/detect-object-injection` rule flags `obj[variableKey]` access. It catches a real attack class (prototype pollution, arbitrary property access from untrusted input). It also has frequent false positives in framework code where the key is internal-to-the-codebase.

**An inline disable is acceptable IF ALL THREE hold:**

1. The index variable originates from **code-defined literals or values you control** — not user input. Example: `specialRules.suicideRiskItem = "q9"` set in `phq9.ts` source.
2. The data being indexed is **Zod-validated upstream** at the API layer.
3. The result is **re-validated** before branching (existence check, range check, type guard).

**Comment template — three lines, always together:**

```typescript
// Why: <var> is a literal value defined by <where>. Not user input.
// <data> is Zod-validated upstream; value is re-checked below.
// eslint-disable-next-line security/detect-object-injection
const value = responses[suicideItem];
```

**Placement matters.** The `eslint-disable-next-line` comment must be **immediately** before the offending line. Comments between the disable and the line break the disable — ESLint applies to the literal next non-comment line.

**Never disable the rule globally.** It catches real bugs in feature code where the input chain isn't this clean.

## Defense-in-depth at classifier boundaries

When code makes a clinical decision (risk classification, severity labeling, flag-emission), include defensive guards in the classifier even when upstream validation should make them unreachable.

Example from C-SSRS's risk classifier:
```typescript
// MODERATE: item 6 (behavior) when the behavior was more than 3 months ago.
if (view.item6 && item6Behavior !== undefined && item6Behavior !== "within_3_months") {
  risk = maxRisk(risk, 2);
}
```

The `item6Behavior !== undefined` check is technically redundant — `validateCssrsResponses` already throws on item 6 = Yes without `behaviorTimeframe`. But the redundant guard:

1. Documents the invariant at the classifier site (a reader doesn't have to trust upstream validation to understand the boundary)
2. Survives future refactors where upstream validation might move, change, or be bypassed by a new caller
3. Costs nothing at runtime — a single `!== undefined` check
4. Fails gracefully (`undefined` falls through to "no risk increment") rather than silently misclassifying

**Pattern:** clinical classifiers treat their inputs as untrusted, even when upstream validation should have caught the bad case. The boundary check + the classifier check are two independent layers; neither is sufficient alone.

This is the same instinct as fail-closed auth — defense in depth at the most consequential decision points.

## See also

- `rls-testing` — how to test RLS policies
- `api-endpoints` — full API route pattern
- `security-review` — how to do a security review of someone else's code
