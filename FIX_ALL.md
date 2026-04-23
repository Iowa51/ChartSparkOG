# Fix telehealth token + calendar appointment management

## Fix 1: Telehealth join session token (4 files)

The create-room API sets a provider session token via HTTP-only cookie but join-session never receives it due to SameSite cookie restrictions on Vercel. Both join-session requests return 403.

Fix by passing the token via request body as a fallback:

1. `src/app/api/telehealth/create-room/route.ts` — In BOTH demo and production response blocks, add `providerSessionToken: providerSessionTokenRef` to the JSON response body alongside existing fields.

2. `src/app/api/telehealth/join-session/route.ts` — In the POST dispatcher, before checking the cookie, read the request body for a `providerSessionToken` string. If present and length >= 32, use it as the provider token. Update `handleProviderJoin` to accept an optional `tokenOverride` parameter and use it instead of the cookie when provided.

3. `src/components/telehealth/DailyVideoCall.tsx` — Add optional `providerSessionToken` prop. In the loadSession fetch, include it in the body: `body: JSON.stringify({ providerSessionToken })`.

4. `src/app/(app)/telehealth/page.tsx` — Save `data.providerSessionToken` from create-room response into callSession state. Add `providerSessionToken?: string` to CallSession interface. Pass it to DailyVideoCall as a prop.

## Fix 2: Calendar day click shows all appointments (1 file)

`src/app/(app)/calendar/page.tsx` — When a calendar day has more than 2 appointments it shows "+N more" but clicking it does nothing. Make the "+N more" text and the entire day cell clickable. When clicked, switch to list view filtered to that day, or open a modal/popover showing all appointments for that day with their details and action buttons.

## Fix 3: Appointment editing (1-2 files)

`src/app/(app)/calendar/page.tsx` — The Edit button currently shows an info toast saying "Edit functionality coming soon." Replace it with a real edit modal. When the user clicks Edit on an appointment, open a modal pre-filled with the appointment's current data (patient, date/time, duration, type, notes). On save, send a PATCH request to `/api/appointments/[id]` with the updated fields. On success, show a styled toast and refresh the appointments list. Check that `src/app/api/appointments/[id]/route.ts` has a PATCH handler — if not, add one that updates the allowed fields.

## Do not
- Do not remove existing cookie logic, just add body-based fallback
- Do not add demo/fixture data
- Do not break existing video call or patient join flow

Commit: `git commit --no-verify -m "fix: telehealth token fallback + calendar day view + appointment editing"`
Push: `git push origin main --no-verify`