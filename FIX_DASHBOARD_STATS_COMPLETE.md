# FIX_DASHBOARD_STATS_COMPLETE.md

## Context

Codex adversarial verification of commit `052f879` identified 3 bugs + 1 UX mismatch. SQL verification in production confirms:

- **`clinical_notes` table has 52 rows** (18 signed, 16 draft, 18 in other statuses — likely `completed` and `amended`)
- **`notes` table has 0 rows** — completely empty, never written to
- The dashboard stats route at `src/app/api/dashboard/stats/route.ts` queries `notes` instead of `clinical_notes`

This means the dashboard has been counting an empty table. Every dashboard number we've seen was meaningless.

Read `CLAUDE.md` first.

---

## Fixes required (single feature commit)

### Fix 1 — Rewrite timezone helper using date-fns-tz

**Current state:** `src/lib/utils/timezone.ts` is broken. Codex proved it returns wrong UTC timestamps for every valid timezone tested (UTC, America/New_York, America/Los_Angeles, Asia/Tokyo). The helper relies on `new Date("YYYY-MM-DDTHH:mm:ss")` which is parsed in the server's local timezone, leaking server TZ into every calculation.

**Fix:** Install `date-fns-tz` as a dependency. This is an approved exception to the "no new dependencies" rule — the correctness risk of handwritten TZ math is too high.

**Implementation:**

```bash
npm install date-fns-tz
```

Rewrite `src/lib/utils/timezone.ts`:

```typescript
import { zonedTimeToUtc, format } from 'date-fns-tz';

/**
 * Returns the UTC ISO string for "today 00:00" in the given IANA timezone.
 * Falls back to UTC midnight if the timezone is invalid.
 */
export function getTodayStartInTimezone(timeZone: string): string {
  try {
    // Get current date in the target timezone as YYYY-MM-DD
    const nowInTz = format(new Date(), 'yyyy-MM-dd', { timeZone });
    // Construct midnight in that timezone, convert to UTC
    const midnightUtc = zonedTimeToUtc(`${nowInTz} 00:00:00`, timeZone);
    return midnightUtc.toISOString();
  } catch (error) {
    console.warn(`Invalid timezone "${timeZone}", falling back to UTC`, error);
    const utcMidnight = new Date();
    utcMidnight.setUTCHours(0, 0, 0, 0);
    return utcMidnight.toISOString();
  }
}
```

### Fix 2 — Correct table name in dashboard stats

**Current state:** `src/app/api/dashboard/stats/route.ts` queries `.from('notes')` at lines 36 and 43.

**Fix:** Change both queries to `.from('clinical_notes')`. This aligns the dashboard with the rest of the app, which uses `clinical_notes` everywhere (see `src/app/api/notes/route.ts:42`, `src/app/api/notes/[id]/route.ts:26`, `src/app/api/notes/[id]/sign/route.ts:27`).

Verify the column names used by the dashboard queries (`organization_id`, `provider_id`, `status`, `signed_at`) all exist on `clinical_notes`. This was already verified earlier today — `clinical_notes.cpt_codes` and `clinical_notes.icd10_codes` columns confirmed in production, and the main CRUD paths use it successfully.

If any column is missing on `clinical_notes` that exists on `notes`, STOP and report.

### Fix 3 — Include 'completed' status in appropriate queries

**Current state:** The dashboard counts `status = 'signed'` for Signed Today and `status = 'draft'` for Unfinished Notes. Production data shows 18 rows in OTHER statuses (likely `completed` and `amended`). These rows are currently invisible to both cards.

**Investigation required first:** Determine what `completed` and `amended` mean in this workflow.

Run this diagnostic in the `clinical_notes` data layer:

```bash
grep -rn "status.*completed\|status.*amended" src/ --include="*.ts"
```

Look for:
- Where does `status` get set to `'completed'`? Is it a transient state before signing, or a final state?
- Where does `status` get set to `'amended'`? Is it the result of editing a signed note (HIPAA-compliant amendment workflow)?

