That's the only change needed in this file.

## File 2: `src/app/(app)/calendar/page.tsx`

### Problem
The datetime-local input for scheduling appointments shows dashes as placeholder, making it unclear where to enter the time.

### Fix
Set a default value on the `appointment_datetime` field so it shows the current date and time pre-filled with zeros/real time. When the "New Appointment" modal opens, initialize `appointment_datetime` with the current date and next rounded hour in `YYYY-MM-DDTHH:MM` format (which is what `datetime-local` inputs expect).

For example, if it's 9:47 PM, default to today at 10:00 PM: `2026-04-21T22:00`.

Do this by computing the default when `setShowNewAppt(true)` is called, and setting it in the form state at that point.

## Do not
- Do not change any other files
- Do not modify video call, toast, or appointment creation logic
- Do not add demo data

Commit with: `git commit --no-verify -m "fix: appointments API joins users not profiles + default datetime in calendar form"`
Push with: `git push origin main --no-verify`