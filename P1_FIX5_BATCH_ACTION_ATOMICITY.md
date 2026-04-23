# P1_FIX5_BATCH_ACTION_ATOMICITY.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

The auditor batch-action route at src/app/api/auditor/batch-action/route.ts updates submission status first, then inserts audit_flags afterward. If the audit_flags insert fails, the submission status is already changed with no reason trail. There is also no canonical audit event emitted for approve/flag actions.

## Fix

### Step 1: Read the current state

Read src/app/api/auditor/batch-action/route.ts completely. Understand:
- What actions it supports (approve, flag, etc.)
- How it updates submissions
- How it inserts audit_flags
- Whether it emits any audit events

### Step 2: Make the flag flow atomic

For the flag action:
1. Do NOT update the submission status until after the audit_flags insert succeeds
2. Reverse the order: insert audit_flags first, then update submission status
3. If audit_flags insert fails, return an error and do NOT update submission status
4. If submission status update fails after audit_flags succeeded, attempt to delete the audit_flags row to avoid orphans (best effort)

### Step 3: Make the approve flow audited

For the approve action:
1. After updating submission status, emit an audit event
2. Use logAuditEvent with eventType SUBMISSION_REVIEW (we just added this in P1-4), resourceType 'submission'
3. Include previous status, new status, and submission ids in details

### Step 4: Add audit events for flag action too

After both audit_flags insert and submission status update succeed:
1. Emit logAuditEvent with eventType SUBMISSION_REVIEW, resourceType 'submission'
2. Include flag reason, previous status, new status

### Step 5: Handle partial failures gracefully

If processing multiple submissions in a batch:
- Track successes and failures separately
- Do not let one failure abort the entire batch
- Return { results: [{ id, status: 'success'|'failed', error? }] }

## Important

- Do not change the route's URL or auth requirements
- Do not break existing callers
- Keep the batch capability (multiple submission ids)

## After

npm run build. Commit:
git add -A
git commit -m "fix: P1 auditor batch-action atomicity with ordered operations and audit logging" --no-verify

Report: files changed, what order operations now execute in, SHA.