**Based on findings, decide:**

**Option A — `completed` IS pre-signing:** Include in Unfinished Notes (drafts + completed-but-unsigned = clinician's remaining work). `amended` is its own final state, show nowhere on dashboard.

**Option B — `completed` means `signed` (two names for the same end state):** Include in Signed Today. `amended` also counts as signed.

**Option C — Both `completed` and `amended` are end states for different flows:** Include BOTH in Signed Today alongside `signed`.

**Report which option applies and implement accordingly.** If the state model is genuinely ambiguous and can't be determined from the code, default to **Option C** (include `completed`, `signed`, and `amended` in Signed Today; keep Unfinished Notes as `draft` only). Flag the ambiguity in the commit message for a follow-up clarification.

### Fix 4 — Active Patients card UX styling

**Current state:** `src/app/(app)/dashboard/page.tsx:217` renders only two branches: `"positive"` vs everything else. The `"neutral"` changeType on the Active Patients card at line 102 falls through to the amber warning branch with an `AlertTriangle` icon.

**Fix:** Add explicit handling for `"neutral"`:

- Neutral: gray text, no icon or a neutral icon (e.g., Minus, ArrowRight), no amber background
- Positive: existing green styling
- Other / "warning" / "negative": existing amber styling (or make this explicit too if appropriate)

Keep the changeType values currently in use (`"positive"`, `"neutral"`, etc.) — just handle them correctly in the rendering conditional.

### Fix 5 — Tab-focus fetch race condition

**Current state:** Rapid tab switches can trigger overlapping fetches. Codex flagged this as a secondary risk.

**Fix:** Add an abort controller or a "fetch in flight" guard to the `fetchDashboardData` callback. Simplest approach: use an `AbortController` that gets cancelled on next invocation.

```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const fetchDashboardData = useCallback(async (options?: { showLoading?: boolean }) => {
  // Cancel any in-flight request
  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;
  
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await fetch(`/api/dashboard/stats?tz=${encodeURIComponent(tz)}`, {
      signal: controller.signal,
    });
    // ... rest of logic
  } catch (error) {
    if ((error as Error).name === 'AbortError') return; // expected on rapid switches
    // ... existing error handling
  }
}, []);
```

Ensure the abort controller is cleaned up on unmount.

---

## Scope boundaries — explicit

### Do NOT touch
- AI note generation pipeline
- ICD-10 code logic  
- Smart Triage
- Patient context helper
- Audit logging
- Any file outside the three modified by commit 052f879, plus `package.json` / `package-lock.json` for the new dep

### Do NOT refactor beyond scope
- Don't rewrite the rendering logic for stat cards unless necessary for Fix 4
- Don't restructure the API route beyond the fixes listed
- Don't add features not in this spec

### Do NOT attempt to consolidate `notes` and `clinical_notes` tables
- That's a separate project (schema migration, RLS policies, data migration for the 0-row case it's trivial but still a migration)
- This fix only corrects which table the dashboard reads
- The `notes` table's future is roadmap territory

---

## Pre-implementation verification

Before writing any code, confirm:

1. `npm install date-fns-tz` succeeds
2. `clinical_notes` table has columns: `organization_id`, `provider_id`, `status`, `signed_at` (quick SQL verify or Supabase type definitions)
3. Status enum on `clinical_notes` confirms the 4 values: `draft | completed | signed | amended`
4. Result of the grep for `status.*completed` and `status.*amended` — what does the code tell us about the state model?

Report these BEFORE making changes. Wait for my approval only if something unexpected surfaces.

---

## Commit structure

**Single commit:**

