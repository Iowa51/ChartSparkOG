# BUILD_ACCEPT_INVITATION.md

## Task
Build the complete accept-invitation flow for ChartSparkOG. Currently `app.chartspark.io/accept-invitation?token=XYZ` returns 404. The invitation email links to this URL but the route does not exist. Build it end-to-end.

Read `CLAUDE.md` first for engineering standards. All work must conform to those standards.

## Scope boundaries

**IN scope for this task:**
- `GET /accept-invitation` route page (Next.js app router, server component for data fetching, client component for form)
- `POST /api/invitations/accept` API route handler
- Token validation logic
- User creation path (for new users)
- Existing-user linking path (for users with no existing org/role only)
- Rejection paths with specific error messaging
- Audit logging
- Rate limiting (failClosed)
- Atomic database operations

**OUT of scope — do NOT build:**
- Admin UI for role changes (flagged as separate blocker in `OBSERVABILITY_ROADMAP.md`)
- Multi-org support
- Role upgrade/downgrade via invitation
- Email re-send functionality
- Bulk invitation management
- Any modification to existing auth, registration, or user management code except where strictly necessary

If you find a change that seems needed outside this scope, STOP and ask before making it.

---

## Architectural decisions (all finalized — do NOT revisit)

1. **Password required** — user sets password on the accept page
2. **Show invitation details** — page displays inviter name, organization name, and role before accepting
3. **Existing-user handling: narrow linking**
   - If existing user has NO role/organization assigned → allow them to accept and link the invitation
   - If existing user already has a role in a different organization → REJECT with "contact admin" message
   - If existing user already has a role in the same organization → REJECT with "contact admin" message
4. **Sub-decision A (linking flow location):** All happens on the accept-invitation page. User signs in inline from that page if they already have an account.
5. **Sub-decision B (user in different org):** Reject
6. **Sub-decision C (user same org different role):** Reject with message pointing to admin

---

## Required user journeys

### Journey 1: New clinician accepts invitation (happy path — new user)
1. Admin invites `newclin@example.com` as Clinician
2. User clicks email link → `/accept-invitation?token=X`
3. GET request validates token server-side:
   - Token exists in `invitations` table
   - Status = `pending`
   - `expires_at` > NOW()
   - No existing user with this email
4. Page renders: "You've been invited by [Admin Name] to join [Organization Name] as [Role]. Set your password below to accept."
5. User enters password + confirm password
6. Form submits to POST `/api/invitations/accept` with token and password
7. Backend (in a single atomic transaction):
   - Re-validates token
   - Creates user in `auth.users` via Supabase admin client
   - Creates user row in `public.users` with role + organization_id from invitation
   - Updates invitation row: `status=accepted`, `accepted_at=NOW()`, `accepted_by=new_user_id`
   - Writes audit log entry: action `USER_INVITATION_ACCEPTED`
8. Returns success
9. Client redirects to `/login?accepted=1` with success banner
10. User logs in, lands on clinician dashboard

### Journey 2: Existing user with no role accepts invitation (linking path)
1. User registered via `/register` previously, has no role/organization
2. Admin invites same email as Clinician
3. User clicks email link → `/accept-invitation?token=X`
4. GET validates token:
   - Token valid, pending, not expired
   - User EXISTS with this email
   - User has NULL role AND NULL organization_id → ELIGIBLE for linking
5. Page renders: "You already have a ChartSpark account with this email. Sign in to accept this invitation from [Admin] to join [Organization] as [Role]."
6. Sign-in form rendered inline (NOT a redirect — stay on accept-invitation page)
7. User enters credentials, submits
8. On successful sign-in, page re-renders with "Accept Invitation" confirmation step showing invitation details
9. User clicks "Accept Invitation" button
10. POST to `/api/invitations/accept` with token (user is now authenticated via session)
11. Backend:
    - Re-validates token
    - Verifies authenticated user's email matches invitation email (critical — prevents one user from accepting another's invitation)
    - Re-verifies user has no existing role (in case of race conditions)
    - Updates user row: set role and organization_id from invitation
    - Updates invitation: status=accepted, accepted_at, accepted_by
    - Writes audit log: `USER_INVITATION_ACCEPTED_LINK`
12. Returns success, redirects to clinician dashboard

### Journey 3: Rejection — user in different org
1. User already Clinician at Org A
2. Admin at Org B invites same email
3. User clicks link
4. GET validates token, finds user exists with role AND organization_id NOT matching invitation
5. Page renders: "This email is already associated with another organization. If you believe this is an error, please contact the administrator who sent you this invitation."
6. No form, no way to proceed

### Journey 4: Rejection — user same org different role
1. User already Clinician at Org A
2. Admin invites same email as Admin to Org A
3. User clicks link
4. GET validates, finds user.organization_id matches invitation.organization_id AND user.role is not null
5. Page renders: "Your account at this organization already has a role. To request a role change, please contact your organization administrator at [admin_email_from_invitation]. Role changes must be made by an administrator through the user management panel."
6. No form, no way to proceed

