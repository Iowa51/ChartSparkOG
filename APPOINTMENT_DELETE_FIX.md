# Let clinicians delete their own appointments

File: `src/app/api/appointments/[id]/route.ts`

The DELETE handler currently restricts deletion to ADMIN and SUPER_ADMIN roles. Change it so that any authenticated user can delete an appointment where they are the assigned provider (provider_id matches the logged-in user's ID). Admins and super admins can still delete any appointment in their organization.

Keep the organization_id check so users can only delete within their own org.

Do not change GET or PATCH handlers. Do not change any other files.

Commit: `git commit --no-verify -m "fix: let clinicians delete their own appointments"`
Push: `git push origin main --no-verify`