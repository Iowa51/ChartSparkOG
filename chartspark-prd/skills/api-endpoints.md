---
name: api-endpoints
description: Write secure, validated, audited API endpoints for ChartSparkOG and its sidecars. Use whenever you create a new API route (Next.js App Router or Express). Covers Zod validation, auth checks, MFA enforcement, audit logging, error responses, rate limiting, and the canonical handler structure.
---

# API Endpoint Pattern

## Runtime layouts (read this first)

ChartSparkOG uses two API runtimes. The 5-layer pattern is identical; the file layout differs.

**Next.js App Router (OG core only):**
- Routes: `src/app/api/.../route.ts`
- Auth helper: `src/lib/auth/require-user.ts` (barrel exported as `@/lib/auth`)
- Security helpers: `src/lib/security/{rate-limit,audit-log,mfa,hmac}.ts`
- Supabase: `src/lib/supabase/server.ts` (request-scoped)

**Express sidecars (all chartspark-* sidecars):**
- Routes: `src/api/<resource>.ts`
- Auth: `src/middleware/auth.ts`
- MFA: `src/middleware/mfa.ts`
- Rate limit: `src/middleware/rate-limit.ts`
- Audit log: `src/lib/audit-log.ts` (NOT under `lib/security/`)
- Supabase: `src/lib/supabase-client.ts` (singleton, scoped service role)

If you're working in a sidecar, ignore the Next.js paths below and follow the Express example. If you're working in OG core, follow the Next.js example. Do not mix layouts — the scaffolding skill enforces the Express layout for sidecars.

## The five layers of every PHI route

Every API endpoint that touches PHI runs through these five layers, in this order:

1. **Rate limit** — drop excess requests before doing work
2. **Auth check** — verify JWT, refuse if missing/invalid
3. **MFA check** — default required; opt out per-route with documented rationale (see `Layer 3 — MFA: configurable per route` below)
4. **Input validation** — Zod schema, refuse on parse error
5. **Authorization** — verify the user can access THIS resource (org match, role check)

Only after all five pass does the business logic run.

## Next.js App Router canonical route

```typescript
// src/app/api/<resource>/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";
import { pool, withTransaction } from "@/lib/db";
import { createSupabaseClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  patientId: z.string().uuid(),
  noteText: z.string().min(1).max(50000),
});

export async function POST(req: NextRequest) {
  // Layer 1 — rate limit
  const limited = await rateLimit(req, { window: "1m", max: 100 });
  if (limited) {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }

  // Layer 2 — auth check
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // Layer 3 — MFA check
  if (!user.mfaVerified) {
    return Response.json(
      { error: { code: "MFA_REQUIRED", message: "MFA required" } },
      { status: 403 }
    );
  }

  // Layer 4 — input validation
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Invalid request body" } },
      { status: 422 }
    );
  }

  // Layer 5 — authorization (org match)
  const supabase = createSupabaseClient(req);
  const { data: patient, error: lookupErr } = await supabase
    .from("patients")
    .select("id, org_id")
    .eq("id", parsed.data.patientId)
    .single();

  if (lookupErr || !patient) {
    // Don't leak whether the patient exists in another org
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Patient not found" } },
      { status: 404 }
    );
  }
  if (patient.org_id !== user.orgId) {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  // Business logic — INSERT + audit in one transaction.
  // If the audit fails, the INSERT rolls back: the caller does not
  // get back an id whose creation could not be logged.
  try {
    const noteId = await withTransaction(pool, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO patient_notes (org_id, patient_id, note_text, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.orgId, parsed.data.patientId, parsed.data.noteText, user.id]
      );
      const id = rows[0]!.id;
      await writeAuditLog(client, {
        action: "PATIENT_NOTE_CREATED",
        entityType: "patient_note",
        userId: user.id,
        organizationId: user.orgId,
        entityId: id,
        ipAddress: req.headers.get("x-forwarded-for"),
        details: { /* metadata only — NO PHI */ },
        riskLevel: "INFO",
      });
      return id;
    });

    return Response.json({ id: noteId }, { status: 201 });
  } catch (err) {
    const requestId = crypto.randomUUID();
    console.error("note.create.exception", {
      requestId,
      orgId: user.orgId,
      errorClass: err instanceof Error ? err.constructor.name : "unknown",
    });
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Request failed", requestId } },
      { status: 500 }
    );
  }
}
```

