# Fix calendar confirm dialog + appointment delete + telehealth layout

## Fix 1: Replace window.confirm with styled modal in calendar

File: `src/app/(app)/calendar/page.tsx`

The Delete Permanently button uses window.confirm which looks unprofessional. Replace it with a styled confirmation modal matching the pattern used in notes/[id]/page.tsx (the ConfirmModal component). Import ConfirmModal from @/components/ui/ConfirmModal. Add state for showDeleteConfirmModal. When Delete Permanently is clicked, show the ConfirmModal. On confirm, run the delete logic. Do the same for the Cancel button if it also uses window.confirm.

Also investigate why "failed to cancel appointment" happens. The cancel button sends PATCH /api/appointments/[id] with { status: "cancelled" }. Check the PATCH handler in src/app/api/appointments/[id]/route.ts to see if it validates the status value. The appointments table has a CHECK constraint: status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'). Make sure the PATCH handler allows the status field to be updated and the Zod schema includes 'cancelled' as a valid value. Search for AppointmentUpdateSchema or any Zod validation in the PATCH handler.

## Fix 2: Telehealth upcoming sessions layout

File: `src/app/(app)/telehealth/page.tsx`

The Upcoming Sessions list grows infinitely, pushing the Active Terminal section down and off screen. Fix the layout so the two columns (Upcoming Sessions and Active Terminal) sit side by side with fixed heights. Give the Upcoming Sessions list a max height with overflow-y scroll so it scrolls internally instead of stretching the page. The Active Terminal should stay visible at all times. Use something like max-h-[500px] overflow-y-auto on the appointments list container.

## Do not
- Do not change telehealth room creation or token logic
- Do not change any API endpoints except fixing the PATCH validation if needed

Commit: `git commit --no-verify -m "fix: styled delete confirm + appointment cancel fix + telehealth scroll layout"`
Push: `git push origin main --no-verify`