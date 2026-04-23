# Fix Calendar Page — Fetch real appointments, wire up creation, replace browser alerts

File: `src/app/(app)/calendar/page.tsx`

## Problem
1. The `appointments` state is initialized as an empty array and NEVER populated from the API. The page only fetches patients, not appointments.
2. The "Schedule New Appointment" form uses a raw browser `alert()` on submit and does NOT actually POST to the API.
3. Two other buttons ("Edit" and "Cancel appointment") also use raw `alert()` calls.
4. Because appointments are never fetched, the calendar grid is always empty and no appointments show on the telehealth page either.

## What to do

### A. Fetch real appointments from the API
Add a second useEffect (or combine with the existing one) that fetches from `GET /api/appointments`. The API returns `{ appointments: [...] }` where each appointment has:
- `id` (UUID)
- `patient_id`
- `appointment_datetime` (ISO string)
- `appointment_type`
- `duration_minutes`
- `status`
- `notes`
- `is_telehealth`
- `patient: { id, first_name, last_name }`

Map the API response into the existing `Appointment` interface format that the calendar grid expects. Check what fields the `Appointment` interface and `getAppointmentsForDate()` use (especially the `date` field format) and make sure the mapping matches. Re-fetch appointments after creating or cancelling one.

### B. Wire up real appointment creation
The form's `onSubmit` currently does: `alert("Appointment scheduled successfully!"); setShowNewAppt(false);`

Replace with a real API call:
- POST to `/api/appointments` with: `patient_id`, `appointment_datetime` (ISO string), `duration_minutes` (number), `appointment_type`, `notes`, `is_telehealth: true`
- On success: close the modal, show a styled success toast, re-fetch the appointments list
- On error: show a styled error toast

### C. Replace all `alert()` calls with styled toasts
Follow the exact toast pattern from `src/app/(app)/notes/[id]/page.tsx`:
```jsx
const [successMessage, setSuccessMessage] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

{successMessage && (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{successMessage}</span>
        </div>
    </div>
)}
```
Import `CheckCircle2` and `AlertTriangle` from lucide-react. Auto-clear after 4 seconds.

Replace:
- "Appointment scheduled successfully!" alert → styled success toast
- "Edit functionality coming soon!" alert → styled info toast
- "Appointment cancelled." alert → real PATCH to `/api/appointments/[id]` setting `status: "cancelled"`, then styled toast and re-fetch

### D. Do not
- Do not change any other files
- Do not break existing calendar UI layout or styling
- Do not add demo/fixture data
- Do not remove the patient fetch logic

Commit with: `git commit --no-verify -m "fix: calendar fetches real appointments, creates via API, styled toasts"`
Push with: `git push origin main --no-verify`