## Express sidecar canonical route

```typescript
// src/api/notes.ts (in a sidecar)

import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { mfaRequired } from "../middleware/mfa";
import { supabase } from "../lib/supabase-client";
import { pool, withTransaction } from "../lib/db";
import { writeAuditLog } from "../lib/audit-log";

const router = Router();

const createNoteSchema = z.object({
  patientId: z.string().uuid(),
  noteText: z.string().min(1).max(50000),
});

router.post("/", authMiddleware, mfaRequired, async (req, res, next) => {
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: { code: "INVALID_INPUT", message: "Invalid request body" },
    });
  }

  try {
    // Authorization check
    const { data: patient } = await supabase
      .from("patients")
      .select("id, org_id")
      .eq("id", parsed.data.patientId)
      .single();

    if (!patient) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Patient not found" } });
    }
    if (patient.org_id !== req.user!.orgId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
    }

    // Business logic — INSERT + audit in one transaction.
    // If the audit fails, the INSERT rolls back: the caller does not
    // get back an id whose creation could not be logged.
    const noteId = await withTransaction(pool, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO patient_notes (org_id, patient_id, note_text, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [req.user!.orgId, parsed.data.patientId, parsed.data.noteText, req.user!.id]
      );
      const id = rows[0]!.id;
      await writeAuditLog(client, {
        action: "PATIENT_NOTE_CREATED",
        entityType: "patient_note",
        userId: req.user!.id,
        organizationId: req.user!.orgId,
        entityId: id,
        ipAddress: req.ip,
        details: { /* metadata only — NO PHI */ },
        riskLevel: "INFO",
      });
      return id;
    });

    res.status(201).json({ id: noteId });
  } catch (err) {
    next(err);
  }
});

export default router;
```

## Layer 3 — MFA: configurable per route

The 5-layer pattern presents MFA as Layer 3, mandatory. The implementation refines this: the auth helper is a factory that accepts options including `requireAAL2`. Most PHI routes set `requireAAL2: true` (the default). Routes that do not require MFA opt out explicitly with a documented rationale.

```typescript
// Per-route auth factory — Express sidecar
const requireAuthForReads = auth({ requireAAL2: true });        // default
const requireAuthForPublicMeta = auth({ requireAAL2: false });  // opt-out (documented)

router.get("/patients/:id", requireAuthForReads, async (req, res) => { /* ... */ });
router.get("/system/version", requireAuthForPublicMeta, async (req, res) => { /* ... */ });
```

When `requireAAL2: true` and the caller's session is not MFA-verified, the helper returns:

```typescript
{ error: { code: "MFA_REQUIRED", message: "This endpoint requires MFA" } }
```

The status is `403`. The distinct error code lets the frontend trigger an MFA challenge instead of treating the failure as a generic authorization error.

CARDINAL: `requireAAL2` defaults to `true`. Opt out only with a documented reason in the route file (e.g. `// requireAAL2: false — public version endpoint, no PHI, returns build metadata only`).

The auth factory exposes a `warmup()` method that loads `jose`, fetches JWKS, and validates configuration at process start. See `sidecar-scaffolding` skill, Step 6, for the bootstrap wiring (`auth.warmup()` chained before `app.listen`).

## Read-path pattern: SELECT + audit in one transaction

Every successful read of PHI writes one audit row inside the same transaction as the SELECT. If the audit insert fails, the entire transaction rolls back and the caller receives 500 — the response never includes data whose access could not be logged. 404 paths do NOT audit: no PHI was accessed, so there is no access to log.

