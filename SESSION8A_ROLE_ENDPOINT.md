# SESSION8A_ROLE_ENDPOINT.md

Read CLAUDE.md first. One new API route, ONE commit.

## Context

No endpoint exists to change a user's role. The existing PATCH at /api/admin/users/[userId]/route.ts explicitly excludes role from AdminUserUpdateSchema. We need a dedicated role-change endpoint.

## Task: Create PATCH /api/admin/users/[userId]/role

File to create: src/app/api/admin/users/[userId]/role/route.ts

### Request body (Zod):

RoleChangeSchema = z.object({
  new_role: z.enum(['USER', 'ADMIN', 'AUDITOR']),
  reason: z.string().min(5).max(500),
});

SUPER_ADMIN is excluded from enum — cannot be granted via API.

### Authorization:

- Only SUPER_ADMIN and ADMIN can call this (use withAuth requiredRole)
- No one can change their own role — 403
- Target must exist and be in same org (unless caller is SUPER_ADMIN)

### Role hierarchy:

SUPER_ADMIN can change any non-SUPER_ADMIN user to USER, ADMIN, or AUDITOR. Cannot demote another SUPER_ADMIN.

ADMIN can only change USER to AUDITOR or AUDITOR to USER. Cannot touch ADMIN or SUPER_ADMIN. Cannot grant ADMIN.

### Implementation:

1. Parse body with RoleChangeSchema
2. Auth with withAuth requiredRole: ['SUPER_ADMIN', 'ADMIN']
3. Fetch target user by userId — verify exists
4. Check org scoping (same org unless SUPER_ADMIN)
5. Check self-change prevention
6. Check role hierarchy
7. Update role in Supabase. Check if trigger trg_prevent_users_role_escalation exists on users table. If yes, use service role client to bypass it. Our API checks are the authorized path.
8. Audit log the change with logAuditEvent using eventType USER_ROLE_CHANGE, riskLevel HIGH, details including target_user_id, previous_role, new_role, reason
9. Return 200 { success: true, user: { id, role: new_role } }

### Errors: 400 bad body, 403 unauthorized, 404 not found, 500 db error

### Rate limiting:

If withRateLimit or similar exists, apply it (max 20/hr). If not, add TODO comment.

## After

npm run build. Commit:
git add -A
git commit -m "feat: add PATCH /api/admin/users/[userId]/role with hierarchy enforcement and audit logging" --no-verify

Report: file path, how trigger bypass is handled, whether rate limiting applied, edge cases found, SHA.