# SESSION7_DB_MIGRATION_CLEANUP.md

Read CLAUDE.md first. Two tasks, ONE commit.

---

## Context

The original migration at supabase/migrations/20260125120003_user_invitations.sql defines two functions:
1. expire_old_invitations() — standalone function at line ~157
2. check_expired_invitations() — trigger function at line ~184 that calls PERFORM expire_old_invitations()

The plan from OBSERVABILITY_ROADMAP.md was to inline the expiration logic directly into check_expired_invitations() and drop the standalone expire_old_invitations() function. This was applied in the live Supabase dashboard on 2026-04-17 but NO migration file was ever created to version-control it.

---

## Task 1: Read the current state

1. Read supabase/migrations/20260125120003_user_invitations.sql completely.
2. Find the expire_old_invitations() function body (the UPDATE + DELETE logic).
3. Find the check_expired_invitations() function body.
4. Understand what check_expired_invitations does: it runs on INSERT to the invitations table, checks if the new invitation is already expired, and calls expire_old_invitations() to clean up old ones.

---

## Task 2: Write a new migration file

Create a new migration file at:
supabase/migrations/20260423000000_inline_expiration_drop_orphan.sql

The migration must do these things IN ORDER:

### Part A: Replace check_expired_invitations with inlined version

CREATE OR REPLACE the check_expired_invitations() function so that instead of calling PERFORM expire_old_invitations(), it contains the expiration logic directly (the UPDATE setting status='expired' for old pending invitations, and the DELETE for very old expired ones). Copy the exact SQL logic from expire_old_invitations() into the body of check_expired_invitations().

Keep the same trigger behavior: runs BEFORE INSERT on invitations, returns NEW.

### Part B: Drop the orphaned function

DROP FUNCTION IF EXISTS expire_old_invitations();

### Part C: Add a comment

Add a SQL comment at the top of the file explaining:
- Why: expire_old_invitations() was orphaned after inlining its logic into check_expired_invitations()
- When: originally applied via Supabase dashboard on 2026-04-17, now version-controlled
- What: this migration makes the repo match production

---

## Important

- Do NOT modify the original migration file (20260125120003). That represents the original state. The new migration represents the change.
- The new migration must be IDEMPOTENT — safe to run even if the dashboard change was already applied (use CREATE OR REPLACE, DROP IF EXISTS).
- Do NOT touch any other tables, triggers, or functions.

---

## After the migration file is written

Run npm run build to confirm no app breakage (migration files don't affect build, but verify anyway).

Then commit:

git add -A
git commit -m "fix: add migration to inline expiration logic and drop orphaned function" --no-verify

Report:
- Full path of the new migration file
- The SQL content of the file (so James can review before applying)
- SHA