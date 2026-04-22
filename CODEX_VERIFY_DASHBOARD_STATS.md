# CODEX_VERIFY_DASHBOARD_STATS.md

## Task

Adversarial verification of commit `052f879` (dashboard stats overhaul) per CODEX.md standing charter. CC reported clean implementation. Your job is to find what's not clean.

## Context

Approval doc: `APPROVE_DASHBOARD_STATS_FIX.md` in repo root.

CC's self-reported summary:
- Clinician-scoped Signed Today and Unfinished Notes (provider_id filter)
- Active Patients stayed org-scoped (no provider column on patients table — honest fallback)
- Timezone-aware via browser-reported TZ param, handwritten Intl helper
- Tab-focus refresh via visibilitychange listener
- Response shape changed: `{activePatients, signedToday, unfinishedNotes}`

Files changed:
- `src/app/api/dashboard/stats/route.ts`
- `src/app/(app)/dashboard/page.tsx`
- `src/lib/utils/timezone.ts` (new file)
- `OBSERVABILITY_ROADMAP.md`

---

## Step 1 — Commit presence and scope

### 1a — Verify commit

```bash
git log --oneline -3
git show --stat 052f879
```

Report:
- Commit present at HEAD or near HEAD?
- Pushed to origin/main?
- Exact files changed (should be 4, one of which is the roadmap doc)
- Any files changed that are OUTSIDE the scope CC claimed? (Flag anything else.)

### 1b — No dependency drift

```bash
git diff 052f879^ 052f879 -- package.json package-lock.json
```

Expected: empty diff. CC reported no new dependencies. Verify.

---

## Step 2 — Timezone helper correctness

### File: `src/lib/utils/timezone.ts` (new)

This is the highest-risk piece of new code — handwritten timezone math is notoriously error-prone. Audit carefully.

### 2a — Algorithm correctness

Read the helper. Verify:

- [ ] Does it correctly compute midnight-in-TZ when TZ is ahead of UTC (e.g., Asia/Tokyo)?
- [ ] Does it correctly compute midnight-in-TZ when TZ is behind UTC (e.g., America/Los_Angeles)?
- [ ] Does it handle DST transitions? Specifically, what does it return on the day of a spring-forward or fall-back? The `Date` constructor behavior around DST is notoriously inconsistent.
- [ ] Does it correctly handle UTC input (identity case)?
- [ ] Does it fall back to UTC midnight on invalid input?
- [ ] Does it log a warning on invalid input?

### 2b — Specific test cases (walk through mentally)

Given `Intl.DateTimeFormat('en-CA', { timeZone, ...}).format(now)` returns the DATE string in the target timezone, then the helper parses that date and reconstructs midnight — how does the reconstruction handle DST?

Specifically: on the day of DST spring-forward in America/New_York (e.g., 2025-03-09), midnight local time is well-defined, but 2:00 AM doesn't exist. Does the helper produce the correct UTC timestamp for 00:00 EST on that date?

Report:
- Identify any edge case where the helper could return the wrong timestamp
- Identify any input that could cause silent incorrect output (not a crash, a WRONG time)

### 2c — Node vs browser behavior

`Intl.DateTimeFormat` behavior is consistent across Node and browser for date formatting, but the `Date` constructor parsing of `"YYYY-MM-DDTHH:mm:ss"` strings varies. Some environments interpret this as local time, some as UTC.

Verify:
- [ ] Does the helper rely on `new Date("2025-01-15T00:00:00")` being parsed as local OR UTC?
- [ ] If so, is that behavior consistent across the Vercel Node runtime where this code runs?
- [ ] Are there any places where implicit timezone conversion happens that could cause the helper to return wrong times?

---

## Step 3 — API route correctness

### File: `src/app/api/dashboard/stats/route.ts`

### 3a — Timezone param handling

Verify:
- [ ] The `tz` query param is read from `searchParams.get('tz')`
- [ ] Missing param → fallback to UTC (matches approval spec)
- [ ] Invalid TZ string → passed to helper, helper logs warning and falls back to UTC
- [ ] No SQL injection or unsafe use of the tz string (shouldn't matter since it's passed to Intl.DateTimeFormat, but verify)

### 3b — Signed Today query

Verify:
- [ ] Table: `notes` (CC reported this is the correct name, NOT `clinical_notes`)
- [ ] Filter: `organization_id = orgId` AND `provider_id = clinicianId` AND `status = 'signed'`
- [ ] Time filter: `signed_at >= todayStart` (NOT `created_at`)
- [ ] Count only, no row payload (`head: true` and `count: 'exact'`)

### 3c — Unfinished Notes query

Verify:
- [ ] Same table (`notes`)
- [ ] Filter: `organization_id` AND `provider_id` AND `status = 'draft'`
- [ ] No time filter (drafts accumulate)
- [ ] Count only

### 3d — Status enum completeness

Per CC's verification, note status enum is `'draft' | 'completed' | 'signed' | 'amended'`.

Flag as a concern if:
- Signed Today counts ONLY `'signed'` but ignores `'completed'` — if the app uses `'completed'` as a signed-equivalent state, this undercounts
- Unfinished Notes counts ONLY `'draft'` but ignores `'completed'` — if `'completed'` means "clinician done but not yet co-signed" or similar, this undercounts
- The state transition model isn't clear from the queries

This isn't necessarily a bug — we just don't know from the code alone what the four states MEAN. Flag it as a "clarify the state model" risk.

### 3e — Active Patients query

