# APPROVE_DASHBOARD_STATS_FIX.md

## Approved — execute as a single feature commit (Option A)

CC's diagnostic surfaced legitimate bugs beyond the original "reset" question. All seven product-decision questions are answered below. Proceed with one comprehensive fix.

---

## Product decisions (locked)

### Card 1: Active Patients
- **Scope:** Clinician-scoped — patients in the current clinician's panel, not org-wide
- **Label:** Keep "Active Patients"
- **Subtitle:** "In your panel" (was "In your organization")

### Card 2: Today's Notes → Signed Notes Today
- **Label:** Rename to "**Signed Today**" (short and truthful)
- **Subtitle:** "Notes you signed today"
- **Scope:** Clinician-scoped — only notes where `provider_id` / `signed_by` matches the current clinician
- **Status filter:** `status = 'signed'` only (or whatever the actual signed-status enum value is — check and use it)
- **Time filter:** Notes signed today in clinician's local timezone (see timezone section below)
- **Click destination:** `/notes` (plain URL — filter support is a roadmap item)

### Card 3: Pending Encounters → Unfinished Notes
- **Label:** Rename to "**Unfinished Notes**"
- **Subtitle:** "Drafts to complete"
- **Scope:** Clinician-scoped — drafts owned by the current clinician
- **Query target:** `clinical_notes` table, NOT `encounters`
- **Status filter:** `status = 'draft'` only
- **Time filter:** None — drafts accumulate until completed, no decay
- **Icon:** Consider changing from calendar/clipboard to a document/edit icon if appropriate (optional — flag if changing, not required)
- **Click destination:** `/notes` (plain URL — the notes list already distinguishes drafts via tabs)

### Refresh behavior
- Refresh stats on tab focus (window.visibilityState → "visible" event OR React Router focus event)
- No polling interval
- Mount fetch stays as-is