```typescript
// GET handler — Next.js or Express, identical contract

const result = await withTransaction(pool, async (client) => {
  const { rows } = await client.query<EntityRow>(
    `SELECT id, org_id, /* fields */ FROM <entity> WHERE id = $1 AND org_id = $2`,
    [params.id, user.orgId]
  );
  const row = rows[0];
  if (!row) return null;  // 404 sentinel — empty txn commits (no PHI accessed, nothing to log)

  await writeAuditLog(client, {
    action: "<ENTITY>_READ",
    entityType: "<entity>",
    userId: user.id,
    organizationId: user.orgId,
    entityId: row.id,
    ipAddress: req.headers.get("x-forwarded-for"),  // Next.js — Express uses req.ip
    details: { /* metadata only — entity ids, filter shapes, counts, has_safety_flags */ },
    riskLevel: "INFO",
  });
  return composeResponse(row);
});

if (result === null) {
  return Response.json(
    { error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 }
  );
}
return Response.json(result, { status: 200 });
```

Cardinal points:

- **Audit-write failure rolls back the read.** A failed audit insert aborts the transaction; the GET returns 500. The caller never receives data whose access could not be logged.
- **404 does not audit.** When the SELECT returns no row, the transaction commits empty. No PHI was accessed; there is nothing to log.
- **`details` is metadata only.** Entity ids, filter shapes, counts, `has_safety_flags` booleans — never the PHI itself. Same constraint as the write path.
- **`riskLevel: 'INFO'` on reads.** No flag-based elevation. `HIGH` was logged at scoring time on the write path; the read of a previously-flagged result does not re-elevate.

See `sidecar-scaffolding` skill for the `public.write_audit_log` function contract and the role-granting pattern.

### What goes inside the transaction (and what doesn't)

CARDINAL: If it cannot fail because of database state, it runs outside the transaction.

Inside the transaction (state-mutating database work, or reads tied by audit invariant):
- `INSERT`, `UPDATE`, `DELETE`
- RPC to SECURITY DEFINER functions that mutate state (e.g. `writeAuditLog`)
- The SELECT on the entity being audited (the row read and the row logged must be the same row)

Outside the transaction (pure computation, lookups, response shaping):
- Zod validation
- Lookup-table dispatch (e.g. `scale-registry`)
- Scoring computation (the scoring function from the registry)
- Response composition (shaping a DB row into the wire format)
- Anything that depends only on inputs already in memory

Why this matters: putting pure computation inside a transaction conflates two failure modes (data corruption vs database error) and forces failed pure logic to issue an empty `ROLLBACK`. It also holds a DB connection open during work that has no database dependency. Compute first, then enter the transaction for the state-mutating step only.

The one nuance is read paths: the SELECT on the entity being audited belongs inside the transaction so that the row identity matches the audit row. The principle is "no pure computation inside the transaction," not "no reads inside the transaction."

## List endpoints: optional filters use IS NULL OR

For list endpoints with optional filters, use NULL-aware SQL with a fixed parameter shape. Do NOT build SQL strings conditionally.

```sql
SELECT a.*
FROM <entity> a
WHERE
  a.patient_id = $1
  AND a.org_id = $2
  AND ($3::text IS NULL OR a.scale_id = $3::text)
  AND ($4::text IS NULL OR a.status = $4::text)
  AND a.administered_at >= $5
  AND a.administered_at <= $6
ORDER BY a.administered_at DESC
LIMIT $7
```

Why fixed-parameter NULL-aware SQL:

- **Fixed parameter shape.** The handler always passes seven parameters in the same positions; no placeholder arithmetic, no branch-by-branch shape variation.
- **Single auditable SQL string.** One query string to review for SQL-injection safety and index usage; no combinatorial branch expansion to mentally execute.
- **No meaningful index cost.** The query is already narrowed by indexed fields (`patient_id`, `org_id`, `administered_at`) before the optional filters apply. The planner short-circuits `$3::text IS NULL OR ...` to a constant true when the cast is null.
- **Explicit casts on parameters.** `$3::text IS NULL` makes the comparison's type unambiguous when the parameter is `null` — required by some drivers that otherwise infer the parameter type from the first non-null context.