### Journey 5: Rejection — expired token
1. User clicks invitation link >7 days after creation (or whatever expires_at was set to)
2. GET validates, finds `expires_at < NOW()`
3. Page renders: "This invitation expired on [formatted expiration date]. Please ask [inviter_name] to send you a new invitation."
4. No form

### Journey 6: Rejection — already accepted
1. User clicks an already-accepted invitation link (or someone else tries to replay it)
2. GET finds status = `accepted`
3. Page renders: "This invitation has already been accepted. If you are [invitation.email], please sign in. If not, this link is no longer valid."
4. Show a "Sign In" button linking to `/login`

### Journey 7: Rejection — invalid/unknown token
1. Malformed token, or token that doesn't exist in database
2. GET returns 404-style response
3. Page renders: "This invitation link is invalid. Please check the link in your email, or request a new invitation from your administrator."
4. No form

---

## File structure to create

```
src/app/
  accept-invitation/
    page.tsx              # Server component, validates token, renders appropriate UI
    AcceptForm.tsx        # Client component, password form (Journey 1)
    LinkAccountForm.tsx   # Client component, sign-in + confirm form (Journey 2)
    RejectionPanel.tsx    # Client component, renders rejection messages (Journeys 3-7)

src/app/api/
  invitations/
    accept/
      route.ts            # POST handler, atomic user creation + invitation update
```

DO NOT create a separate validation endpoint — validation happens in the page.tsx server component during GET.

---

## Technical requirements

### Token validation (server-side, in page.tsx)

```ts
// Pseudocode - adapt to existing patterns in the codebase
async function validateInvitation(token: string) {
  const supabase = createServiceRoleClient(); // service role to read invitations
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*, organizations(name), inviter:users!invitations_invited_by_fkey(first_name, last_name, email)')
    .eq('token', token)
    .maybeSingle();

  if (error || !invitation) return { status: 'invalid' };
  if (invitation.status === 'accepted') return { status: 'already_accepted' };
  if (invitation.status === 'expired') return { status: 'expired', expires_at: invitation.expires_at };
  if (new Date(invitation.expires_at) < new Date()) return { status: 'expired', expires_at: invitation.expires_at };

  // Check for existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, role, organization_id')
    .eq('email', invitation.email)
    .maybeSingle();

  if (!existingUser) return { status: 'new_user', invitation };
  
  if (!existingUser.role && !existingUser.organization_id) {
    return { status: 'eligible_linking', invitation, existingUser };
  }
  
  if (existingUser.organization_id !== invitation.organization_id) {
    return { status: 'reject_different_org', invitation };
  }
  
  if (existingUser.organization_id === invitation.organization_id && existingUser.role) {
    return { 
      status: 'reject_same_org_has_role', 
      invitation,
      adminEmail: invitation.inviter?.email 
    };
  }

  return { status: 'invalid' }; // fallback
}
```

### POST /api/invitations/accept handler

**Authorization/authentication:**
- Does NOT require existing auth (new user path) — but MUST validate token
- If a session exists (linking path), verify session.user.email matches invitation.email

**Input validation:**
- Zod schema with `.strict()` — rejects unknown fields
- Token: required string
- Password: required if new_user path, min 12 chars, must contain letter + number + symbol (match existing password policy if one exists in the codebase — check first)

**Rate limiting:**
- Use existing `checkRateLimitByKey` pattern
- Key: IP address (from `getRequestMetadata`)
- Limit: 10 attempts per IP per hour
- `failClosed: true` — reject if Upstash unreachable
- DO NOT use `failOpen` — this is a token-guessing attack surface

**Transaction atomicity:**
Use a Supabase RPC function for the atomic operation. Create a Postgres function named `accept_invitation_atomic(p_token text, p_auth_user_id uuid, p_is_new_user boolean)` that:
1. Validates the token still passes all checks (race condition protection)
2. For new user path: inserts into `public.users` with role + org from invitation
3. For linking path: updates existing `public.users` row with role + org
4. Updates `invitations` row: status=accepted, accepted_at=NOW(), accepted_by=p_auth_user_id
5. All in a single transaction — if any step fails, everything rolls back
6. Returns the new/updated user record

If you're uncertain how to create the Postgres function, STOP and ask — do not approximate with a chain of non-atomic operations.

**Audit logging:**
- Log `USER_INVITATION_ACCEPTED` (new user) or `USER_INVITATION_ACCEPTED_LINK` (existing user)
- Include: invitation_id, invited_email, role, organization_id, actor_user_id, inviter_user_id, timestamp, IP
- Audit log MUST be written inside the atomic transaction or fail the whole operation
- Never include password or token in audit logs

**Error handling:**
- Use existing `sanitizeError` and structured logger
- Map Supabase errors to user-friendly messages; do NOT leak Postgres error codes to the client
- Generic 500 response body: `{ error: 'Unable to accept invitation. Please try again or contact support.' }`
- Log the real error server-side with full detail (now safe after sanitizeError fix)

