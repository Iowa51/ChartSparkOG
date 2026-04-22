Execute the following fix queue in order. Do NOT skip ahead. Stop and report after each numbered item is complete.

P1-1: Run a full repo sweep for ALL hardcoded user/demo fixtures. Grep for "Sarah", "Sarah K", "Dr. Sarah", "demo user", any fixture names, mock patient names in production code paths. List every finding with file:line BEFORE changing anything. Then replace with real authenticated user context.

P1-2: Add a feature flag SIDECAR_READY defaulting to false. When false, the End Session button is disabled with tooltip "AI scribe unavailable in this environment." Also have /api/agent/complete-session return 503 with a clear JSON error when the flag is false. Do NOT try to wire the Azure pipeline today.

P1-3: Add DELETE handler to /api/encounters/[id]. Match auth and audit-log pattern from existing PATCH handler.

P1-4: Add server-enforced rate limiting to /api/auth/login directly in the route handler. Do not rely on the client calling check-lockout. Use the existing Upstash-backed limiter with failClosed (NOT failOpen) for this route specifically.

Commit each numbered fix as a separate commit with --no-verify. After all four are done, push to main and wait for my verification before moving to P2.