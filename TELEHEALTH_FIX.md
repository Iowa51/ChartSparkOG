# Fix Telehealth Stats Cards

File: `src/app/(app)/telehealth/page.tsx`

## Problem
The four stats cards at the top of the Telehealth page (Today: 2 Sessions, Weekly: 12 Sessions, Avg. Duration: 42 min, Patients: 48 Total) are hardcoded static numbers. They need to show real data computed from the appointments API response that is already being fetched in the component's useEffect.

## What to do
1. Open `src/app/(app)/telehealth/page.tsx` and find the four stats cards in the JSX (search for "Today", "Weekly", "Avg. Duration", "Patients").
2. The component already fetches from `/api/appointments` in a useEffect and splits results into `upcomingAppointments` and `sessionHistory` state arrays.
3. Add computed values derived from these arrays:
   - **Today**: count of `upcomingAppointments` where `date === "Today"`
   - **Weekly**: total count of all appointments (upcoming + past)
   - **Avg. Duration**: average of `duration_minutes` from the raw API response, or show `--` if no data
   - **Patients**: count of unique patient IDs from the raw API response
4. Replace the hardcoded numbers in the four cards with these computed values.
5. To get access to the raw API data for avg duration and unique patients, store the raw appointments array in a new state variable (e.g., `allAppointments`) alongside the existing `upcomingAppointments` and `sessionHistory`.
6. Do NOT add any new API calls. Use the data already being fetched.
7. Show `0` or `--` when there is no data, not hardcoded fake numbers.

## Do not
- Do not change any other files
- Do not modify the existing appointment fetching logic or the video call functionality
- Do not add demo/fixture data

Commit with: `git commit --no-verify -m "fix: compute telehealth stats from real appointment data"`