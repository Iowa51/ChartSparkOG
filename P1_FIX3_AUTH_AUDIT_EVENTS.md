# P1_FIX3_AUTH_AUDIT_EVENTS.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

logAuditEvent throws before writing when resourceType is missing. Two auth routes call it without resourceType:
- src/app/api/auth/record-attempt/route.ts (~lines 93-102) logs LOGIN_SUCCESS/LOGIN_FAILURE
- src/app/api/auth/signout/route.ts (~lines 28-37) logs LOGOUT

Those calls fail silently because the routes swallow the exception. Result: zero auth audit trail in the database for logins, failed logins, and logouts — a HIPAA compliance gap.

## Fix

### Step 1: Read the current state

Read src/lib/security/audit-log.ts and find where it validates resourceType. Understand the exact check.

Then read:
- src/app/api/auth/record-attempt/route.ts
- src/app/api/auth/signout/route.ts

Find every logAuditEvent call that is missing resourceType.

### Step 2: Choose the fix approach

Two options — pick whichever is cleaner:

**Option A (preferred):** Make resourceType optional for auth events. In audit-log.ts, if resourceType is missing and the eventType is one of LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, MFA_SUCCESS, MFA_FAILURE, or similar auth events, default resourceType to 'auth_session'. This way existing call sites work without changes.

**Option B:** Add resourceType: 'auth_session' to every auth-related logAuditEvent call. More explicit but more files to touch.

### Step 3: Verify no other call sites are affected

Grep the entire src/ directory for logAuditEvent calls. For each one, check if resourceType is present. List any others that are missing it.

### Step 4: Verify the fix works

After the fix, trace the code path mentally: when record-attempt calls logAuditEvent with LOGIN_SUCCESS and no resourceType, does the event now survive the validation check and get written to audit_logs?

## After

npm run build. Commit:
git add -A
git commit -m "fix: P1 auth audit events now persist by defaulting resourceType to auth_session" --no-verify

Report: files changed, which option chosen, any other call sites found missing resourceType, SHA.