# Fix CSP for Daily.co + calendar appointment deletion

## Fix 1: Content Security Policy blocks Daily.co (1 file)

The browser blocks Daily.co scripts and connections due to CSP. Find where CSP headers are set — check next.config.js, next.config.mjs, middleware.ts, or any security headers config. Add these Daily.co domains to the connect-src and script-src directives:

- connect-src: add https://*.daily.co wss://*.daily.co https://*.pluot.blue wss://*.pluot.blue
- script-src: add https://*.daily.co
- frame-src: add https://*.daily.co
- worker-src: add blob:

Search the codebase for "Content-Security-Policy" or "connect-src" to find the right file. If CSP is set in middleware.ts, update it there. If in next.config headers, update there.

## Fix 2: Calendar appointment cancellation not working (1 file)

`src/app/(app)/calendar/page.tsx` — The cancel button in the appointment detail modal does not work. Check how it calls the API. It should send PATCH /api/appointments/[id] with body { status: "cancelled" }. After success, refresh the appointment list and close the modal. Make sure the fetch includes Content-Type application/json header. Also add a delete option that calls DELETE /api/appointments/[id] to fully remove an appointment, not just cancel it.

## Do not
- Do not change any telehealth token or room creation logic
- Do not remove existing security headers, only add Daily.co domains

Commit: `git commit --no-verify -m "fix: allow Daily.co in CSP + working appointment cancel/delete"`
Push: `git push origin main --no-verify`