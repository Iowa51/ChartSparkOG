# Fix Telehealth Upcoming Sessions

File: `src/app/(app)/telehealth/page.tsx`

In the useEffect that splits appointments into upcoming vs past, change the filter. Currently `aptDate < now` sends same-day past-time appointments to history. Clinicians need to see all of today's scheduled appointments in Upcoming Sessions so they can start late calls.

Change the split logic from:
- completed/cancelled → past
- aptDate < now → past
- everything else → upcoming

To:
- completed/cancelled → past
- today (any time) OR future → upcoming, with status "ready" if time has passed or within 15 min, "scheduled" otherwise
- past days that aren't completed → past

Reuse the existing `isToday` helper already in this file. Pass `apt.appointment_datetime` to it.

Do not change any other files or modify stats/video/API logic.

Commit: `git commit --no-verify -m "fix: telehealth shows all todays appointments as upcoming"`
Push: `git push origin main --no-verify`