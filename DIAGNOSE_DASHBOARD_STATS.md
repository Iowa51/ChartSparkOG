# DIAGNOSE_DASHBOARD_STATS.md

## Task

Report exactly how each dashboard stat card computes its displayed value. No fixes — diagnostic only.

Read `CLAUDE.md` for engineering standards.

---

## Context

The dashboard at `src/app/(app)/dashboard/page.tsx` displays three stat cards:
- Active Patients
- Today's Notes
- Pending Encounters

The product question to answer: do these numbers reset, on what schedule, and is that the intended behavior?

Before making any product decisions, we need to know what the cards currently measure.

---

## Step 1 — Report per-card diagnostic

For each of the three stat cards, answer these questions:

### 1a — Active Patients

- **Source:** Where is the value computed? (API endpoint, server component, client fetch, cached?)
- **Query:** What SQL / ORM query computes this value? Paste the query or the data-layer call.
- **Filters applied:**
  - Time filter: any `created_at`, `updated_at`, `last_visit` bounds?
  - Status filter: what status values count as "active"? (e.g., `status = 'active'`, or excluding archived/inactive?)
  - Scope filter: organization_id? provider_id (clinician-specific)? all patients regardless of clinician?
- **Caching:** Is the value cached at the data layer, API layer, or client? Or freshly computed on every dashboard load?
- **Timezone:** Does any part of the query consider timezone? What timezone is used?

### 1b — Today's Notes

Same set of questions as above, specifically:

- Does "today" mean "last 24 hours rolling" OR "since local midnight" OR "since UTC midnight" OR "this calendar date in some timezone"?
- What note statuses are counted? (all? signed? drafts? both?)
- Organization-scoped or clinician-scoped?
- Include amendments / edits or only original creations?

### 1c — Pending Encounters

Same set of questions, specifically:

- What encounter statuses count as "pending"? (scheduled? in_progress? both? other?)
- Is there a time filter? (today's scheduled? next 7 days? all future?)
- Is there an upper bound? (next 24 hours? this week? unbounded future?)
- Clinician-scoped or organization-scoped?
- Does it include past-dated scheduled encounters that were never completed (no-shows)?

---

## Step 2 — Cross-card behavior analysis

- Are the three cards using the same fetching pattern (single API call? three separate calls? all inline in the page component)?
- Is there a shared stats API endpoint (e.g., `/api/dashboard/stats`) or does each card fetch independently?
- Do any of the cards refresh automatically while the dashboard is open, or only on page navigation / hard reload?

---

## Step 3 — Identify the practical "reset" behavior

Based on your findings, for each card answer:

- **Reset cadence:** When does this counter change value without the clinician explicitly doing anything?
  - Midnight local time → "Daily reset" (e.g., Today's Notes if filtered by calendar date)
  - Midnight UTC → "UTC daily reset" (common bug — resets at different wall-clock time for different timezones)
  - Rolling window → Never "resets" but drifts continuously as time passes (last 24h)
  - Never → Only changes when DB state changes (not time-based at all)
- **Timezone considerations:** Does timezone behavior make sense for a clinical EHR, or would it surprise a clinician (e.g., resetting at a strange hour)?

---

## Step 4 — Flag any concerns

Based on findings, note:

1. Are any of the queries inefficient (no index on filtered columns, full table scan)?
2. Are there logic bugs (e.g., "Pending Encounters" counting cancelled ones, "Today's Notes" counting notes from tomorrow due to UTC/local mismatch)?
3. Any security / RLS concerns (e.g., a clinician seeing counts from other organizations' data)?
4. Any cases where the card's LABEL doesn't match what the query actually computes? (We already found one: "Pending Encounters" card → page that has no "pending" status. Look for more.)

Report these as separate flagged items, not fixes.

---

## Reporting format

Use this structure:

```
## Active Patients
Source:
Query:
Filters:
  - Time:
  - Status:
  - Scope:
Caching:
Timezone:
Reset behavior:
Concerns flagged:

## Today's Notes
(same structure)

## Pending Encounters
(same structure)

## Cross-card patterns
(shared fetching logic, API structure, refresh behavior)

## Summary
- Card-by-card practical reset cadence
- Any bugs or concerns found
- Recommended product-decision questions for me to answer before any fix
```

---

## Cross-cutting constraints

- DO NOT FIX ANYTHING
- DO NOT REFACTOR
- DO NOT "improve" queries while reporting
- Report current state only

Wait for my follow-up after review.