Verify:
- [ ] Table: `patients`
- [ ] Filter: `organization_id` AND `status = 'active'`
- [ ] NO provider_id filter (per approval's pre-authorized fallback)
- [ ] Count only

### 3f — Response shape

Verify:
- [ ] Response key is `signedToday` not `todayNotes` or `signed_today`
- [ ] Response key is `unfinishedNotes` not `pendingEncounters` or `unfinished_notes`
- [ ] Response key is `activePatients` (unchanged)

---

## Step 4 — Frontend correctness

### File: `src/app/(app)/dashboard/page.tsx`

### 4a — Consumer of new response shape

Verify that the dashboard destructures the new field names, NOT the old ones:

- [ ] Accesses `stats.signedToday` not `stats.todayNotes`
- [ ] Accesses `stats.unfinishedNotes` not `stats.pendingEncounters`

Grep the codebase for any OTHER consumers of the old field names that CC might have missed:

```bash
grep -rn "todayNotes\|pendingEncounters" src/
```

Flag any matches that are reading these fields from API responses.

### 4b — Stat card config

Verify the three statCards have:

- [ ] "Active Patients" → href `/patients`, subtitle "In your organization"
- [ ] "Signed Today" → href `/notes`, subtitle "Notes you signed today" (or similar)
- [ ] "Unfinished Notes" → href `/notes`, subtitle "Drafts to complete"

No lingering references to old labels ("Today's Notes", "Pending Encounters")?

### 4c — Timezone param sending

Verify:
- [ ] Client uses `Intl.DateTimeFormat().resolvedOptions().timeZone` to get browser TZ
- [ ] Sent as query param (URL-encoded)
- [ ] The same TZ is sent on both mount fetch AND tab-focus refresh

### 4d — Tab-focus refresh

Verify:
- [ ] `visibilitychange` event listener added on mount
- [ ] Listener checks `document.visibilityState === 'visible'` before refetching
- [ ] Cleanup function removes the listener on unmount (no memory leak)
- [ ] The fetch function is stable across renders (useCallback or ref) — verify `useCallback` is used per CC's claim
- [ ] Loading skeleton is NOT shown on tab-focus refreshes (avoids flashing on focus)

### 4e — Dashboard header copy

Verify that if the dashboard greeting previously said "You have X notes completed today" or similar, it now matches the new "Signed Today" semantics (or uses neutral copy that doesn't contradict).

### 4f — Removed imports

CC mentioned removing an unused `Receipt` import. Verify:
- [ ] Import is actually removed (not just commented out)
- [ ] No other unused imports were left behind from the refactor

---

## Step 5 — Regressions risk check

### 5a — Any other consumer of `/api/dashboard/stats`?

```bash
grep -rn "/api/dashboard/stats" src/
```

Expected: only `src/app/(app)/dashboard/page.tsx` and the route handler itself. Flag any other consumers that would break from the response shape change.

### 5b — Old field names used anywhere?

Already covered in 4a — but also search for:
- Types/interfaces referencing the old shape
- Test files mocking the old response
- Storybook stories using the old names

### 5c — RLS / security

The queries filter by `organization_id` and `provider_id` at the API layer. If Supabase RLS is not configured, the API-layer filter is the only boundary. Flag whether RLS is visible on `notes` and `patients` in the codebase (migrations or SQL files).

Not a blocker — just a verification of what defense-in-depth exists.

---

## Step 6 — Build and sanity check

```bash
cd C:/Users/joman/OneDrive/Desktop/ChartSparkOG
npm run build 2>&1 | tail -30
```

Verify:
- [ ] Build succeeds exit 0
- [ ] No TypeScript errors
- [ ] No "property X does not exist on type Y" errors (would indicate a shape mismatch between API and consumer)

---

## Step 7 — Report

Produce the standard CODEX.md 5-section format:

### 1. Claims vs Reality
What CC said vs what actually landed. Any discrepancies.

### 2. Correctness
- Timezone helper: any edge cases that produce wrong timestamps?
- Queries: filters correct, table names correct, status enum handling correct?
- Tab-focus refresh: cleanup correct, debouncing considered?

### 3. Completeness
- All approved features present?
- Response shape fully updated on both ends?
- Any consumers of old field names missed?

### 4. Consistency
- API layer and frontend layer agree on shape?
- Timezone flow works end-to-end (browser → query param → helper → DB query)?
- Does `notes.status = 'completed'` get handled anywhere, or silently ignored by the "signed" and "draft" filters? Flag as risk.

### 5. Deployment Risk
- What could fail at runtime?
- DST edge cases in timezone helper?
- Empty state (clinician with no notes at all — does the count render "0" or break)?
- What happens if the browser TZ is something weird like `Pacific/Kiritimati`?
- What happens if the clinician's machine clock is wrong?

---

## Specific traps to check

1. **Timezone helper integer vs Date confusion**: `localMidnight.getTime() - offsetMs` assumes offset sign. Verify the sign is correct (east of UTC vs west of UTC).

2. **visibilitychange firing too often**: Some tab switches trigger multiple events. Does the refresh fire more than once per tab switch? Not a bug but could be a DB load issue.

3. **Race condition**: If a user switches tabs quickly, two fetches could be in flight. Does the UI handle out-of-order responses correctly?

4. **Completed status ghost**: Notes in `'completed'` status don't count as signed or as drafts. They're invisible to the dashboard. Is this a bug or is `'completed'` a transient state that doesn't persist?

5. **UTC fallback when TZ missing**: If a browser doesn't report TZ for some reason (very old browser, headless browser, privacy extension), the client sends no `tz` param. Does the API correctly use UTC fallback without crashing?

---

## Adversarial mindset

CC just reported "all clean." Your job is to find what isn't. Today's track record on CC work:
- Encounter fix took 4 rounds due to schema drift — catch the equivalent here
- ICD-10 Proposal D had a within-source dedup gap Codex caught — look for analogous gaps
- Smart Triage fix was clean — might be clean here too, but verify

Don't rubber-stamp. Dig into edge cases. Produce specific line-and-file findings, not generic "looks good."