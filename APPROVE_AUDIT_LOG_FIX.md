# APPROVE_AUDIT_LOG_FIX.md

## Approval Status

Approved to proceed with Step 2 of FIX_AUDIT_LOG_NULL_ENTITY_TYPE.md with specific clarifications below.

Excellent diagnostic work. You correctly identified:
1. The primary NULL culprit (`PATIENT_SEARCH` at `route.ts:57`)
2. The schema drift (production uses legacy compact schema, not modern `resource_type` nullable schema)
3. The unapplied migration `20260407_fix_audit_logs_schema.sql`
4. The missing retry logic for transient fetch failures
5. The scope limits (patients routes only, not notes/encounters)

---

## Clarification 1 — Fix all 4 call sites in /api/patients/

You identified 3 confirmed call sites and 1 unread (`[id]/documents/route.ts:126`).

**Action:** Read `[id]/documents/route.ts:126` in Step 2, and if it's missing `resourceType`, fix it the same way. If it already passes `resourceType`, note that and move on.

For `src/app/api/patients/route.ts:57` (the PATIENT_SEARCH call):
- Add `resourceType: "patient"` — even though this is a list/search operation, the audit event IS about patient access
- For `resourceId`, pass the search query or filters as metadata in a string format (or omit if the helper handles missing resourceId gracefully) — use your judgment. A search event doesn't have a single resource, but the audit must still record WHAT was searched for

---

## Clarification 2 — Add the defensive guard in logAuditEvent

Approved as you described. Add at the top of `logAuditEvent` (before the DB insert):

```typescript
if (!entry.resourceType) {
  logError({ 
    action: 'AUDIT_LOG_MISSING_ENTITY_TYPE', 
    eventType: entry.eventType,
    callSite: new Error().stack?.split('\n')[2] || 'unknown'
  });
  throw new Error(`Audit log missing required resourceType for eventType=${entry.eventType}`);
}
```

The `new Error().stack` trick captures the caller's location so future NULL-entity_type violations are LOUD and point at the offending call site immediately.

For `logAuditEventAsync`: Since it already swallows errors, the defensive throw will be caught there. That's fine — the `logError` call above is what makes it visible in production logs (via sanitizeError). The key behavior is that we get a clear error message instead of a cryptic DB constraint violation.

---

## Clarification 3 — Retry with backoff

Approved as per spec:
- Max 2 retries (so 3 total attempts)
- Exponential backoff: 200ms, 600ms (total ≤3s well under the limit)
- Apply inside `logAuditEvent` around the `supabase.from('audit_logs').insert(...)` call ONLY
- Do NOT retry for constraint violations or other errors that indicate a data problem — only retry for network-level errors (`TypeError: fetch failed`, timeout errors)
- After retries exhausted, preserve existing behavior (logError + continue, no throw from the audit log itself)

---

## Clarification 4 — Failure policy preservation

Confirmed not changing. `logAuditEvent` catches and logs, `logAuditEventAsync` swallows. Keep both behaviors.

---

## Clarification 5 — Out-of-scope items to capture in roadmap (add to end of commit message)

**Do not fix these, but include them in the commit message body so we don't lose them:**

1. **Pending audit_logs migration never applied**: `supabase/migrations/20260407_fix_audit_logs_schema.sql` exists in the repo but was not applied to production. Production still uses the legacy compact schema (`entity_type NOT NULL`, `entity_id`, `action`). Either (a) apply the migration to modernize the schema or (b) update `schema.sql` to match the legacy production schema. Whichever direction, pick one and commit — the current state is ambiguous.

2. **Other API routes likely have the same bug**: notes, encounters, users, invitations routes all make audit log calls. Any call missing `resourceType` will trigger the same NULL-entity_type error when exercised. The defensive check added in this commit will surface them loudly, but a proactive grep + audit across all `src/app/api/` handlers is warranted.

3. **Broader audit log systemic review** (out of scope for this patch, per `OBSERVABILITY_ROADMAP.md`): failure policy decision, monitoring/alerting, historical gap audit, architectural review.

---

## Commit structure

Two commits if both fixes are deployed:

**Commit 1:** `fix(audit-log): ensure entity_type passed at all patient API call sites`
- Fix `src/app/api/patients/route.ts:57` PATIENT_SEARCH call
- Fix `src/app/api/patients/[id]/documents/route.ts:126` if missing
- Add defensive guard in `logAuditEvent` for null `resourceType`

**Commit 2:** `fix(audit-log): add retry with backoff for transient fetch failures`
- Add retry loop around `supabase.from('audit_logs').insert()`
- Retry only on `TypeError: fetch failed` and timeout errors
- Preserve existing swallow-and-continue failure policy

Push both with `--no-verify`.

---

## Reporting requirements

After commits pushed:

1. Both commit SHAs
2. Files changed per commit with brief description
3. Local `npm run build` result
4. Pre-commit checklist per CLAUDE.md
5. Vercel deploy status
6. Explicit reminder to James: "Three roadmap items: (a) apply or void `20260407_fix_audit_logs_schema.sql`, (b) grep all `/api/` routes for audit log calls missing resourceType, (c) broader audit log architecture review deferred as previously documented."
7. Confirmation that failure policy was NOT changed

---

## Testing plan (user will run)

After Vercel deploy:

1. Log in as Test Clinician
2. Navigate to patient list — Vercel logs should NOT show AUDIT_LOG_DB_WRITE_FAILED on `GET /api/patients`
3. Open a specific patient — Vercel logs should NOT show AUDIT_LOG_DB_WRITE_FAILED on `GET /api/patients/:id`
4. Create an encounter — note: encounter audit logs are OUT OF SCOPE and may still fail here. If they do, we'll capture in the roadmap follow-up.
5. Query Supabase:
```sql
SELECT id, action, entity_type, entity_id, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```
Should see recent entries for patient_search, phi_read actions with `entity_type = 'patient'`.

If any new `AUDIT_LOG_MISSING_ENTITY_TYPE` errors appear in Vercel logs after deploy, that means a call site was missed. Paste it to James — the defensive check did its job.

---

## Cross-cutting constraints (unchanged from original spec)

- No new deps, no new env vars
- No schema changes to audit_logs table
- No changes to supabase/migrations/20260407_fix_audit_logs_schema.sql in this commit
- No failure policy changes
- No touching notes/encounters/other audit call sites
- If scope grows beyond these 4 files (patients/route.ts, patients/[id]/documents/route.ts, security/audit-log.ts), STOP and report

Proceed with Step 2 now.