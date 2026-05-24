# Phase 2 — Visual Smoke Test Results

Branch: `design/tebra-redesign`
Date: 2026-05-24
Dev server: `npm run dev` (Next 16.1.6 + Turbopack) on `http://localhost:3000`

## 1. Command used

```
npx playwright test --config playwright.visual.config.ts
```

Result: `2 passed (1.6m)` — both viewport tests completed without throwing.

## 2. Results summary

```
PHASE 2 VISUAL SMOKE — RESULTS

Desktop (1440x900):
  /dashboard           ↻ login redirect (different size from /login but
                          render differed only briefly before DemoAuthGuard
                          fired; not the real authenticated dashboard)
  /patients            ↻ login redirect (byte-identical to /login)
  /notes               ↻ login redirect (byte-identical to /login)
  /billing             ↻ login redirect (byte-identical to /login)
  /settings            ↻ login redirect (byte-identical to /login)
  /admin               ↻ login redirect (byte-identical to /login)
  /login               ✓ rendered
  /register            ✓ rendered
  /pricing             ✓ rendered
  /forgot-password     ✓ rendered

Mobile (390x844):
  /dashboard           ↻ login redirect (byte-identical to /login)
  /patients            ↻ login redirect (byte-identical to /login)
  /notes               ↻ login redirect (byte-identical to /login)
  /billing             ↻ login redirect (byte-identical to /login)
  /settings            ↻ login redirect (byte-identical to /login)
  /admin               ↻ login redirect (byte-identical to /login)
  /login               ✓ rendered
  /register            ✓ rendered
  /pricing             ✓ rendered
  /forgot-password     ✓ rendered

Demo-mode bypass:    ✗ did not bypass auth — DemoAuthGuard still
                        redirected every auth-gated route to /login.
Total screenshots:   20 PNG files saved to screenshots/phase2/
                       desktop/ (10 PNGs + _summary.json)
                       mobile/  (10 PNGs + _summary.json)
```

### How we know demo mode didn't take effect

Both `_summary.json` files report HTTP 200 for every route — that's not enough on its own, because Next.js returns 200 for a soft client-side redirect. SHA-1 hashes of the rendered screenshots make it conclusive:

**Desktop:**
```
49C7DAFE9C41 → login.png, admin.png, billing.png, notes.png, patients.png, settings.png
19794438BD5D → dashboard.png   (different bytes but visually a redirect transient)
772942243993 → forgot-password.png   (real page)
903320D201C5 → pricing.png             (real page, 532 KB)
D02D8B21762D → register.png            (real page)
```

**Mobile:**
```
5EEC7F539F2F → login.png, admin.png, billing.png, dashboard.png, notes.png, patients.png, settings.png
CA8813DE9223 → forgot-password.png
C3CB1A08E09A → pricing.png
3F89C61268BD → register.png
```

Six of the six auth-gated routes on desktop (and seven on mobile, counting `/dashboard`) are byte-for-byte identical to `login.png`. The auth bypass did not work — these are not screenshots of the Tebra redesign in its authenticated shell, they are screenshots of the login screen.

## 3. Path to screenshots

```
C:\Users\joman\OneDrive\Desktop\ChartSparkOG\screenshots\phase2\
  desktop\
    _summary.json
    admin.png, billing.png, dashboard.png, forgot-password.png,
    login.png, notes.png, patients.png, pricing.png, register.png,
    settings.png
  mobile\
    _summary.json
    (same 10 PNGs)
```

The folder is `.gitignore`d (`screenshots/`).

## 4. Errors / deviations encountered

1. **Spec spread of `devices["iPhone 14"]` inside `test.describe()` failed Playwright's worker-config rule.** Playwright errored with `Cannot use({ defaultBrowserType }) in a describe group, because it forces a new worker.` Minimal fix applied in [tests/visual/phase2-smoke.spec.ts](tests/visual/phase2-smoke.spec.ts:71): destructure and drop `defaultBrowserType` from the device object before spreading. UA / `isMobile` / `hasTouch` / `viewport` (the parts that matter for mobile fidelity) are preserved. This is the only deviation from the prescribed spec.

2. **Stale dev server from the earlier Step D smoke test.** A previous `npm run dev` had been orphaned (only the bash wrapper was killed, the Node child kept running on port 3000, IPv6-only, non-responsive). Detected when both `curl` and `Invoke-WebRequest` against `http://127.0.0.1:3000/login` timed out at 90s. Resolved by `Stop-Process -Id 7232 -Force`; user restarted `npm run dev` cleanly. First-hit compile of `/login` then took ~46s before responding 200.

3. **Demo mode bypass did not work.** This is the headline finding above — not a script error, but a real auth/test-harness problem worth flagging. See section 5.

No script crashes, no exceptions, no failed assertions. Both Playwright tests reported `ok`.

## 5. What actually rendered vs. what fell back to login

**Rendered with their real UI (not gated):**
- `/login`, `/register`, `/pricing`, `/forgot-password` — desktop and mobile.

**Fell back to the login screen (every auth-gated route):**
- `/dashboard`, `/patients`, `/notes`, `/billing`, `/settings`, `/admin` — desktop and mobile.

In other words: **none of the auth-gated screens in the screenshot set actually exercise the new Tebra shell.** They are not useful for reviewing the Phase 2 redesign's authenticated UI — only the public pages are.

### Why the bypass likely failed

The `enableDemoMode()` helper sets `demoMode=true` in both a `localhost` cookie and `localStorage`. That works only if `DemoAuthGuard` (in `src/components/auth/DemoAuthGuard.tsx`) treats either of those as a valid session. From the Phase 1 audit, the only thing the codebase does with `demoMode` is `localStorage.removeItem("demoMode")` and a `document.cookie = "demoMode=; ..."` cookie-clear in the logout handlers — i.e. the codebase only ever *clears* this flag, it doesn't appear to *check* it server-side. The middleware / DemoAuthGuard probably gates on a real Supabase session cookie (`sb-…-auth-token`), not on `demoMode`.

To capture authenticated screenshots in a future smoke run, options are:
- **(A) Real auth flow:** drive Playwright through a real `/login` form submit with seeded credentials, then capture (slow, brittle, needs test credentials in env).
- **(B) Mint a Supabase session in `addInitScript`:** read a test refresh token from env, call the Supabase JS client to set the session before navigating. Requires the test account to exist.
- **(C) Bypass header / test-only middleware skip:** add a dev-only "trust this header" path in middleware that DemoAuthGuard honours when an env var is set. Cleanest for CI, requires source change (out of scope for this isolated task).

This run does its job as far as *verifying the public-facing surface and the Playwright plumbing*. To actually visually QA the Phase 2 shell, we need one of A / B / C wired up next.

## 6. What I'd want next

- Decide on (A), (B), or (C) above and wire it into a follow-up smoke spec.
- Consider adding `/auditor`, `/super-admin`, and a Notes detail route (`/notes/[id]`) to the auth route list once the bypass works, since those are the surfaces most affected by Phase 2's `CSShell` rewrite.
- Mobile pricing screenshot is ~2 MB; if that gets unwieldy, downgrade to JPEG or set `quality` on `page.screenshot()`.
