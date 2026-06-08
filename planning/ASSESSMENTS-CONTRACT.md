# ASSESSMENTS-CONTRACT — canonical OG↔sidecar payload contract

**Date:** 2026-06-03
**Status:** SPEC for sign-off. Implements nothing. No code or DB changed by this pack.
**Repos:** OG `C:\dev\ChartSparkOG` (assessment files live on branch `feature/restore-assessments-tab`) · Sidecar `C:\dev\chartspark-assessments` (HEAD `500da42`).
**Source:** the 7 mismatches in `planning/SIDECAR-STATE.md`.

## Architecture decision (applied throughout)
- **The sidecar is the source of truth for payload shapes.** For #2–#6, **OG conforms to the sidecar** — change OG's client/types/routes/components to match the sidecar's actual shapes. **No translation shim.**
- **#1 delivery_method:** OG conforms; OG sends `"clinician"` for in-office administration.
- **#7 hamd/hamd17:** sidecar-internal, **code-only** fix — align the sidecar code identifier to the existing prod DB CHECK value `hamd` (no prod ALTER).

> Cross-cutting note (folds into #2): OG's curated `KNOWN_SCALES` uses a *different scale-ID vocabulary* than the sidecar registry. The canonical scale-ID set is the **sidecar registry's**: `phq9, gad7, cssrs, auditc, cage, dast10, ace, ciwaar, cows, dass21, pcl5, hama, hamd, mdq, asrs` (with `hamd17`→`hamd` per #7). All OG scale IDs must use these exact strings.

---

## #1 — `delivery_method` enum (BREAKING)

**OG shape**
- `src/lib/assessments/types.ts` → `AdministerInput.delivery_method?: "in_office" | "self_report" | "remote" | "paper"`
- `src/app/api/assessments/administer/route.ts` → `delivery_method: z.enum(['in_office','self_report','remote','paper']).default('in_office')`
- `src/components/patients/assessments/AdministerModal.tsx` → `delivery_method: "in_office"` (hardcoded)

**Sidecar shape**
- `src/api/assessments.ts` `administerSchema` → `delivery_method: z.enum(["clinician", "portal_self", "portal_assigned"])` (required, no default)
- DB `supabase/migrations/20260527130000_create_assessments_tables.sql` → `CHECK (delivery_method IN ('clinician', 'portal_self', 'portal_assigned'))`

**CANONICAL** — sidecar enum `clinician | portal_self | portal_assigned`. Semantics: `clinician` = administered in-office by the clinician; `portal_self` = patient self-initiated via portal; `portal_assigned` = patient completes a clinician-assigned scale via portal. For the current in-office-only UI, OG always sends `clinician`.

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/lib/assessments/types.ts` | `AdministerInput.delivery_method` | `"in_office"|"self_report"|"remote"|"paper"` → `"clinician"|"portal_self"|"portal_assigned"` |
| `src/app/api/assessments/administer/route.ts` | `AdministerSchema.delivery_method` | enum→`["clinician","portal_self","portal_assigned"]`; default `'in_office'`→`'clinician'` |
| `src/components/patients/assessments/AdministerModal.tsx` | submit body | `delivery_method: "in_office"` → `delivery_method: "clinician"` |

**Clinical/data risk:** none. No rows exist yet (sidecar undeployed). Document the full enum so a later UI selector can offer portal delivery once Track B portal ships.

---

## #2 — Scale projection shape + scale-ID vocabulary (BREAKING)

**OG shape**
- `src/lib/assessments/types.ts` → `RenderProjection { scaleId; name; shortName?; description?; responseShape; options?: ScaleResponseOption[]; items: ScaleItem[]; structuredItems?: CssrsStructuredItems; cptCodeHint? }`; `ScaleItem { id; text; options?; helpText?; parentItemId? }`; `CssrsStructuredItems { item6BehaviorTimeframe: { options; requiredWhenAnswered } }`; `ScaleResponseOption { value; label }`
- `src/components/patients/assessments/AdministerModal.tsx` → `scale_id: projection.scaleId` (line ~96) and `KNOWN_SCALES` ids: `phq-9, gad-7, cssrs, audit-c, dast-10, pcl-5, phq-2, gad-2, mdq, ace, edinburgh, ymrs, panss, ham-d, srs-2`
- `src/components/patients/assessments/ScaleForm.tsx` → reads `projection.items`, `item.options ?? projection.options ?? []`, `projection.name`, `projection.description`
- `src/components/patients/assessments/CssrsForm.tsx` → reads `projection.structuredItems?.item6BehaviorTimeframe.{options,requiredWhenAnswered}`

**Sidecar shape**
- `src/lib/scale-registry.ts` `RenderProjection { id; name; fullName; description; timeFrame; type; scoringRange:[number,number]; items: ScaleItem[]; cutoffs: SeverityCutoff[]; publicDomain; responseShape; structuredItems? }`
- `src/scales/types.ts` `ScaleItem { id; text; options: ResponseOption[] }` (per-item options REQUIRED); `ResponseOption { value; label }`; `SeverityCutoff { min; max; label; code }`
- `src/lib/scale-registry.ts` `CssrsStructuredItems { perItemFields: ["lifetime","pastMonth"]; item6BehaviorTimeframe: { appliesTo:"item6"; requiredWhenAnswered:true; options:[{value,label}] } }`
- Scale IDs = registry keys: `phq9, gad7, cssrs, auditc, cage, dast10, ace, ciwaar, cows, dass21, pcl5, hama, hamd17(→hamd), mdq, asrs`

**CANONICAL** — the sidecar projection: top-level key is **`id`** (not `scaleId`); each item carries its own required `options`; `structuredItems.item6BehaviorTimeframe` has `{appliesTo, requiredWhenAnswered, options}`. Scale IDs are the sidecar registry strings (un-hyphenated).

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/lib/assessments/types.ts` | `RenderProjection.scaleId` | rename → `id` |
| `src/lib/assessments/types.ts` | `RenderProjection` | add `fullName: string; timeFrame: string; type: "self-report"|"clinician"|"self/clinician"; scoringRange:[number,number]; cutoffs: {min;max;label;code}[]; publicDomain: boolean`; drop `shortName?`, `cptCodeHint?`; keep `options?` (ScaleForm fallback, harmless) |
| `src/lib/assessments/types.ts` | `ScaleItem.options` | `options?` → `options` (required, matches sidecar); drop `helpText?`/`parentItemId?` (not emitted by sidecar) |
| `src/lib/assessments/types.ts` | `CssrsStructuredItems` | add `perItemFields: ["lifetime","pastMonth"]`; `item6BehaviorTimeframe` add `appliesTo: "item6"` |
| `src/components/patients/assessments/AdministerModal.tsx` | submit body | `scale_id: projection.scaleId` → `scale_id: projection.id` |
| `src/components/patients/assessments/AdministerModal.tsx` | `KNOWN_SCALES` ids | replace vocabulary with sidecar registry ids: `phq9, gad7, cssrs, auditc, cage, dast10, ace, ciwaar, cows, dass21, pcl5, hama, hamd, mdq, asrs`. **Remove** unimplemented `phq-2, gad-2, edinburgh, ymrs, panss, srs-2`; **add** `cage, ciwaar, cows, dass21, hama, asrs` |

> `ScaleForm.tsx` / `CssrsForm.tsx` rendering logic needs **no change** — they already read `projection.items[].options` and `item6BehaviorTimeframe.{options,requiredWhenAnswered}`, all of which the sidecar emits. Only the `RenderProjection` *type* and the `scaleId`/ID-vocabulary call sites change.

**Clinical/data risk:** Removing the 6 unimplemented scales means OG stops *offering* scales it could never score (PHQ-2, GAD-2, EPDS, YMRS, PANSS, SRS-2) — corrects a misleading menu, but is a **product gap** to flag (PHQ-2/GAD-2 short screens are common; defer to a future sidecar scale-add). No PHI risk; projection content is public-domain.

---

## #3 — Patient list response key + row shape (BREAKING, silent empty)

**OG shape**
- `src/lib/assessments/client.ts` `getPatientAssessments` → `if (Array.isArray(data)) return data; return data.assessments ?? []`
- `src/lib/assessments/types.ts` `AssessmentSummary { id; patient_id; scale_id; scale_name?; status; administered_at?; completed_at?; delivery_method?; total_score?; severity?; severity_code?; flags? }`
- `src/components/patients/assessments/AssessmentResultDisplay.tsx` reads `summary.total_score`, `summary.severity`, `summary.flags`

**Sidecar shape** (`src/api/assessments.ts` `getPatientAssessmentsHandler`)
```
{ patient_id, filters, count,
  administrations: [ { id, scale_id, status, delivery_method, administered_at, completed_at,
                       result_summary: { total_score, severity_code, has_safety_flags } | null } ] }
```
> Note: the list intentionally exposes **derived metadata only** — `severity_code` (no human `severity`) and `has_safety_flags` (boolean; **no raw `flags[]`**).

**CANONICAL** — sidecar shape: response object keyed `administrations`; per-row score nested under `result_summary` (null until completed); list carries `severity_code` + `has_safety_flags`, not `severity`/`flags`.

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/lib/assessments/client.ts` | `getPatientAssessments` | read `data.administrations ?? []` (not `.assessments`); return type → the new row shape |
| `src/lib/assessments/types.ts` | `AssessmentSummary` | restructure to `{ id; scale_id; status; delivery_method; administered_at; completed_at; result_summary: { total_score; severity_code; has_safety_flags } | null }`; drop top-level `total_score/severity/severity_code/flags`, `patient_id`, `scale_name?` |
| `src/components/patients/assessments/AssessmentResultDisplay.tsx` | summary reads | `summary.total_score`→`summary.result_summary?.total_score`; severity chip → `result_summary?.severity_code`; flag chips → derive from `result_summary?.has_safety_flags` (a single "⚠ safety flag" chip), since raw flag strings are not in the list payload |

**Clinical/data risk:** The list view can no longer render individual flag chips or a human severity label — only a safety-flag indicator + score + `severity_code`. To show full flags/severity/narrative the UI must fetch the detail (`GET /administer/:id`, which returns the full result). This is a deliberate sidecar PHI-minimization posture; AssessmentResultDisplay's expandable detail should call the detail endpoint. **Flag for UI sign-off:** acceptable to show only safety indicator + score in the list?

---

## #4 — createAssignment body: `recurring` object→string, `notes`, `due_date` (BREAKING)

**OG shape** (`src/app/api/assessments/assignments/route.ts` `AssignmentCreateSchema`, `.strict()`)
```
patient_id; scale_id; due_date?: z.string().datetime();
recurring?: { interval: "daily"|"weekly"|"biweekly"|"monthly"; count?: 1..52 };
notes?: string(≤2000)
```
- `src/lib/assessments/types.ts` `CreateAssignmentInput { patient_id; scale_id; due_date?; recurring?: { interval: "daily"|"weekly"|"biweekly"|"monthly"; count? }; notes? }`

**Sidecar shape** (`src/api/assessments.ts` `createAssignmentSchema`)
```
patient_id: uuid; scale_id: <registry id>;
due_date?: z.string().date();        // YYYY-MM-DD (day precision)
recurring?: z.enum(["weekly","biweekly","monthly"])   // string, NO "daily", NO count
```
(DB `assessment_assignments.recurring` CHECK = `weekly|biweekly|monthly`; `due_date DATE`.)

**CANONICAL** — sidecar: `recurring` is a **string enum `weekly|biweekly|monthly`** (no `daily`, no `count`); **no `notes`**; `due_date` is **`YYYY-MM-DD`**.

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/lib/assessments/types.ts` | `CreateAssignmentInput.recurring` | `{interval; count?}` object → `"weekly"|"biweekly"|"monthly"` string |
| `src/lib/assessments/types.ts` | `CreateAssignmentInput` | remove `notes?`; `due_date?` documented as `YYYY-MM-DD` |
| `src/app/api/assessments/assignments/route.ts` | `AssignmentCreateSchema.recurring` | object → `z.enum(["weekly","biweekly","monthly"]).optional()` |
| `src/app/api/assessments/assignments/route.ts` | `AssignmentCreateSchema.due_date` | `z.string().datetime()` → `z.string().date()` |
| `src/app/api/assessments/assignments/route.ts` | `AssignmentCreateSchema.notes` | remove (and stop forwarding) |

**Clinical/data risk:** `daily` recurrence and a recurrence `count` are silently unsupported by the sidecar — dropping them prevents a 400 but removes those scheduling options. `notes` on an assignment is discarded. **Flag for product sign-off** (likely fine for v1; daily rating-scale assignment is uncommon).

---

## #5 — Assignments list filter (`?status`→`?completed`) + Assignment shape (BREAKING/DEGRADED)

**OG shape**
- `src/app/api/assessments/assignments/route.ts` `AssignmentListQuerySchema { patient_id; status?: "pending"|"completed"|"expired"|"cancelled"; limit? }` (forwards `status` upstream)
- `src/lib/assessments/client.ts` `getAssignments(patientId, { status })` → sets `status` query param
- `src/components/patients/AssessmentsTab.tsx` → `getAssignments(patientId, { status: 'pending' })`; renders `a.scale_name ?? a.scale_id`, `a.due_date`, `a.recurring.interval`
- `src/lib/assessments/types.ts` `Assignment { id; patient_id; scale_id; scale_name?; status: AssignmentStatus; due_date?; recurring?: {interval; count?}; created_at; notes? }`

**Sidecar shape** (`src/api/assessments.ts`)
- `listAssignmentsQuerySchema { patient_id?; scale_id?; completed?: "true"|"false"→bool; from?; to?; limit? }` (no `status`)
- Response `{ filters, count, assignments: [ { id, patient_id, scale_id, assigned_by, assigned_at, due_date, recurring: string|null, completed: boolean, administration_id } ] }`

**CANONICAL** — filter by **`?completed=true|false`** (no `status` enum). `Assignment` = sidecar row: `recurring` is a string|null; `completed` boolean (no `status`); `assigned_at` (no `created_at`); has `assigned_by`/`administration_id`; **no `scale_name`/`notes`**. "Pending" ⇒ `completed=false`. (`expired`/`cancelled` states do not exist in the sidecar model.)

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/app/api/assessments/assignments/route.ts` | `AssignmentListQuerySchema.status` | replace with `completed?: z.enum(["true","false"])`; forward as `?completed=` upstream (drop `status`) |
| `src/lib/assessments/client.ts` | `getAssignments` options | `status?: AssignmentStatus` → `completed?: boolean`; set `completed` query param |
| `src/lib/assessments/types.ts` | `Assignment` | → `{ id; patient_id; scale_id; assigned_by; assigned_at; due_date: string|null; recurring: string|null; completed: boolean; administration_id: string|null }`; drop `scale_name?`,`status`,`created_at`,`notes?`; `AssignmentStatus` type removed/unused |
| `src/components/patients/AssessmentsTab.tsx` | list fetch | `getAssignments(patientId, { status: 'pending' })` → `{ completed: false }` |
| `src/components/patients/AssessmentsTab.tsx` | row render | `a.recurring.interval` → `a.recurring` (plain string); `a.scale_name ?? a.scale_id` → `a.scale_id` (no scale_name); keep `a.due_date` |

**Clinical/data risk:** "Pending" becomes "not completed" (includes overdue) — semantically fine for a worklist. No `expired`/`cancelled` lifecycle (assignments are deleted, not cancelled — see the sidecar DELETE 409 guard). Human scale names disappear from the assignments list (shows raw id like `phq9`) unless OG maps ids→labels client-side (recommended cosmetic follow-up using the same `KNOWN_SCALES` label map).

---

## #6 — complete response: `result_id` vs `AssessmentResult` (minor)

**OG shape**
- `src/lib/assessments/client.ts` `completeAssessment(...) : Promise<AssessmentResult>`
- `src/lib/assessments/types.ts` `AssessmentResult { administration_id; scale_id; scale_name?; total_score; severity; severity_code; flags; narrative?; completed_at; item_scores? }`
- `AdministerModal.tsx` → `await completeAssessment(created.id, responses)` (return value **unused**)

**Sidecar shape** (`src/api/assessments.ts` complete handler response)
```
{ result_id, severity, severity_code, flags, interpretation }
```

**CANONICAL** — sidecar's compact completion result: `{ result_id: string; severity: string; severity_code: string; flags: string[]; interpretation: string }`. (The *full* administration+result record — `total_score`, `narrative`, `completed_at`, etc. — is the separate `GET /administer/:id` shape, which OG should model as its own `AssessmentWithResult` type, distinct from the completion response.)

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/lib/assessments/types.ts` | `AssessmentResult` | → `{ result_id; severity; severity_code; flags; interpretation }` to match `POST …/complete`. Model the GET-detail body separately (`AssessmentWithResult`, per the sidecar `GET /administer/:id` response with nested `result`). |
| `src/lib/assessments/client.ts` | `completeAssessment` return type | align to the compact shape above |

**Clinical/data risk:** none functionally today (modal ignores the body). Correcting the type prevents future code from reading non-existent fields (`total_score`/`completed_at`) off the completion response.

---

## #7 — `hamd` (DB CHECK) vs `hamd17` (registry) — sidecar-internal, code-only

**Sidecar shapes**
- `src/lib/scale-registry.ts` → `import { hamd17 } …`; `REGISTRY` key `["hamd17", makeHandle(hamd17)]` (line 85); `SCALE_DEFINITIONS` key `["hamd17", hamd17]` (line 230)
- `src/scales/hamd17.ts` → `export const hamd17: Scale = { id: "hamd17", … }` (line 198)
- DB `20260527130000_create_assessments_tables.sql` → `valid_scale CHECK (scale_id IN (… 'dass21','hama','hamd'))` — uses **`hamd`**
- Tests: `tests/unit/lib/scale-registry.test.ts` (expects `knownScaleIds()` to include `"hamd17"`, lines 15/31); `tests/unit/scales/hamd17.test.ts`

**CANONICAL** — the **DB CHECK value `hamd`** wins (it's already in prod; changing it would need a gated `ALTER`). The registry key and the scale's `id` become `"hamd"`. `hamd` is not clinically wrong — it is the 17-item HAM-D; the human-facing `name`/`fullName` ("Hamilton Depression Rating Scale, 17-item") preserve the distinction. **No prod ALTER.**

**Change list (sidecar only, code/tests)**
| File | Field | Old → New |
|---|---|---|
| `src/scales/hamd17.ts` | `hamd17.id` (line 198) | `"hamd17"` → `"hamd"` |
| `src/lib/scale-registry.ts` | `REGISTRY` key (line 85) | `["hamd17", …]` → `["hamd", …]` |
| `src/lib/scale-registry.ts` | `SCALE_DEFINITIONS` key (line 230) | `["hamd17", hamd17]` → `["hamd", hamd17]` |
| `tests/unit/lib/scale-registry.test.ts` | expected ids (lines 15, 31) | `"hamd17"` → `"hamd"` |
| `tests/unit/scales/hamd17.test.ts` | any `id`/registry-id assertion | `"hamd17"` → `"hamd"` |

> The TS symbol `hamd17`, the import binding, and the filename `hamd17.ts` may stay (cosmetic; renaming is needless churn). Only the **string id** that crosses the DB CHECK / registry key changes. OG's `KNOWN_SCALES` uses `hamd` (per #2).

**Clinical/data risk:** none. No `assessment_administrations` rows exist (sidecar undeployed; and any `hamd17` write would have been rejected by the existing CHECK, so none can exist). Dispatch and scoring depend on the registry mapping, not the literal historical string. **If, instead, the team decides `hamd17` is the clinically required identifier**, that becomes a **separate gated DB step**: `ALTER`/recreate the `valid_scale` CHECK on `assessment_administrations` (note `assessment_results.scale_id` is free-text, no CHECK) in prod `eepwbtdqtdnqxeznykbh` — call it out explicitly for DB sign-off rather than folding into the code PR.

---

## #8 — Trend response: `points` vs `{ results: [...] }` (implemented)

**OG shape (before)**
- `src/lib/assessments/client.ts` `getAssessmentTrend` → `return data.points ?? []`
- `src/lib/assessments/types.ts` `TrendPoint { administration_id; completed_at; total_score; severity; severity_code }`

**Sidecar shape** (`src/api/assessments.ts` trend handler)
```
{ patient_id, scale_id, from, to, count,
  results: [ { scored_at, total_score, severity_code, flags } ] }
```

**CANONICAL** — the sidecar response: rows live under **`results`** (not `points`); each row is `{ scored_at, total_score, severity_code, flags }`.

**Change list (OG only)**
| File | Field | Old → New |
|---|---|---|
| `src/lib/assessments/client.ts` | `getAssessmentTrend` | read `data.results ?? []` (was `.points`) |
| `src/lib/assessments/types.ts` | `TrendPoint` | → `{ scored_at; total_score; severity_code; flags }` (drop `administration_id`/`completed_at`/`severity`) |

No live UI consumer of trend data exists yet: the vitals `WeightTrendChart`/`ScreeningTrendChart` use unrelated hardcoded demo data, and `AssessmentResultDisplay.onViewTrend` is an unwired callback. So nothing else changes. A future assessment trend chart should plot `scored_at` (x) × `total_score` (y) and use the scale-label map for the scale id.

**Clinical/data risk:** none. Unlike the list summary (#3, which exposes only `has_safety_flags`), trend rows carry **raw `flags`** — so a future trend view can surface safety flags per data point directly.

---

## Summary of decisions (for sign-off)

| # | Mismatch | Owner of change | Canonical | Risk |
|---|---|---|---|---|
| 1 | delivery_method enum | **OG** | `clinician/portal_self/portal_assigned`; OG sends `clinician` | none |
| 2 | projection `scaleId`/`id` + items + **scale-ID vocabulary** | **OG** | sidecar projection (`id`, per-item `options`) + sidecar registry IDs | product gap: drops PHQ-2/GAD-2/EPDS/YMRS/PANSS/SRS-2 (unimplemented) |
| 3 | patient list `administrations` vs `assessments` + nested `result_summary` | **OG** | sidecar `{administrations:[…result_summary]}` | list shows safety indicator + score only (no raw flags/severity) — UI sign-off |
| 4 | createAssignment `recurring` object→string, notes, due_date | **OG** | sidecar: string enum, no notes, `YYYY-MM-DD` | drops `daily`/`count`/`notes` — product sign-off |
| 5 | assignments `?status`→`?completed` + Assignment shape | **OG** | sidecar `?completed=`; sidecar row shape | "pending"⇒`completed=false`; no scale_name/expired/cancelled |
| 6 | complete `result_id` vs AssessmentResult | **OG** | sidecar compact `{result_id,severity,severity_code,flags,interpretation}` | none (return unused) |
| 7 | `hamd` vs `hamd17` | **Sidecar** (code/tests) | `hamd` (DB CHECK value) | none; prod ALTER only if `hamd17` is deemed required (gated, separate) |
| 8 | trend `points` vs `{results}` | **OG** | sidecar `{results:[{scored_at,total_score,severity_code,flags}]}` | none (no UI consumer yet) |

**Net:** seven OG-side conformance changes (#1–#6 + #8: types/client/routes/components) + one sidecar code-only id correction (#7). The OG changes are implemented on branch `fix/assessments-contract`; #7 remains for a separate sidecar pack. After both, the deployed sidecar + OG client speak one contract.

## Open questions
1. **#3 list UX:** OK that the assessments list shows only score + `severity_code` + a safety-flag indicator (full flags/severity/narrative require opening the detail endpoint)?
2. **#2 product gap:** confirm dropping PHQ-2/GAD-2/EPDS/YMRS/PANSS/SRS-2 from the menu (not implemented in the sidecar); do any need to be added to the sidecar before launch?
3. **#4:** confirm `daily` recurrence and assignment `notes` are out-of-scope for v1.
4. **#7:** accept `hamd` as the canonical id (recommended), or require `hamd17` (→ gated prod CHECK ALTER)?
5. Should OG keep a client-side id→label map (the corrected `KNOWN_SCALES`) so lists/assignments show human scale names the sidecar doesn't return?
