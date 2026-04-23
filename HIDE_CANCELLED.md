# Hide cancelled appointments from calendar and telehealth

## Fix 1: Calendar page
File: `src/app/(app)/calendar/page.tsx`

In the useEffect that fetches appointments from /api/appointments, filter out cancelled appointments before setting state. After mapping the raw response, add: `.filter(apt => apt.status !== 'cancelled')` before setting the appointments state.

## Fix 2: Telehealth page
File: `src/app/(app)/telehealth/page.tsx`

In the useEffect that fetches appointments, the existing split logic already sends cancelled appointments to the past/history section. Update it so cancelled appointments are excluded entirely — do not show them in upcoming OR history.

## Fix 3: Appointments API
File: `src/app/api/appointments/route.ts`

In the GET handler, add a filter to exclude cancelled appointments by default: `.neq('status', 'cancelled')` to the Supabase query. This way no page has to filter client-side.

## Do not
- Do not change the DELETE handler behavior (soft delete is correct for HIPAA)
- Do not change any other files

Commit: `git commit --no-verify -m "fix: hide cancelled appointments from calendar and telehealth views"`
Push: `git push origin main --no-verify`