# P1_FIX4_SUBMISSIONS_SERVER.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

The admin submissions page at src/app/(admin)/admin/submissions/page.tsx uses the browser Supabase client to directly approve or reject submissions. The mutations only filter by submission id with no server-side auth, no org scoping on the write, and no audit logging. A compromised browser or devtools replay could mutate any submission.

## Fix

### Step 1: Read the current state

Read:
- src/app/(admin)/admin/submissions/page.tsx (find the approve/reject handlers around lines 96-129)
- src/app/api/auditor/batch-action/route.ts (existing auditor action route for reference)
- Check if /api/admin/submissions/ or /api/managed-billing/claims/[id]/ has any existing approve/reject endpoints

### Step 2: Create server endpoint

Create: src/app/api/admin/submissions/[id]/review/route.ts

PATCH handler that accepts:
ReviewSchema = z.object({
action: z.enum(['approved', 'rejected']),
reason: z.string().min(3).max(500).optional(),
});

The endpoint must:
1. Use withAuth with requiredRole: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR']
2. Fetch the submission by id, verify it belongs to caller's organization
3. Validate the status transition is legal (only pending/flagged submissions can be approved/rejected)
4. Update the submission status
5. Log an audit event with eventType SUBMISSION_REVIEW, resourceType 'submission', details including previous status, new status, and reason
6. Return { success: true, submission: updated row }

### Step 3: Update the admin page

Replace the direct Supabase client mutations in src/app/(admin)/admin/submissions/page.tsx with fetch calls to the new endpoint:

- approve handler: fetch PATCH /api/admin/submissions/[id]/review with { action: 'approved' }
- reject handler: fetch PATCH /api/admin/submissions/[id]/review with { action: 'rejected', reason }

Remove the browser Supabase client import if it's no longer used for mutations on this page. Keep it if still used for the initial data fetch (reads through RLS are acceptable).

### Important

- Match existing API patterns in the codebase
- Do not break the existing auditor batch-action route
- The page may still read data via browser client — that's fine for display. Only mutations must go through the server.

## After

npm run build. Commit:
git add -A
git commit -m "fix: P1 admin submissions approve/reject via server endpoint with org check and audit logging" --no-verify

Report: files created, files changed, whether existing endpoints were found, SHA.