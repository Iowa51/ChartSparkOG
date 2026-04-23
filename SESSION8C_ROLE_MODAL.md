# SESSION8C_ROLE_MODAL.md

Read CLAUDE.md first. Add Change Role modal to admin users page, ONE commit.

## Context

Session 8A created PATCH /api/admin/users/[userId]/role with full hierarchy enforcement. Session 8B updated the admin users page with a table showing real users and a Change Role button that sets selectedUserId, selectedUserName, and selectedCurrentRole state. Now we need the modal that appears when those state values are set.

## Task

### Step 1: Read current state

Read src/app/(admin)/admin/users/page.tsx to understand the existing state variables and where to render the modal.

### Step 2: Build the ChangeRoleModal component

Create src/components/admin/ChangeRoleModal.tsx as a client component.

Props:
- isOpen: boolean
- onClose: () => void
- onSuccess: () => void (to refetch user list after change)
- userId: string
- userName: string
- currentRole: string
- callerRole: string (the logged-in admin's role)

Modal UI:
1. Header showing "Change Role" and the target user's name
2. Display current role as a read-only badge
3. Dropdown for new role selection. Filter options by caller permissions:
   - If caller is SUPER_ADMIN: show USER, ADMIN, AUDITOR (exclude current role)
   - If caller is ADMIN: show only USER and AUDITOR (exclude current role)
   - Label USER as "Clinician" in the dropdown display
4. Required reason textarea (min 5 chars, placeholder: "Reason for role change...")
5. Confirmation step: after filling in role + reason, show a summary:
   "[userName] will be changed from [currentRole] to [newRole]"
   with Confirm and Cancel buttons
6. On confirm, POST to /api/admin/users/[userId]/role with { new_role, reason }
7. Show loading spinner during request
8. On success: show success toast, call onSuccess(), call onClose()
9. On error: show error message from API response in the modal

### Step 3: Wire the modal into the users page

In src/app/(admin)/admin/users/page.tsx:
1. Import ChangeRoleModal
2. Render it at the bottom of the page component
3. Pass isOpen={!!selectedUserId} and wire onClose to clear all selected state
4. Pass onSuccess to refetch the users list
5. Pass callerRole from the currentUser data already fetched

### Styling

- Use existing modal patterns from the codebase (search for other modals to match)
- Backdrop: fixed inset-0 bg-black/50 backdrop-blur-sm
- Modal card: bg-card rounded-2xl border shadow-2xl max-w-md
- Buttons: match existing app button styles
- Role badges in the modal should use same colors as the table (purple, blue, amber, emerald)

## After

npm run build. Commit:
git add -A
git commit -m "feat: Change Role modal with confirmation step and API integration" --no-verify

Report: files created, files changed, SHA.