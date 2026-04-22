# FIX_TODAYS_NOTES_CARD.md

## Context

Commit 0578db0 wired the dashboard "Today's Notes" card to `/notes?status=completed`. When clicked, the /notes page errors with "Failed to fetch notes."

Root cause: same issue as /encounters?status=pending. The /notes page does not support URL status query params — it uses tab-based state only (All Notes / Signed / Drafts). The string "completed" is not a valid note status enum either.

## Fix

In `src/app/(app)/dashboard/page.tsx`, change the "Today's Notes" card href from `/notes?status=completed` to plain `/notes`.

One-line change.

## Also

While in the dashboard file, verify whether any OTHER dashboard cards route to query params that destination pages might not handle. Briefly confirm:
- Active Patients → `/patients` — does /patients accept/ignore any query params passed to it?
- Pending Encounters → `/encounters` (already confirmed ignores query params, plain URL)
- Today's Notes → `/notes` (this fix)

If any other card has a similar mismatch, flag it in your report but do not change it without approval.

## Commit

Commit message: `fix(dashboard): remove unsupported query param from Today's Notes card`

Push with `--no-verify`.

## Roadmap capture

Append to `OBSERVABILITY_ROADMAP.md`:

```markdown
- [ ] Notes page URL status filter support. /notes page uses tab-based 
      state only (All Notes / Signed / Drafts) and ignores URL query 
      params. Dashboard "Today's Notes" card originally tried 
      /notes?status=completed which broke because: (a) page doesn't read 
      the param, (b) "completed" isn't even a valid note status enum. 
      Either add useSearchParams support to /notes with the actual valid 
      statuses, or remove URL-filter-style entry points into /notes. 
      Same architectural pattern as "Pending Encounters" bug already on 
      roadmap.
```

## Report

- Commit SHA
- Vercel deploy status
- Confirmation of the href change
- Any other dashboard card query-param mismatches found (flagged, not fixed)

Run `npm run build` before pushing.