CARDINAL: Optional filters use `IS NULL OR equality` on a fixed parameter shape. Never build SQL strings conditionally.

## Stable error codes (use these, not custom ones)

| Code | HTTP | When |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid JWT |
| `MFA_REQUIRED` | 403 | JWT valid but MFA not verified |
| `FORBIDDEN` | 403 | Authenticated but not authorized for this resource |
| `NOT_FOUND` | 404 | Resource doesn't exist (or user can't see it) |
| `CONFLICT` | 409 | Duplicate, version conflict, state machine violation |
| `INVALID_INPUT` | 422 | Zod validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error (always with `requestId`) |
| `SERVICE_UNAVAILABLE` | 503 | Downstream dependency down, feature flag off |

## What NOT to do

```typescript
// ❌ NEVER — leaks whether patient exists in another org
if (!patient) return res.status(404).json({ error: "Patient not found" });
if (patient.org_id !== user.orgId) return res.status(403).json({ error: "Wrong org" });
// An attacker can distinguish "patient doesn't exist" (404) from "patient exists in another org" (403).

// ✅ ALWAYS — same response for both
if (!patient || patient.org_id !== user.orgId) {
  return res.status(404).json({ error: { code: "NOT_FOUND", message: "Patient not found" } });
}
```

```typescript
// ❌ NEVER — leaks internals
catch (err) {
  return res.status(500).json({ error: err.message, stack: err.stack });
}

// ✅ ALWAYS — stable code + request ID for support
catch (err) {
  const requestId = crypto.randomUUID();
  console.error("operation.failed", { requestId, errorCode: err.code });
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Request failed", requestId },
  });
}
```

```typescript
// ❌ NEVER — implicit any, no validation
export async function POST(req) {
  const body = await req.json();
  return Response.json({ ok: true, data: body });
}

// ✅ ALWAYS — typed, validated
export async function POST(req: NextRequest) {
  const parsed = mySchema.safeParse(await req.json());
  if (!parsed.success) return /* 422 */;
  // ...
}
```

## Helper file structure (per runtime)

### Next.js (OG core)

```
src/lib/
├── auth/
│   ├── index.ts              (barrel — exports requireAuthenticatedUser)
│   └── require-user.ts       (returns user or null)
├── security/
│   ├── rate-limit.ts         (Upstash Redis-backed)
│   ├── audit-log.ts          (calls write_audit_log RPC)
│   ├── mfa.ts                (verifyMfa(user) -> boolean)
│   └── hmac.ts               (verify-only for webhook receivers)
├── supabase/
│   ├── server.ts             (server-side client with cookies)
│   └── service-role.ts       (service role, isolated use)
└── validation/
    └── schemas.ts            (shared Zod schemas)
```

`@/lib/auth` resolves to `src/lib/auth/index.ts`, which re-exports `requireAuthenticatedUser` from `./require-user.ts`. Other helpers are imported by full path (`@/lib/security/rate-limit`).

### Express sidecars

```
src/
├── middleware/
│   ├── auth.ts               (verifies JWT from OG, attaches req.user)
│   ├── mfa.ts                (mfaRequired middleware)
│   ├── rate-limit.ts         (per-route limits)
│   ├── request-id.ts         (X-Request-ID propagation)
│   └── error-handler.ts      (no stack traces leaked)
├── lib/
│   ├── supabase-client.ts    (scoped service role singleton)
│   ├── audit-log.ts          (calls write_audit_log RPC)
│   └── validation.ts         (Zod helpers)
└── api/
    └── <resource>.ts         (Express routers)
```

Pick the layout that matches your runtime. Do not invent a third hybrid.

## See also

- `security-first` — the merge gate (rate limit, validation, audit log all live there)
- `rls-testing` — verify the database layer enforces what your API layer assumes
- `sidecar-scaffolding` — where these routes go in a new sidecar