**HIPAA-safe logging:**
- NEVER log password
- NEVER log full token (log first 8 chars + "..." if you must)
- Patient names, DOB, PHI don't apply here but the discipline holds

---

## UI requirements

### Accept page (Journey 1 — new user)

Clean, simple, matches existing ChartSpark visual language. Elements:
- ChartSpark logo (already present in existing pages)
- Heading: "Accept Your Invitation"
- Invitation details card:
  - "Invited by [Inviter Name]"
  - "Organization: [Org Name]"
  - "Role: [Role]"
  - "Invitation expires: [formatted date]"
- Password field (with visibility toggle)
- Confirm password field
- Password strength indicator (match existing patterns if any)
- Submit button: "Accept Invitation & Create Account"
- Loading state on submit
- Error message display area (inline, above button)

### Link account form (Journey 2)

- Invitation details card (same as above)
- Info box: "You already have a ChartSpark account. Sign in below to accept this invitation."
- Email field (pre-filled and disabled, showing invitation email)
- Password field
- "Sign In to Continue" button

After successful sign-in, same page re-renders with:
- Invitation details card
- Big "Accept Invitation" button
- "Cancel" link going to dashboard

### Rejection panel

Unified component rendering different messages based on rejection reason. Each message includes a clear next step (contact admin, sign in, request new invitation). No loading states, no forms.

---

## Database function to create

Provide the SQL for `accept_invitation_atomic()` as a separate code block that James will run in the Supabase SQL Editor. Do NOT attempt to run it yourself. Include:

1. Function signature with proper return type
2. Security DEFINER (so it can bypass role escalation trigger legitimately when needed)
3. Clear comments explaining what it does
4. Error handling with meaningful error codes
5. A note that James needs to also grant EXECUTE on this function to the `authenticated` role (or whichever role the app uses)

---

## Testing requirements before you push

1. `npm run build` passes locally — no TypeScript errors
2. `npm test` passes (if relevant tests exist)
3. Manual test walkthrough:
   - Happy path new user (Journey 1) — step through mentally, describe what you expect to see at each step
   - Linking path (Journey 2) — same
   - Each rejection path (Journeys 3-7) — same
4. Edge case check: what if the invitation is accepted by Journey 1, then someone tries the same token again? (Should hit Journey 6.)
5. Edge case check: what if the user opens Journey 2, signs in, but someone else accepts the invitation in the meantime? The atomic RPC must detect this.
6. Cross-cutting checklist from CLAUDE.md:
   - No new env vars without updating `.env.example`
   - No new dependencies without asking
   - No `console.log` or `console.error` near PHI/identity paths
   - No silent error swallowing
   - Zod schemas use `.strict()`
   - Scope limited to stated files
   - Commit message is descriptive

---

## Commit strategy

Single feature, single commit sequence:

1. **Commit 1 — backend**: API route, Zod schemas, audit log integration
2. **Commit 2 — database**: SQL for `accept_invitation_atomic()` in a new migration file `supabase/migrations/YYYYMMDDHHMMSS_accept_invitation_atomic.sql`. James will run this manually in Supabase dashboard.
3. **Commit 3 — frontend**: Page + form components + rejection panel

If the work gets large, more commits are fine. Keep them logically atomic. Do NOT bundle unrelated changes.

All commits use `--no-verify` as per today's workflow, with clear commit messages following CLAUDE.md format (`type(scope): description`).

---

## What to do when blocked

STOP and ask if you encounter:
- Ambiguity in existing patterns (password policy, audit event naming, organization RLS)
- Need to modify code outside the stated scope
- Uncertainty about the Postgres function or how to make the operation atomic
- A test failure that's non-obvious
- Anything that looks like it would require a new env var, new dependency, or schema change beyond the specified function
- Any RLS issue where you're not sure whether to modify a policy or work around it

Do not guess. Do not silently work around. Ask.

---

## Reporting back

After each commit, report:
1. What files changed and what the change does
2. Local build result
3. Local test result (if applicable)
4. Cross-cutting checklist self-review (CLAUDE.md pre-commit checklist)
5. Any assumptions made
6. What's NOT yet done vs. what IS done

After all commits pushed:
1. All commit SHAs
2. Any database migration SQL that James needs to run
3. Any env vars that need to be set (should be none based on scope)
4. A summary of the manual test checklist James should run

---

## Success criteria

The task is done when:
1. All 7 journeys are implementable with the deployed code
2. `accept_invitation_atomic` SQL function is provided (James will apply it)
3. Local build is green
4. Existing tests pass
5. Commits are pushed to main
6. Vercel deploy succeeds
7. James can manually test Journey 1 end-to-end and invitation is marked accepted in database

Manual end-to-end validation of all 7 journeys is James's responsibility post-deploy. Codex verification follows.