# APPROVE_NAVIGATION_FIXES.md

## Approved — execute Step 2

Excellent diagnostic. Three independent bugs with clean root causes. Approved with the **split-commit option** (Commit A + Commit B) rather than bundling all three fixes into one commit.

---

## Commit A — Dashboard stat cards (B6 + B6b)

### File: `src/app/(app)/dashboard/page.tsx`

### Implementation

Replace the broken ternary at line 192 with per-card href properties. Refactor the `statCards` array (lines 88-116) to include `href` on each card object.

**Before (conceptual):**
```typescript
const statCards = [
  { label: "Active Patients", value: ..., icon: ... },
  { label: "Today's Notes", value: ..., icon: ... },
  { label: "Pending Encounters", value: ..., icon: ... },
];

// ...
const href = stat.label === "Notes Completed" ? "/notes?status=completed" : "/billing?status=pending";
```

**After:**
```typescript
const statCards = [
  { label: "Active Patients", value: ..., icon: ..., href: "/patients" },
  { label: "Today's Notes", value: ..., icon: ..., href: "/notes?status=completed" },
  { label: "Pending Encounters", value: ..., icon: ..., href: "/encounters?status=pending" },
];

// ...
<Link key={stat.label} href={stat.href} ...>
```

Remove the broken ternary entirely.

### Verify encounter status filter works

