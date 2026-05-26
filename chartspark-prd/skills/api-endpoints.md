---
name: api-endpoints
description: Write secure, validated, audited API endpoints for ChartSparkOG and its sidecars. Use whenever you create a new API route (Next.js App Router or Express). Covers Zod validation, auth checks, MFA enforcement, audit logging, error responses, rate limiting, and the canonical handler structure.
---

# API Endpoint Pattern

## The five layers of every PHI route

Every API endpoint that touches PHI runs through these five layers, in this order:

1. **Rate limit** — drop excess requests before doing work
2. **Auth check** — verify JWT, refuse if missing/invalid
3. **MFA check** — refuse if user hasn't MFA-verified this session
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
import { auditLog } from "@/lib/security/audit-log";
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

  // Business logic
  try {
    const { data: note, error: insertErr } = await supabase
      .from("patient_notes")
      .insert({
        org_id: user.orgId,
        patient_id: parsed.data.patientId,
        note_text: parsed.data.noteText,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) {
      const requestId = crypto.randomUUID();
      console.error("note.create.failed", {
        requestId,
        orgId: user.orgId,
        errorCode: insertErr.code,
      });
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Could not create note", requestId } },
        { status: 500 }
      );
    }

    // Audit log
    await auditLog({
      actorId: user.id,
      orgId: user.orgId,
      action: "patient.note.created",
      resourceType: "patient_note",
      resourceId: note.id,
    });

    return Response.json({ id: note.id }, { status: 201 });
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
import { auditLog } from "../lib/audit-log";

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

    const { data: note, error } = await supabase
      .from("patient_notes")
      .insert({
        org_id: req.user!.orgId,
        patient_id: parsed.data.patientId,
        note_text: parsed.data.noteText,
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      actorId: req.user!.id,
      orgId: req.user!.orgId,
      action: "patient.note.created",
      resourceType: "patient_note",
      resourceId: note.id,
    });

    res.status(201).json({ id: note.id });
  } catch (err) {
    next(err);
  }
});

export default router;
```

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

## Helper file structure

Every sidecar/app uses the same helper layout:

```
src/lib/
├── auth/
│   └── require-user.ts       (returns user or null)
├── security/
│   ├── rate-limit.ts         (Upstash Redis-backed)
│   ├── audit-log.ts          (writes to OG audit_log)
│   └── mfa.ts                (verifyMfa(user) -> boolean)
├── supabase/
│   ├── server.ts             (server-side client with cookies)
│   └── service-role.ts       (service role, isolated use)
└── validation/
    └── schemas.ts            (shared Zod schemas)
```

## See also

- `security-first` — the merge gate (rate limit, validation, audit log all live there)
- `rls-testing` — verify the database layer enforces what your API layer assumes
- `sidecar-scaffolding` — where these routes go in a new sidecar
