# SESSION8B_USERS_LIST.md

Read CLAUDE.md first. Update the admin users page, ONE commit.

## Context

Session 8A just added PATCH /api/admin/users/[userId]/role. Now the admin users page needs to show real user data with a Change Role button on each row. Check what already exists at src/app/(admin)/admin/users/page.tsx before building anything — it may already fetch users and just need the role-change button added.

## Task

### Step 1: Read the current state

Read these files:
- src/app/(admin)/admin/users/page.tsx
- src/app/(admin)/super-admin/users/page.tsx
- src/app/api/admin/users/route.ts (the GET handler if it exists)

Understand what data is already fetched and displayed.

### Step 2: Ensure GET /api/admin/users returns real data

If the GET endpoint already exists and returns users with id, email, first_name, last_name, role, is_active, organization_id — move on. If not, create or fix it.

The response should include for each user: id, email, first_name, last_name, role, is_active, created_at, organization_id.

### Step 3: Update the admin users page

The admin/users page should show a table of users with columns:
- Name (first + last)
- Email
- Role (displayed as a styled badge)
- Status (active/inactive badge)
- Actions column with "Change Role" button

The "Change Role" button should:
- Be visible ONLY if the logged-in user is SUPER_ADMIN or ADMIN
- Be disabled on the user's own row (cannot change own role)
- Be disabled on SUPER_ADMIN rows (if caller is ADMIN)
- On click, set state variables: selectedUserId and selectedCurrentRole
- The actual modal will be built in Session 8C — for now just set state

Add this state at the top of the component:
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [selectedUserName, setSelectedUserName] = useState<string>('');
const [selectedCurrentRole, setSelectedCurrentRole] = useState<string>('');

The Change Role button onClick should set all three values.

### Step 4: Role badge styling

Use these colors consistent with the rest of the app:
- SUPER_ADMIN: purple badge
- ADMIN: blue badge
- AUDITOR: amber badge
- USER: green badge (label it as "Clinician" in the UI even though DB stores USER)

### Important

- Follow existing patterns in the codebase for admin pages
- Use the same layout, Header component, and styling as other admin pages
- Fetch real data from the API, not demo data
- Handle loading and error states

## After

npm run build. Commit:
git add -A
git commit -m "feat: admin users page with real data and Change Role button" --no-verify

Report: files changed, whether GET endpoint existed or was created, SHA.