Check `/encounters` page: does it actually accept a `status=pending` query param? If yes, `/encounters?status=pending` is correct. If `/encounters` ignores that param or errors on it, use plain `/encounters` instead (we'd rather land on the page without a filter than hit an error or have the filter silently ignored).

Flag the verification result in your commit message.

### Commit message

```
fix(dashboard): route stat cards to their actual destinations

The stat-card ternary only recognized the label "Notes Completed" (which 
no card uses), so all three cards fell through to /billing?status=pending. 
Refactor to per-card hrefs defined on the statCards array.

- "Active Patients" → /patients
- "Today's Notes" → /notes?status=completed
- "Pending Encounters" → /encounters?status=pending

Bugs fixed: B6, B6b.
```

---

## Commit B — Patient picker flow (B7 + B8)

### Fix B7 — `PatientQuickSelectModal.tsx` data source

### File: `src/components/notes/PatientQuickSelectModal.tsx`

Replace the demo-data import with a real fetch against `/api/patients?status=active`.

**Transform the API response shape to the UI shape** the modal expects:
- `first_name + last_name` → `name`
- Derive `initials` from name
- `date_of_birth` → `dob`
- `mrn` → `mrn`
- `gender` → `gender`
- `avatarColor` — if the DB has it, use it; otherwise deterministically derive from patient ID (consistent color per patient across sessions)
- `lastVisit` — if available from the API; otherwise omit or show "—"

### Empty / loading / error states

- Loading: show a spinner or skeleton while the fetch runs
- Empty: show "No patients found" message (don't blow up)
- Error: show error toast or inline error; don't crash the modal

### Do NOT change

- Modal props signature
- Keyboard navigation
- Search behavior
- Open/close logic

### Fix B8 — Replace Link with modal-opening button

### File: `src/app/(app)/notes/new/page.tsx` (lines 1361-1366)

Replace:
```tsx
<Link href="/dashboard" className="...">Select Patient</Link>
```

With a button that opens `PatientQuickSelectModal`:
- Import the modal component
- Add state for modal open/close
- Button onClick toggles modal open
- When user picks a patient in the modal, the modal already routes to `/notes/new?patientId=X` — this causes the current page to reload with the patient context, which will dismiss the "No Patient Selected" banner naturally

### Commit message

```
fix(notes): patient picker fetches real patients and opens on Select Patient

Two related defects in the start-a-new-note journey:

B7: PatientQuickSelectModal imported a hardcoded demo-data array 
(src/lib/demo-data/patients.ts) instead of fetching real patients. 
Replaced with /api/patients?status=active fetch + shape transform. 
Demo-data import removed.

B8: "Select Patient" button in the no-patient-selected banner was a 
<Link> to /dashboard instead of opening the picker. Replaced with a 
button that opens PatientQuickSelectModal.

Together these restore the intended flow: clinician clicks Select 
Patient → modal opens → picks a real patient → lands on 
/notes/new?patientId=X ready to write.

Bugs fixed: B7, B8.
```

---

## Scope boundaries — explicit

### Do NOT touch
- `src/lib/demo-data/patients.ts` itself (leave file on disk — we'll roadmap its deletion separately once we verify no other consumers)
- `/patients/new?returnTo=...` handling (CC flagged this as potentially broken — roadmap item, not this commit)
- Dashboard card click-affordance / visual styling (cosmetic concern, not a bug)
- Any other files beyond the three listed

### Cross-cutting constraints
- No new dependencies
- No new env vars
- No changes to AI note pipeline, ICD-10 codes, Smart Triage, vitals, patient context helper
- No changes to audit logging
- No "while I'm here" refactors

---

## Reporting after both commits

- 2 commit SHAs in order (A then B)
- Files changed per commit
- Local `npm run build` for each commit
- Pre-commit checklist per CLAUDE.md for each
- Vercel deploy status for Commit B (the final one)
- Result of the `/encounters?status=pending` query param verification (does it filter, or is it ignored?)
- Confirmation that `PatientQuickSelectModal` no longer imports from `src/lib/demo-data/patients.ts`
- Confirmation that no other files were modified beyond the three listed

---

## Roadmap items to capture (don't fix now)

CC flagged these during the audit. Add to OBSERVABILITY_ROADMAP.md:

```markdown
### Navigation / picker follow-ups (from 2026-04-18 navigation bug fix)

- [ ] Verify /patients/new?returnTo=/notes/new honors the returnTo param. 
      After B7 fix, clinician who clicks "Add New Patient" in the picker 
      ends up at /patients/new — if the page doesn't honor returnTo, they 
      get stranded after adding a patient. Test and fix if broken.

- [ ] Delete src/lib/demo-data/patients.ts once all consumers are 
      migrated. After 2026-04-18 B7 fix, PatientQuickSelectModal no 
      longer imports it — grep for other consumers and remove the file 
      if it's truly orphaned.

- [ ] Dashboard stat cards lack visual affordance that they're clickable. 
      UX polish — add hover state or subtle arrow icon so users know the 
      cards navigate. Minor, non-blocking.
```

---

## Testing plan (user will run after deploy)

### Test 1 — Dashboard Active Patients (B6)
1. Hard reload dashboard
2. Click "Active Patients: 1" card
3. **Expected:** lands on /patients showing Test Patient
4. **Fail:** lands on /billing (Financial Governance Hub)

### Test 2 — Dashboard Today's Notes
1. Click "Today's Notes" card
2. **Expected:** lands on /notes (filtered to completed if filter supported, otherwise all notes)
3. **Fail:** lands on /billing

### Test 3 — Dashboard Pending Encounters (B6b)
1. Click "Pending Encounters" card
2. **Expected:** lands on /encounters (filtered to pending if filter supported)
3. **Fail:** lands on /billing

### Test 4 — Patient picker opens (B8)
1. Navigate to /notes/new without a patientId query param (click Start New Note from dashboard or go direct)
2. "No Patient Selected" banner appears with "Select Patient" button
3. Click "Select Patient"
4. **Expected:** modal opens with real patient list
5. **Fail:** navigates to /dashboard

### Test 5 — Patient picker shows real patients (B7)
1. In the open modal, verify Test Patient appears
2. Verify NO Sarah Connor, Michael Reese, or other demo data names
3. Click Test Patient
4. **Expected:** modal closes, page navigates to /notes/new?patientId=X, banner dismisses, can now write note
5. **Fail:** picker shows demo data OR clicking patient doesn't navigate correctly

All five should pass after both commits deploy.

Proceed.