```
fix(dashboard): correct TZ math, table name, status model, and UX styling

Fixes Codex adversarial verification findings on commit 052f879:

1. Timezone helper rewritten using date-fns-tz. The previous handwritten 
   Intl.DateTimeFormat helper leaked server local timezone into every 
   calculation, producing wrong UTC timestamps for UTC, EDT, PDT, JST, 
   and DST transitions. Approved exception to "no new deps" rule given 
   the correctness risk.

2. Dashboard stats queries changed from `notes` table to `clinical_notes`. 
   Production SQL verification confirmed `notes` has 0 rows while 
   `clinical_notes` has 52 rows (18 signed, 16 draft, 18 in other 
   statuses). The rest of the app's note CRUD uses clinical_notes.

3. Signed Today query now includes [completed/signed/amended | signed 
   only | signed + completed] based on status model investigation. 
   [CC fills in the actual resolution.]

4. Dashboard stat card rendering handles "neutral" changeType explicitly 
   instead of falling through to amber warning styling.

5. Tab-focus fetch now uses AbortController to cancel in-flight requests 
   on rapid tab switches, preventing race conditions.
```

Push with `--no-verify`.

---

## Reporting after commit

- Commit SHA
- Vercel deploy status
- Pre-implementation verification results (step numbered above)
- Which status-model option (A/B/C) was chosen for Fix 3, and why
- date-fns-tz version installed
- Local `npm run build` result
- Files changed (expected: `src/lib/utils/timezone.ts`, `src/app/api/dashboard/stats/route.ts`, `src/app/(app)/dashboard/page.tsx`, `package.json`, `package-lock.json`)
- Confirmation that the helper returns CORRECT UTC timestamps for the 4 Codex test cases (UTC, America/New_York, America/Los_Angeles, Asia/Tokyo) — run a quick Node script or add a test to verify
- Any ambiguities encountered, flagged for roadmap

---

## Roadmap items to capture

Append to `OBSERVABILITY_ROADMAP.md`:

```markdown
- [ ] Consolidate `notes` vs `clinical_notes` tables. `notes` table is 
      empty and orphaned after 2026-04-18 fix. Either (a) drop `notes` 
      and its RLS policies if nothing references it, or (b) migrate any 
      remaining writers to `clinical_notes` first. Schema tech debt.

- [ ] Document note status state machine. The `draft | completed | 
      signed | amended` enum lacks a documented state transition model. 
      Create an ADR or inline documentation explaining which transitions 
      are allowed and what each state means.

- [ ] Timezone unit tests. Add unit tests for 
      `getTodayStartInTimezone` covering: UTC identity, EDT, PDT, 
      JST, DST spring-forward in America/New_York (2025-03-09), 
      DST fall-back in America/New_York (2025-11-02), extreme offsets 
      (Pacific/Kiritimati +14, Pacific/Niue -11), invalid TZ strings.
```

---

## Testing plan

### Test 1 — Timezone helper returns correct values
1. On the deployed Vercel instance, check the Function logs after a dashboard load
2. The `tz` query param should be your browser's actual timezone
3. The resulting `todayStart` should be midnight local time expressed as UTC

Alternative: CC adds a quick Node script in the commit that runs the 4 Codex test cases and asserts correctness. This is the best approach — catches regressions instantly.

### Test 2 — Dashboard shows real numbers
1. Before clicking dashboard, note: production has 18 signed notes, 16 drafts
2. Dashboard "Signed Today" should show the count of notes signed TODAY (not all 18 unless all were signed today)
3. Dashboard "Unfinished Notes" should show drafts owned by Test Clinician (likely close to 16 if all drafts are Test Clinician's)

Before fix: likely showed 0 / 0 / 0 because querying the empty `notes` table.

### Test 3 — Active Patients styling
1. Look at the Active Patients card
2. Verify it uses neutral/gray styling, not amber warning with AlertTriangle icon

### Test 4 — Status model verification
1. After the fix, "Unfinished Notes" + "Signed Today" should roughly account for all the clinician's notes (minus any older signed ones outside today's window)
2. If 18 "other status" notes are invisible to the dashboard, something is wrong

### Test 5 — Tab focus race
1. Open dashboard
2. Rapidly switch tabs 3-5 times within a second
3. Only ONE fetch should ultimately populate the UI (others aborted)
4. Check network tab: earlier requests should show "cancelled"

Proceed with all four fixes. Report as specified.