# API Versioning

## Current Version

**v1** — all routes under `/api/` are v1. Every response carries the header:

```
X-API-Version: 1
```

This header is set by the Next.js middleware (`src/middleware.ts`) and requires no action from individual route handlers.

---

## Introducing v2

When breaking changes are needed:

1. **Mount a new router** — create route handlers under `src/app/api/v2/`. Example:
   ```
   src/app/api/v2/notes/route.ts
   src/app/api/v2/patients/route.ts
   ```

2. **Leave v1 untouched** — existing routes at `/api/notes`, `/api/patients`, etc. remain as-is for the deprecation period.

3. **Update the version header** — in `src/middleware.ts`, detect the path prefix and set the appropriate version:
   ```ts
   const version = pathname.startsWith("/api/v2") ? "2" : "1";
   next.headers.set("X-API-Version", version);
   ```

4. **Announce the new base URL** — v2 clients should call `/api/v2/...`; v1 clients keep calling `/api/...`.

---

## Deprecating v1

When v2 is stable, begin the deprecation period for v1 (minimum **6 months**):

1. **Add the deprecation header** to all v1 responses in `src/middleware.ts`:
   ```ts
   if (!pathname.startsWith("/api/v2")) {
     next.headers.set("X-API-Deprecated", "true");
     next.headers.set(
       "Sunset",
       "Sat, 01 Jan 2028 00:00:00 GMT", // replace with actual sunset date
     );
   }
   ```

2. **Communicate to consumers**:
   - Add a deprecation notice to `docs/API_REFERENCE.md`.
   - Notify API consumers via release notes and, if applicable, email.

3. **Remove v1** after the sunset date — delete the unversioned route handlers and strip the deprecation header logic from middleware.

---

## Headers Reference

| Header | Example value | Set by |
|---|---|---|
| `X-API-Version` | `1` | Middleware (all `/api/` responses) |
| `X-API-Deprecated` | `true` | Middleware (v1 responses during deprecation window) |
| `Sunset` | RFC 7231 date string | Middleware (v1 responses during deprecation window) |
