# FIX_NAVIGATION_BUGS.md

## Context

Smoke testing on 2026-04-18 surfaced four navigation bugs that likely share a root cause. All involve clicking something on a clinician-side page and landing on the wrong destination.

Read `CLAUDE.md` first.

---

## Bugs to diagnose

### B6 — Dashboard "Active Patients" card
**Observed:** Clinician clicks the "Active Patients: 1" card on the main dashboard (app.chartspark.io/dashboard)
**Expected:** Navigate to /patients (patient list)
**Actual:** Navigates to Financial Governance Hub

### B6b — Dashboard "Pending Encounters" card  
**Observed:** Clinician clicks the "Pending Encounters" card on the main dashboard
**Expected:** Navigate to /encounters (or /encounters?status=pending)
**Actual:** Navigates to Financial Governance Hub

### B7 — Notes sidebar empty patient list
**Observed:** Test Patient exists in the patients table, visible on /patients, associated with the logged-in clinician's organization. On /notes, the sidebar patient list shows empty/no patients.
**Expected:** Show the patient(s) the clinician has access to
**Actual:** Empty state despite patient existing in DB

### B8 — "Select patient" button on /notes
**Observed:** Clinician clicks "Select patient" button in the note-writing flow
**Expected:** Open patient picker or navigate to /patients for selection
**Actual:** Navigates to Dashboard

---

## Hypothesis

All four bugs look like **routing/linking logic errors**. Possible shared root causes:

1. **Hardcoded destination URLs** that point at wrong routes (classic copy-paste residue from demo/test data)
2. **Role-based routing logic** that misroutes clinicians to admin/financial pages (confusing USER role with something else)
3. **Missing or broken data-fetching** on /notes that returns empty when it should filter by clinician or organization
4. **Route guards or middleware** redirecting based on wrong conditions

Your job in Step 1 is to find the root cause(s), not guess.

---

## Step 1 — Diagnostic (DO NOT FIX YET)

Report findings and wait for my approval.

### 1a — B6: Dashboard "Active Patients" card

Locate the dashboard file:
- Likely `src/app/(app)/dashboard/page.tsx` or similar

Find the "Active Patients" card component. Report:
- The exact JSX for the card
- The href or onClick handler
- Where the destination is defined (hardcoded string, constant, function)
- What the destination currently points to

### 1b — B6b: Dashboard "Pending Encounters" card

Same file. Find the "Pending Encounters" card. Report same details as 1a.

### 1c — B6 + B6b shared analysis

- Are both cards using the SAME routing logic? (one bug = two broken symptoms)
- Or is each hardcoded separately? (two bugs)
- Is there a dashboard card config file / array?

### 1d — B7: /notes empty sidebar

Locate the notes page:
- Likely `src/app/(app)/notes/page.tsx`

Find the patient list fetching logic:
- What data layer function is called?
- Is there an organization_id filter?
- Is there a clinician-specific filter (e.g., only patients assigned to this clinician)?
- Run the same query as /patients page uses and compare — why does /patients show the test patient but /notes does not?

Report:
- The fetching code
- Whether it matches /patients fetching (which works correctly)
- Any filtering that might exclude the test patient

### 1e — B8: /notes "Select patient" button

Find the button click handler in the notes workflow. Report:
- File and line of the button
- The onClick handler
- The destination it navigates to
- Why it would navigate to Dashboard instead of a patient picker

### 1f — Shared root cause analysis

After examining all four bugs, determine:
- Do B6 and B6b share a root cause (dashboard card routing config)?
- Do B7 and B8 share a root cause (notes flow patient lookup)?
- Is there a single underlying issue affecting all four?
- Or are these four independent bugs?

Report your assessment with evidence.

### 1g — Proposed fix plan

For each identified root cause, propose a targeted fix. Do NOT implement yet.

Examples of valid proposals:
- "B6 and B6b both hardcode `/financial-governance-hub` in the dashboard card config at line X. Fix: change to `/patients` and `/encounters` respectively."
- "B7 filters by a broken `provider_id` field instead of organization_id. Fix: align with /patients fetching logic."
- "B8's button onClick navigates to `/dashboard` unconditionally. Fix: wire to patient picker modal or /patients."

If the four bugs turn out to be independent, propose four fixes. If they share root cause, propose one.

---

## Cross-cutting constraints

- No new dependencies
- No new env vars
- No changes to the AI note generation pipeline, ICD-10 code pipeline, or Smart Triage
- No changes to patient context helper, vitals fetching, or audit logging
- No "while I'm here" refactors outside the bugs listed above
- If diagnosis reveals a broader routing architecture issue that requires a refactor, STOP and flag it — we'll roadmap it rather than rush

---

## Reporting after Step 1

Your Step 1 report should answer:
1. Exact file + line for each bug's incorrect routing logic
2. Whether B6 and B6b share code path
3. Whether B7 and B8 share code path
4. Proposed fix for each (or one shared fix if root cause is shared)
5. Estimated commit count (1 if shared, 2–4 if independent)
6. Any related navigation issues found during the audit that you think we should address in the same commit — flag separately, do NOT add to scope without approval

Wait for my approval before proceeding to Step 2.

---

## Testing plan (user will run after deploy)

After fixes deploy:

### Test 1 — Dashboard Active Patients
1. Log in as Test Clinician
2. Main dashboard shows "Active Patients: 1"
3. Click the Active Patients card
4. Expected: lands on /patients showing the test patient
5. Fail: lands anywhere else (especially Financial Governance Hub)

### Test 2 — Dashboard Pending Encounters
1. On dashboard, click "Pending Encounters" card
2. Expected: lands on /encounters showing pending encounters
3. Fail: lands anywhere else

### Test 3 — Notes sidebar
1. Navigate to /notes
2. Expected: sidebar shows the test patient (since the patient has encounters and notes associated)
3. Fail: empty state

### Test 4 — Select patient button
1. On /notes or note creation flow, click "Select patient"
2. Expected: opens patient picker or navigates to /patients for selection
3. Fail: navigates to /dashboard

All four should pass after the fixes.