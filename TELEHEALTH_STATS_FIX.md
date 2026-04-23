# Fix Telehealth Stats Cards — Clickable + Timezone-Aware Resets

File: `src/app/(app)/telehealth/page.tsx`

## Requirements

### 1. Make cards clickable
- **Today Sessions** → link to `/calendar?view=day`
- **Weekly Sessions** → link to `/calendar?view=week`
- **Patients** → link to `/patients`
- **Avg. Duration** → not clickable (display only), but wrap in a subtle tooltip or label saying "Resets daily at midnight"

Use Next.js `<Link>` for navigation. Make the clickable cards show a hover effect (e.g., `hover:border-primary hover:shadow-md cursor-pointer transition-all`).

### 2. Timezone-aware date filtering for stats
All stats must be computed relative to the clinician's LOCAL timezone, not UTC. Use the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` to get the clinician's timezone.

- **Today Sessions**: count appointments where `appointment_datetime` falls within today (midnight to midnight) in the clinician's local timezone
- **Weekly Sessions**: count appointments where `appointment_datetime` falls within the current week (Monday 00:00 to Sunday 23:59) in the clinician's local timezone
- **Avg. Duration**: average `duration_minutes` of all appointments from the current day (today only) in the clinician's local timezone. Show `--` if no appointments today
- **Patients**: count of unique `patient_id` values from the current week in the clinician's local timezone

All these naturally reset at midnight because the filtering is date-based against the local clock.

### 3. Implementation approach
- The component already fetches from `/api/appointments` in a useEffect. Use the raw API response to compute these stats.
- Create a helper function like `isToday(dateStr)` and `isThisWeek(dateStr)` that compare against the local timezone.
- For "this week" use Monday as the start of the week.
- Do NOT add any new API calls.
- Do NOT modify any other files.

### 4. Do not
- Do not add demo/fixture/hardcoded data
- Do not change the video call functionality
- Do not change how appointments are fetched

Commit with: `git commit --no-verify -m "fix: telehealth stats clickable + timezone-aware daily/weekly resets"`