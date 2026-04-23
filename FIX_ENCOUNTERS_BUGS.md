# FIX_ENCOUNTERS_BUGS.md

Read `CLAUDE.md` first. Three bugs to fix. Commit each separately with `--no-verify`.

---

## Bug 1: Height input needs feet + inches (HIGHEST PRIORITY)

**File:** `src/components/vitals/VitalsEntryPanel.tsx`

**Problem:** The height input is a single number field. When a clinician enters "5" thinking it's 5 feet, the code treats it as 5 inches, producing a BMI of 5314.7. Clinicians expect to enter height as feet + inches when the unit is "in".

**Fix:**

1. Add two new local state fields: `heightFeet` (number | undefined) and `heightInches` (number | undefined). These are UI-only — they do NOT go into VitalFormData.

2. When `height_unit` is "in", replace the single height <input> with TWO side-by-side inputs:
   - "Feet" input: type="number", min=0, max=8, step=1, placeholder="ft"
   - "Inches" input: type="number", min=0, max=11, step=1, placeholder="in"

3. When either heightFeet or heightInches changes, compute total inches and call updateField('height', totalInches):

   const totalInches = ((heightFeet || 0) * 12) + (heightInches || 0);
   if (totalInches > 0) {
     updateField('height', totalInches);
   }

4. When height_unit is "cm", keep the existing single number input as-is (no change needed for metric).

5. When the user toggles between "in" and "cm", reset heightFeet and heightInches to undefined.

6. The Zod schema in /api/vitals/route.ts already validates height as min(1).max(120) for inches — that's correct for total inches (1-120 = up to 10 feet). No backend changes needed.

**Commit message:** fix: split height input into feet + inches to fix BMI calculation

---

## Bug 2: Notes/new back arrow goes to /templates instead of encounter

**File:** `src/app/(app)/notes/new/page.tsx`

**Problem:** In the header, the back arrow Link is hardcoded to /templates. When a clinician arrives at notes/new from an encounter page (via ?encounterId=...&patientId=...), the back arrow should return them to the encounter, not to the templates page.

**Current code (in the header return JSX):**

<Link
  href="/templates"
  className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
>
  <ArrowLeft className="h-5 w-5" />
</Link>

**Fix:** Make the back arrow context-aware:

<Link
  href={encounterId ? `/encounters/${encounterId}` : '/notes'}
  className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
>
  <ArrowLeft className="h-5 w-5" />
</Link>

- If encounterId is in the URL search params, go to /encounters/{encounterId}
- Otherwise, go to /notes (not /templates)

The variable encounterId is already extracted from search params at the top of the component: const encounterId = searchParams.get("encounterId");

**Commit message:** fix: notes/new back arrow navigates to encounter or notes list instead of templates

---

## Bug 3: Verify vitals save works end-to-end

**Context:** The vitals table was just created in Supabase. The API route at src/app/api/vitals/route.ts looks correct. But we need to verify there are no mismatches between what the frontend sends and what the API expects.

**Verification steps:**

1. Read src/components/vitals/VitalsEntryPanel.tsx — confirm the POST body matches the Zod schema VitalsCreateSchema in src/app/api/vitals/route.ts.

2. Check that after Bug 1 fix, the height value sent is in total inches (not feet).

3. The API requires patient_id (UUID, required) and encounter_id (UUID, optional). Check that VitalsEntryPanel passes these correctly from its props.

4. Run npm run build to confirm no TypeScript errors.

**If anything is mismatched, fix it. If everything checks out, no commit needed for this bug — just confirm it passes.**

---

## After all fixes

Run npm run build. Report:
- Files changed per commit
- SHA per commit
- Build result (pass/fail)