### Timezone handling
- Timezone source: **browser-reported** via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Sent from client to server as query param: `?tz=America/New_York`
- Server uses the provided timezone to compute `todayStart`
- Fallback: if timezone param is missing or invalid, fall back to UTC (log a warning but don't crash)

---

## Implementation plan

### Files expected to change

1. **`src/app/api/dashboard/stats/route.ts`** — update all three queries
2. **`src/app/(app)/dashboard/page.tsx`** — update labels, subtitles, hrefs, send tz param, add tab-focus refresh

### Backend changes — `/api/dashboard/stats/route.ts`

**Current shape:**
```typescript
return { stats: { activePatients, todayNotes, pendingEncounters } }
```

**New shape:**
```typescript
return { stats: { activePatients, signedToday, unfinishedNotes } }
```

If renaming breaks anything downstream, do it anyway — we want the data contract to match the new product semantics. Grep for consumers: `grep -rn "activePatients\|todayNotes\|pendingEncounters" src/`. Update all sites.

### Query 1 — Active Patients (clinician-scoped)

```typescript
supabase
  .from('patients')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .eq('status', 'active')
  .eq('provider_id', clinicianId)  // <-- add clinician scope
```

**Verify first:** does the `patients` table have a `provider_id` or `primary_provider_id` column? If it uses a join table (e.g., `patient_providers`), adjust accordingly. If no clinician-scope column exists, flag this and keep org-wide for Active Patients BUT rename the subtitle to accurately reflect "In your organization" — do not ship a lie in the UI.

### Query 2 — Signed Today (clinician-scoped, TZ-correct)

```typescript
// Get clinician timezone from query param
const tz = searchParams.get('tz') || 'UTC';

// Compute today's start in clinician's timezone → convert to UTC for DB
const todayStart = getTodayStartInTimezone(tz);  // helper function, returns ISO UTC string

supabase
  .from('clinical_notes')  // confirm this is the correct table name (was 'notes' in old query)
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .eq('provider_id', clinicianId)
  .eq('status', 'signed')  // verify the exact enum value — could be 'signed', 'SIGNED', or something else
  .gte('signed_at', todayStart)  // use signed_at, NOT created_at — we care when it was signed, not when drafted
```

**Verify first:**
- Is the table `clinical_notes` or `notes`? Old query used `notes` — confirm the correct table
- Does `clinical_notes` have a `signed_at` column? If not, use `updated_at` with a status change filter, OR fall back to `created_at` but flag that as imprecise
- What is the exact value of the signed status enum? Use the true value, not my guess
- Is there a `provider_id` column? Or is the author tracked differently (e.g., `created_by`, `author_id`)?

### Query 3 — Unfinished Notes (clinician-scoped, no time filter)

```typescript
supabase
  .from('clinical_notes')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .eq('provider_id', clinicianId)
  .eq('status', 'draft')
```

### Timezone helper function

Create `src/lib/utils/timezone.ts` (or add to an existing utils file):

```typescript
/**
 * Returns the UTC ISO string for "today 00:00" in the given timezone.
 * Falls back to UTC midnight if the timezone is invalid.
 */
export function getTodayStartInTimezone(timeZone: string): string {
  try {
    // Get current time in the target timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [datePart] = formatter.format(now).split(',');  // "YYYY-MM-DD"
    // Build midnight in that timezone, represented in UTC
    const localMidnight = new Date(`${datePart}T00:00:00`);
    // Adjust for the timezone offset
    const offsetMs = getTimezoneOffsetMs(timeZone, localMidnight);
    return new Date(localMidnight.getTime() - offsetMs).toISOString();
  } catch (error) {
    console.warn(`Invalid timezone "${timeZone}", falling back to UTC`, error);
    const utcMidnight = new Date();
    utcMidnight.setUTCHours(0, 0, 0, 0);
    return utcMidnight.toISOString();
  }
}

function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return utcDate.getTime() - tzDate.getTime();
}
```

**Verify the helper produces correct results** for at least these cases:
- TZ `America/New_York`, current date — should return NY midnight expressed as UTC time (04:00 or 05:00 UTC depending on DST)
- TZ `UTC` — should return UTC midnight today
- TZ `invalid/garbage` — should fall back to UTC midnight, log warning

If there's a simpler/safer timezone library available in the current dependency set, use that instead of rolling this. Check `date-fns` or `date-fns-tz` — if already installed, use it. Do NOT add a new dependency for this.

### Frontend changes — `src/app/(app)/dashboard/page.tsx`

#### StatCards array update

```typescript
const statCards = [
  {
    label: "Active Patients",
    value: stats.activePatients,
    subtitle: "In your panel",  // or "In your organization" if clinician-scope wasn't feasible
    icon: Users,  // keep existing
    href: "/patients",
  },
  {
    label: "Signed Today",
    value: stats.signedToday,
    subtitle: "Notes you signed today",
    icon: CheckCircle,  // or whatever represents "signed/completed"
    href: "/notes",
  },
  {
    label: "Unfinished Notes",
    value: stats.unfinishedNotes,
    subtitle: "Drafts to complete",
    icon: FileText,  // or Edit/Pencil to represent "in-progress"
    href: "/notes",
  },
];
```

#### Send timezone to stats endpoint

```typescript
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const response = await fetch(`/api/dashboard/stats?tz=${encodeURIComponent(tz)}`);
```

#### Refresh on tab focus

```typescript
useEffect(() => {
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      fetchStats();  // the same function as the mount fetch
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

#### Dashboard header copy

If the dashboard greeting says something like "You have X notes completed today" (referring to the old today's notes number), update it to match the new semantics. Be consistent: "You have X signed today" or similar.

---

## Scope boundaries — explicit

### Do NOT touch
- AI note generation pipeline
- ICD-10 code logic
- Smart Triage
- Patient context helper
- Audit logging
- Vitals handling
- Any file outside `dashboard/page.tsx`, `api/dashboard/stats/route.ts`, and the timezone helper

### Do NOT refactor beyond scope
- Don't "improve" unrelated queries
- Don't add TypeScript generics where none existed
- Don't restructure the dashboard layout
- Don't add new features beyond what's specified

---

## Pre-implementation verification

Before writing any code, confirm the following against the current schema. Report results, then proceed:

1. What is the correct clinical-notes table name? (`notes` vs `clinical_notes`)
2. Does that table have `provider_id`, or a different author column?
3. What are the exact enum values for note status? (`draft`, `signed`, `completed`, or something else?)
4. Does that table have `signed_at` or similar timestamp? Or do we need to use `updated_at`?
5. Does the `patients` table have a clinician-scoping column (`provider_id`, `primary_provider_id`, `assigned_clinician_id`)? If no direct column, is there a join table?
6. Is `date-fns` or `date-fns-tz` already a dependency? (Check `package.json` — do NOT add a new one)

If any of these checks reveal a mismatch with the plan above, STOP and report before implementing. We adjust the approach rather than ship broken queries.

---

## Commit structure

Single commit:

**Commit:** `feat(dashboard): clinician-scoped stats with TZ-correct daily reset`

Detailed commit body:
```
Dashboard stat cards revised based on 2026-04-18 product review:

- Active Patients: now clinician-scoped (was org-wide)
- "Today's Notes" → "Signed Today" — signed notes only, 
  scoped to clinician, timezone-correct (was UTC midnight)
- "Pending Encounters" → "Unfinished Notes" — queries 
  clinical_notes.status=draft, no time bounds, clinician-scoped
- Stats fetch now includes browser timezone
- Dashboard refreshes stats on tab focus

Semantic fixes:
- "Today's Notes" subtitle previously said "Completed today" but 
  query counted all statuses. Now matches reality.
- "Pending Encounters" was unbounded in time, accumulating ghost 
  no-shows. Replaced with draft-note workload, which is the actual 
  clinician pain point.
- All three cards previously org-wide despite personal copy. Now 
  match the "your dashboard" framing.

Timezone:
- Uses Intl.DateTimeFormat().resolvedOptions().timeZone from browser
- Falls back to UTC on invalid timezone with warning
```

Push with `--no-verify`.

---

## Reporting after commit

- Commit SHA
- Vercel deploy status
- Pre-implementation verification results (the 6 schema questions above)
- Files changed with one-line description
- Local `npm run build` result
- Which timezone approach was used (handwritten helper vs existing library)
- Any adjustments made because schema didn't match the plan — flag each one

---

## Roadmap items to capture (follow-ups, do not fix now)

Append to `OBSERVABILITY_ROADMAP.md`:

```markdown
### Dashboard stats follow-ups (from 2026-04-18 overhaul)

- [ ] `count: 'exact'` on three tables per dashboard load is a latency 
      risk at scale. Confirm indexes exist on (organization_id, status, 
      provider_id) tuples for patients, clinical_notes (for both draft 
      and signed filters), and validate query plans at N=10k+.

- [ ] RLS policy audit. API-level scoping is the only visible safety 
      boundary on the stats endpoint. Confirm Supabase RLS policies 
      exist on `patients` and `clinical_notes` that enforce 
      organization_id and provider_id filtering at the DB level.

- [ ] Timezone as user profile field. Currently using browser-detected 
      TZ, which works but drifts if clinician travels. Add optional 
      profile override so clinicians can pin a clinic timezone 
      regardless of device.

- [ ] Admin dashboard with org-wide stats. Dashboard is now 
      clinician-scoped. Create a separate dashboard for BUSINESS_ADMIN 
      / PRACTICE_MANAGER roles that shows org-wide numbers.

- [ ] Reconciliation workflow for no-show encounters. Previous 
      "Pending Encounters" card inadvertently surfaced stale scheduled 
      encounters never marked as completed or cancelled. Clinic 
      operations needs a way to surface and reconcile these.

- [ ] Add calendar/schedule view as a separate dashboard card or 
      widget. Old "Pending Encounters" was trying to answer "what's 
      coming up?" — that's a real clinician question still worth 
      surfacing, but as a schedule view, not a pending count.
```

---

## Testing plan (user will run after deploy)

### Test 1 — Active Patients is clinician-scoped
1. Log in as Test Clinician
2. Note the "Active Patients" value
3. If possible, log in as a second clinician in the same org (or use admin to check)
4. Verify the count reflects THIS clinician's panel, not the whole org

Skip if only one clinician exists — trust the query.

### Test 2 — Signed Today reflects truth
1. Before signing anything today: note the "Signed Today" value
2. Sign a note (complete and submit)
3. Hard reload dashboard
4. Verify Signed Today incremented by 1
5. Generate and save a DRAFT (don't sign)
6. Hard reload dashboard
7. Verify Signed Today did NOT change (drafts don't count)

### Test 3 — Timezone correctness
1. Note current time in your local timezone
2. If local time is before UTC midnight: Signed Today should show today's signed notes
3. Sign a note
4. Dashboard should increment (regardless of UTC time)
5. Tomorrow at local 00:01, dashboard should reset to 0 even if UTC hasn't flipped

Test 3 hard to verify quickly — trust the query logic.

### Test 4 — Unfinished Notes shows drafts
1. Note the "Unfinished Notes" value
2. Create a draft (don't sign)
3. Hard reload dashboard
4. Verify Unfinished Notes incremented by 1
5. Sign the draft
6. Hard reload dashboard
7. Verify Unfinished Notes decremented by 1

### Test 5 — Tab focus refresh
1. Open dashboard, note all three values
2. Switch to another tab/app for 30 seconds
3. Create a draft note (in another tab or by opening dashboard in second window — depends on your setup)
4. Return to the dashboard tab
5. Values should refresh automatically without hard reload

### Test 6 — Click-through
1. Click "Active Patients" → /patients
2. Click "Signed Today" → /notes
3. Click "Unfinished Notes" → /notes
4. All three should load their destination pages correctly

Report pass/fail per test.

Proceed.