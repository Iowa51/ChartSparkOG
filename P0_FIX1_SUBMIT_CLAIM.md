# P0_FIX1_SUBMIT_CLAIM.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

When a clinician clicks "Submit Claim" on an approved note, the UI calls PATCH /api/notes/[id] with { status: 'signed', signed_at } and shows "Claim submitted! Note signed and locked." But NO billing_claims record is ever created. Revenue is silently lost while the chart appears complete.

The false-success path is at:
- src/app/(app)/notes/[id]/page.tsx lines ~234-253 (handleSubmitClaim function)
- src/app/(app)/notes/[id]/page.tsx lines ~765-774 (Submit Claim button)

## Fix

### Step 1: Read the current state

Read these files to understand the existing billing infrastructure:
- src/app/(app)/notes/[id]/page.tsx (the handleSubmitClaim function)
- src/app/api/notes/[id]/route.ts (the PATCH handler)
- src/lib/managed-billing/claim-generator.ts (existing claim generation logic)
- src/app/api/managed-billing/claims/ directory (existing claim endpoints)

Find out: does a claim creation endpoint already exist? What data does it need? What table does it write to?

### Step 2: Fix handleSubmitClaim

Replace the current false-success flow with a real billing flow. The function should:

1. First, create the billing claim by calling the appropriate managed-billing endpoint (or create one if none exists). The claim needs at minimum:
   - note_id (the current note)
   - patient_id
   - encounter_id (if available)
   - provider_id
   - organization_id
   - cpt_codes (from the note)
   - icd10_codes (from the note)
   - status: 'pending' or 'created'

2. Only AFTER the claim creation succeeds, transition the note to signed status via PATCH /api/notes/[id] with { status: 'signed', signed_at }.

3. If claim creation fails, show the error to the user and do NOT transition the note. The note stays approved.

4. Update the success message to accurately reflect what happened.

### Step 3: Prevent raw status bypass

In src/app/api/notes/[id]/route.ts PATCH handler, add a guard: if the incoming status is 'signed' and the note's current status is 'approved', reject with 400 and message "Use the Submit Claim workflow to sign approved notes." This prevents anyone from bypassing the billing step by sending a raw PATCH.

Exception: if the note status is 'pending_review' or 'completed', the sign route at /api/notes/[id]/sign should still work normally. Only block the approved -> signed shortcut.

### Important

- Do NOT break existing sign flows (draft -> pending_review -> approved is handled by other routes)
- Do NOT modify the /api/notes/[id]/sign route
- If no claim creation endpoint exists, create a minimal one at /api/managed-billing/claims/route.ts POST that inserts into billing_claims or the appropriate table
- Check what billing table actually exists (billing_claims, submissions, or claims) by reading the existing managed-billing code

## After

npm run build. Commit:
git add -A
git commit -m "fix: P0 Submit Claim now creates billing record before signing note" --no-verify

Report: files changed, what billing table is used, whether a new endpoint was created, SHA.