# FIX_AUDIT_LOG_NULL_ENTITY_TYPE.md

## Task — SCOPED PATCH, NOT REFACTOR

Production logs show audit log writes are failing with two distinct errors:

**Error 1:**
```
AUDIT_LOG_DB_WRITE_FAILED: null value in column "entity_type" of relation 
"audit_logs" violates not-null constraint
```

**Error 2:**
```
AUDIT_LOG_DB_WRITE_FAILED: TypeError: fetch failed
```

This is a HIPAA-critical issue — every PHI access must be audit-logged successfully. Silent audit log failures mean the access record is incomplete.

Read `CLAUDE.md` first for engineering standards. Also read `OBSERVABILITY_ROADMAP.md` to understand the broader audit log refactor that is FLAGGED BUT OUT OF SCOPE for this fix.

---

## IMPORTANT — scope discipline

**This is a PATCH, not a refactor.** We are fixing the specific errors in the logs. We are NOT:
- Rearchitecting the audit log system
- Deciding failure policy (blocking vs non-blocking vs queued) — that's the roadmap work
- Adding monitoring/alerting — that's the roadmap work
- Auditing historical log gaps — that's the roadmap work
- Changing the audit log table schema

If you find yourself thinking "I should also fix X while I'm here," STOP and add X to the roadmap instead. This fix must ship in one session without scope creep.

---

## Step 1 — Diagnostic (report back BEFORE fixing)

Do NOT make changes yet. Investigate both errors:

### Error 1 — null `entity_type` diagnostic

**1a.** Find the audit log function and its expected signature:
```
grep -rn "logAuditEvent\|writeAuditLog\|AUDIT_LOG_DB_WRITE_FAILED" src/lib/
```

Report:
- File path of the audit log helper function
- The function signature (what parameters it expects)
- Whether `entity_type` is a required parameter
- The `audit_logs` table schema (check migrations for the CREATE TABLE statement)

**1b.** Find the call site triggering the NULL entity_type error:
The error appeared on `GET /api/patients` and `GET /api/patients/9c50ac6f-...`. Grep for audit log calls in these routes:
```
grep -rn "logAuditEvent\|audit" src/app/api/patients/
```

Report:
- Every audit log call in the patients API
- Which ones are passing `entity_type` and which are NOT
- The exact call site(s) likely responsible for the NULL error

### Error 2 — `TypeError: fetch failed` diagnostic

**1c.** This error suggests the audit log is making an HTTP/fetch call somewhere. Investigate:
- Does the audit log helper call Supabase via HTTP (REST) or via the JS client?
- Is there an external audit log service being called?
- Is there a retry / timeout configuration?

Report findings briefly.

**1d.** Report diagnostic findings and wait for my approval before Step 2. Do NOT start fixing.

---

## Step 2 — Execute the targeted fixes (after my approval)

### Fix A — Ensure entity_type is always passed

For each call site identified in Step 1b that is missing `entity_type`:
- Add the correct `entity_type` value based on what resource the audit log is describing
- Valid values are likely `patient`, `encounter`, `note`, `user`, `invitation` — match existing patterns in the codebase
- If uncertain what value to use at a specific call site, ASK before guessing

Additionally, add a **defensive check inside the audit log helper**:
- If `entity_type` is null/undefined when the function is called, throw an explicit error BEFORE the database call
- The error message should name the calling function and indicate which field is missing
- This prevents future silent NULL-entity_type failures — they become loud TypeScript/runtime errors instead

### Fix B — `TypeError: fetch failed` mitigation

This is harder to diagnose without seeing the code. Two likely causes:

**If the audit log uses the Supabase JS client:**
- The `fetch failed` could be transient network issue to Supabase
- Add a single retry with exponential backoff (max 2 retries, total time ≤ 3 seconds)
- After retries exhausted, log the failure loudly (which it already does) and re-throw — do NOT silently swallow

**If the audit log calls an external service:**
- Stop and ask — we need to decide architecturally before touching this

**If you cannot determine the cause of `fetch failed` after reasonable investigation:**
- Add the retry pattern anyway (it helps with transient issues)
- Log the specific error cause inside the retry loop (so next time we have better diagnostics)
- Move on — do not spiral on this

### CRITICAL — do NOT change failure policy

Whatever the audit log function currently does on failure (silent log + continue, throw, return error), **do not change that behavior in this patch**. That decision is the roadmap refactor. We are fixing the immediate errors, not redesigning.

---

## Step 3 — Verify and commit

1. `npm run build` passes locally
2. Run any existing tests for the audit log helper or patient API
3. Manual test if feasible locally: trigger a patient view, confirm no AUDIT_LOG_DB_WRITE_FAILED in local logs
4. Commit as two commits:

**Commit 1:** `fix(audit-log): ensure entity_type passed at all call sites`
**Commit 2:** `fix(audit-log): add retry with backoff for transient fetch failures`

Push both with `--no-verify`.

---

## Reporting

After Step 1: diagnostic findings + wait for approval.

After Step 3:
- Both commit SHAs
- Files changed per commit
- Local build result
- Pre-commit checklist per CLAUDE.md
- Any call sites you found where you were UNSURE which `entity_type` to use (I'll review)
- Confirmation that failure policy was NOT changed
- Vercel deploy status

---

## Cross-cutting constraints

- Respect CLAUDE.md standards
- No new env vars, no new dependencies
- No schema changes to audit_logs table
- No other "while I'm here" refactors
- If the scope grows beyond "fix these two specific errors," STOP and add to roadmap

---

## Why this scope discipline matters

The full audit log refactor (failure policy, monitoring, historical gap audit, architectural review) is a proper engineering task that needs clear head, Codex verification, and probably 4-8 hours of dedicated work. It's the right thing to do — just not bundled with a rushed fix tonight.

What this patch delivers:
- The two specific errors in the logs stop occurring
- Future NULL-entity_type errors become loud (defensive check)
- Transient network issues get a retry

What this patch does NOT deliver (and should not):
- A guarantee that audit logging is now fully reliable
- A systematic fix for all audit log silent-failure risks
- Compliance-ready audit log coverage

Those remain as roadmap items for dedicated work.