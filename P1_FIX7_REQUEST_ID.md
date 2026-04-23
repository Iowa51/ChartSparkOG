# P1_FIX7_REQUEST_ID.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

Middleware does not generate or forward a request ID. When production incidents occur, there is no way to correlate entry logs, DB mutations, and downstream API calls across a single request path.

## Fix

### Step 1: Read current middleware

Read src/middleware.ts completely. Understand what it does today.

### Step 2: Add request-id generation

In the middleware, at the top of the handler before any other logic:

1. Check for an incoming x-request-id header (caller may provide one)
2. If not present, generate one using crypto.randomUUID()
3. Set the request ID on the response headers: x-request-id
4. Pass the request ID forward via a custom header on the request object so downstream route handlers can read it

### Step 3: Create a helper to read request ID

Create src/lib/utils/request-id.ts:

```typescript
export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || 'unknown';
}
```

### Step 4: Wire into audit logging

Read src/lib/security/audit-log.ts. The logAuditEvent function likely already receives request metadata. Add request_id to the details object if a request is available in the context. Do NOT make this a required field — just include it when available.

### Step 5: Wire into safe-logger

Read src/lib/logging/safe-logger.ts. If it has a structured logging function, add request_id as an optional field. If it just wraps console, leave it alone.

## Important

- middleware.ts runs on the edge runtime — only use standard Web APIs (crypto.randomUUID is available in edge)
- Do NOT break any existing middleware logic (auth checks, CSP headers, etc.)
- The request-id must be set BEFORE any redirects or early returns so it appears on error responses too

## After

npm run build. Commit:
git add -A
git commit -m "fix: P1 add x-request-id propagation through middleware and audit logging" --no-verify

Report: files created, files changed, SHA.