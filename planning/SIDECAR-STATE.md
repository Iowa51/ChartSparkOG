# SIDECAR-STATE — chartspark-assessments recon

**Date:** 2026-06-02 (status update 2026-06-10 below)
**Mode:** READ-ONLY recon. Nothing changed except this file. No deploys, installs, code edits, or DB writes.
**Scope:** Establish ground truth to deploy the sidecar and make AssessmentsTab functional.

---

## STATUS UPDATE — 2026-06-10 (supersedes the recon below where they conflict)

- **DEPLOYED:** Railway, https://chartspark-assessments-production.up.railway.app — /health 200. Repo moved out of OneDrive to `C:\dev\chartspark-assessments`.
- **Contract drift RESOLVED:** all 8 mismatches fixed (incl. §3 items 1–7 and the hamd/hamd17 bug). AssessmentsTab live end-to-end on app.chartspark.io.
- **JWKS warmup fixed:** correct endpoint `/auth/v1/.well-known/jwks.json`.
- **Vercel prod env wired:** `ASSESSMENTS_SIDECAR_URL` + `ASSESSMENTS_SIDECAR_SECRET`.
- **Prod RLS for sidecar reads** on `users`/`patients`: `sidecar_self_user` + `sidecar_org_patients`, applied manually 2026-06-09; recorded as migration `20260610230000_sidecar_rls_patient_access.sql` (record only).
- **Clinical-safety review PASSED** (895+ sidecar tests green); verified live: PHQ-9 12/moderate + flag, HAM-D 21/severe, C-SSRS high 3 and moderate 2 with action narrative. `ASSESSMENTS_V1` granted to testers.
- **Open questions §1–7:** all resolved by the deploy; retained below for history.
- **Known v1 gaps:** trend chart UI, assignment-creation UI (backends complete).

The recon below is retained as the 2026-06-02 ground-truth snapshot.

---

## TL;DR

- **Sidecar located:** `C:\Users\joman\OneDrive\Desktop\chartspark-assessments` (GitHub `RedArkventures/chartspark-assessments`, HEAD `500da42`). **It lives in OneDrive — recommend moving to `C:\dev\` before deploy work** (OneDrive sync can corrupt `node_modules`/`.git`).
- **Stack:** Express 5 + TypeScript, Node ≥20. Entry `src/server.ts`, listens on **`PORT` (assigned 3301)**. Build `tsc`→`dist/`, start `node dist/server.js`.
- **Data store:** the **SAME prod Supabase project as OG — `eepwbtdqtdnqxeznykbh`** (confirmed via `supabase/.temp/project-ref`). It connects as a least-privilege Postgres role `sidecar_assessments`, not service_role.
- **DB is ALREADY PROVISIONED.** Per the sidecar's own ledger, `20260527130000_create_assessments_tables.sql` was applied to prod on 2026-05-27: the 3 tables (`assessment_administrations/results/assignments`) + RLS + the `sidecar_assessments` role + grants + EXECUTE on `public.write_audit_log`.
- **Scales:** all **15 implemented in code** (`src/scales/*.ts`) and registered. No DB "scales catalog" to seed — scale_id is a CHECK-constrained string; definitions live in code.
- **Completeness:** high. Scoring + deterministic narratives for all 15; **suicide-risk flagging implemented** (PHQ-9 Q9→`suicide_risk_item`; C-SSRS `suicide_risk_high/moderate/low` → HIGH audit risk). Full unit tests per scale + integration tests. No TODO/stub blockers in the runtime path.
- **⚠️ BLOCKER (RESOLVED 2026-06-10) — contract drift:** the restored OG client (`feature/restore-assessments-tab`) and the sidecar were built to **slightly different contract versions**. Several request/response shapes don't line up (delivery_method enum, scale-projection field names, patient-list response key, create-assignment `recurring` shape). **Deploying the sidecar alone will NOT make AssessmentsTab work** until these are reconciled. Details in §Contract.

---

## STEP 1 — Location

| | |
|---|---|
| Path | `C:\Users\joman\OneDrive\Desktop\chartspark-assessments` |
| Git remote | `https://github.com/RedArkventures/chartspark-assessments.git` |
| HEAD | `500da42` (Merge PR #1 — render-only scale projection + OG shared-secret auth bypass) |
| In OneDrive? | **Yes** — flag for move to `C:\dev\chartspark-assessments` before deploy work |

---

## STEP 2 — Sidecar ground truth

### Stack / run
- Express `^5.2.1`, TypeScript, `@supabase/supabase-js`, `pg`, `jose` (JWT/JWKS), `zod`, `helmet`, `cors`. Node ≥20.
- Entry: `src/server.ts`. Scripts: `dev` (ts-node-dev), `build` (`tsc`), `start` (`node dist/server.js`), `test` (jest), `test:rls`, `test:integration`.
- **No README, Dockerfile, or Railway/Procfile config** — must be added or rely on Railway Nixpacks autodetect (`build` + `start` scripts suffice).
- Boot is fail-closed: throws if `PORT` unset/invalid or `SUPABASE_URL` missing; warms up the JWKS endpoint before binding.
- `GET /health` → `{status:"ok"}`. Domain router mounted at **`/api/v1/assessments`**.

### Data store
- **Shared prod project `eepwbtdqtdnqxeznykbh`** (not a separate DB).
- Tables (sidecar-owned): `assessment_administrations`, `assessment_results`, `assessment_assignments` — org-scoped RLS on all three: `USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))`, with `WITH CHECK` on mutations.
- Runtime data path: direct `pg` pool as **`sidecar_assessments`** (NOINHERIT LOGIN). It sets `request.jwt.claims` per transaction so `auth.uid()`-based RLS is enforced even on this non-service_role connection (defense-in-depth).
- Audit: never writes `audit_logs` directly — calls `public.write_audit_log(text,text,uuid,uuid,uuid,text,jsonb,text)` (OG's SECURITY DEFINER helper). Sidecar role has EXECUTE on it, no table grants.
- **Provisioning status: DONE** (sidecar ledger, applied 2026-05-27). Tables, role, and grants exist in prod. Depends on OG migrations `20260526120000` + `20260527120000` (both applied) for the audit-log function.

### Scales & scoring
- All 15 present and registered in `src/lib/scale-registry.ts`: `phq9, gad7, cssrs, auditc, cage, dast10, ace, ciwaar, cows, dass21, pcl5, hama, hamd17, mdq, asrs`.
- Scale **definitions live in code**, not the DB. There is no `scales_catalog` table — `scale_id` is validated by a CHECK constraint + the in-code registry. **Nothing to seed.**
- **Suicide-risk flagging — implemented:**
  - PHQ-9: `Q9 ≥ 1` → `suicide_risk_item` flag + narrative "assess suicide risk and document a safety plan."
  - C-SSRS: `suicide_risk_high|moderate|low` from max risk across lifetime/past-month; narrative escalates ("immediate suicide risk assessment and safety plan").
  - `hasSafetyRelevantFlags()` elevates the audit `riskLevel` to `HIGH` for any SUICIDE/SELF_HARM/CRITICAL/HIGH_RISK flag.
- Tests: full unit coverage per scale (`tests/unit/scales/*.test.ts`) + middleware/api units + integration (`administer-flow`, `assignment-flow`, `cssrs-flow`, `error-paths`). Coverage dir present. (Not run in this recon.)

### Required env vars (sidecar)
| Var | Required? | Purpose |
|---|---|---|
| `PORT` | **Yes** (hard) | Listen port (3301 locally; Railway injects its own) |
| `SUPABASE_URL` | **Yes** (hard) | `https://eepwbtdqtdnqxeznykbh.supabase.co` — used to build JWKS URL for JWT verification |
| `SIDECAR_POSTGRES_URL` | **Yes** (runtime) | `postgresql://sidecar_assessments:<password>@<host>:5432/postgres` — the data path |
| `SUPABASE_SERVICE_ROLE_KEY_SIDECAR` | listed required | sidecar-scoped key for future PostgREST calls (server.ts doesn't hard-require it at boot; `db.ts` path uses `SIDECAR_POSTGRES_URL`) |
| `ASSESSMENTS_SIDECAR_SECRET` | optional* | shared secret enabling OG's service-to-service bypass. **Must be set for OG integration** and match OG's value |
| `ALLOWED_ORIGINS` | optional | CORS allowlist (OG calls server-to-server, so not strictly needed for OG) |

\* "optional" only in the sense that without it the sidecar still runs but requires a Supabase JWT on every call — which OG's proxy does not send. For OG → sidecar it is effectively required.

---

## STEP 3 — OG ↔ sidecar contract (verified)

### Transport / auth — MATCHES ✓
- OG base URL env: **`ASSESSMENTS_SIDECAR_URL`**; secret env: **`ASSESSMENTS_SIDECAR_SECRET`** (`src/lib/assessments/sidecar-proxy.ts`). Sidecar reads the same `ASSESSMENTS_SIDECAR_SECRET`. ✓
- OG sends `Authorization: Bearer <secret>`, `X-User-Id: <uuid>`, `X-Organization-Id: <uuid>`. Sidecar's auth middleware accepts exactly that (secret bypass branch; validates both headers as UUIDs; skips AAL2 because OG already enforced MFA). ✓
- Base path `/api/v1/assessments/*` matches on both sides. ✓
- OG client only calls OG's own `/api/assessments/*` routes; those proxy to the sidecar. OG routes are **pure pass-through** — `return NextResponse.json(result.data)` with **no reshaping** — so any shape difference reaches the browser.

### Endpoint map (OG route → sidecar path)
| OG client call | OG route | Sidecar endpoint | Exists? |
|---|---|---|---|
| `getScale` | `GET /api/assessments/scales/[id]` | `GET /api/v1/assessments/scales/:id` (public) | ✓ |
| `getPatientAssessments` | `GET /api/assessments/patient/[id]` | `GET /api/v1/assessments/patient/:patientId` | ✓ |
| `getAssessmentTrend` | `GET …/patient/[id]/trend/[scaleId]` | `GET …/patient/:patientId/trend/:scaleId` | ✓ |
| `administerAssessment` | `POST /api/assessments/administer` | `POST /api/v1/assessments/administer` | ✓ |
| `completeAssessment` | `POST …/administer/[id]/complete` | `POST …/administer/:id/complete` | ✓ |
| `getAssessment` | `GET …/administer/[id]` | `GET …/administer/:id` | ✓ |
| `getAssignments` | `GET /api/assessments/assignments` | `GET /api/v1/assessments/assignments` | ✓ |
| `createAssignment` | `POST /api/assessments/assignments` | `POST /api/v1/assessments/assignments` | ✓ |
| `deleteAssignment` | `DELETE …/assignments/[id]` | `DELETE …/assignments/:id` | ✓ |

All endpoints exist on both sides. The **shapes**, however, drift:

### ⚠️ Contract mismatches (must fix before AssessmentsTab works)

1. **`delivery_method` enum — BREAKING.** OG `AdministerInput` / route accept `in_office | self_report | remote | paper` (and `AdministerModal` hardcodes `"in_office"`). Sidecar zod **and** the DB CHECK accept only `clinician | portal_self | portal_assigned`. → every **Administer** call → `400 INVALID_INPUT`. **Fix:** pick one vocabulary and align both sides (+ the DB CHECK if changed).

2. **Scale projection field names — BREAKING.** Sidecar `GET /scales/:id` returns `{ id, name, fullName, timeFrame, type, scoringRange, items, cutoffs, publicDomain, responseShape, structuredItems? }`. OG `RenderProjection` expects `{ scaleId, name, shortName?, description?, responseShape, options?, items, structuredItems?, cptCodeHint? }`. Concretely: sidecar `id` vs OG `scaleId` (so `AdministerModal` reads `projection.scaleId` → `undefined` → administers `scale_id: undefined` → OG 400); no top-level `options` for flat-likert; per-item and `structuredItems.item6BehaviorTimeframe` shapes differ. → `ScaleForm` can't render reliably and administer can't start.

3. **Patient-list response key — BREAKING (silent empty).** Sidecar `GET /patient/:patientId` returns `{ patient_id, filters, count, administrations:[…] }` with score nested under `result_summary`. OG `getPatientAssessments` reads `data.assessments ?? []` (and `AssessmentSummary` expects top-level `total_score/severity/flags`). → "Recent assessments" always renders **empty**.

4. **Create-assignment `recurring` — BREAKING.** OG `CreateAssignmentInput.recurring` is an object `{ interval, count? }`; sidecar `createAssignmentSchema.recurring` is an enum **string** (`weekly|biweekly|monthly`). OG forwards the object → sidecar `400`. (OG also sends `notes`, which the sidecar ignores.)

5. **Assignments list filter + shape — DEGRADED.** OG sends `?status=pending`; sidecar expects `?completed=true|false` and ignores `status` → returns **all** assignments, not just pending. Sidecar `recurring` is a string but OG UI reads `a.recurring.interval`; sidecar omits `scale_name` (UI falls back to the raw `scale_id`); sidecar uses `assigned_at`/`completed` vs OG's `created_at`/`status`.

6. **Complete response shape — minor.** Sidecar returns `{ result_id, severity, severity_code, flags, interpretation }`; OG `AssessmentResult` expects `{ administration_id, scale_id, total_score, completed_at, … }`. `AdministerModal` ignores the response body, so the immediate flow survives, but the typed contract is wrong.

7. **`hamd` vs `hamd17` — sidecar-internal bug.** Registry/`knownScaleIds()` uses `hamd17`; the DB `valid_scale` CHECK lists `hamd`. Administering HAM-D passes app validation but fails the DB CHECK → 500. HAM-D is effectively unusable until reconciled.

> Net: the auth/transport contract is solid; the **payload contract is not**. Reconciling §3 items 1–4 is required for a working tab; 5–7 for full correctness.

---

## STEP 4 — Recommended deployment plan

**0. Move the repo out of OneDrive** → `C:\dev\chartspark-assessments` (avoid sync corruption), keep the git remote.

**1. Reconcile the contract FIRST (code, separate task).** Deploying without this yields a visible-but-broken tab. Choose the canonical vocabulary/shapes and align both repos (or add a thin translation layer in OG's `/api/assessments/*` routes). Priority: delivery_method (1), scale projection (2), patient-list key (3), recurring (4); then 5–7. Re-run both repos' test suites.

**2. Host: Railway** (James already uses it). Deploy `chartspark-assessments` as a Node service:
- Build `npm run build`; start `npm start`; Node ≥20. No Dockerfile needed (Nixpacks reads the scripts) — or add one for reproducibility.
- Railway injects `PORT`; the app honors it. Expose a public HTTPS URL.

**3. Database — already provisioned; verify, don't recreate.** Tables + `sidecar_assessments` role + grants were applied 2026-05-27. Pre-deploy, just verify (read-only) that the 3 tables, RLS policies, the role, and EXECUTE on `write_audit_log` are present. **Do not re-run** `20260527130000` (it `CREATE TABLE`/`CREATE ROLE` without IF NOT EXISTS → would error). The `sidecar_assessments` password was set interactively at apply time — retrieve from the vault or rotate it and update `SIDECAR_POSTGRES_URL`.

**4. Sidecar env (Railway):**
- `SUPABASE_URL=https://eepwbtdqtdnqxeznykbh.supabase.co`
- `SIDECAR_POSTGRES_URL=postgresql://sidecar_assessments:<password>@<host>:5432/postgres` — confirm host + whether the custom role connects via the Supavisor pooler (`…pooler.supabase.com`, user may need `sidecar_assessments.<ref>` form) or the direct connection (`db.<ref>.supabase.co`). **Open question.**
- `SUPABASE_SERVICE_ROLE_KEY_SIDECAR=<sidecar-scoped key>` (provision a restricted key if used).
- `ASSESSMENTS_SIDECAR_SECRET=<openssl rand -hex 32>` — generate once.
- `ALLOWED_ORIGINS=https://<og-domain>` (optional for server-to-server).

**5. OG prod env (Vercel):**
- `ASSESSMENTS_SIDECAR_URL=https://<railway-url>`
- `ASSESSMENTS_SIDECAR_SECRET=<same value as the sidecar>`
- Without both, OG's proxy returns `503 fallback` and the tab fails closed (safe, but non-functional).

**6. Smoke test (post-deploy):** `GET /health`; then through OG as the granted user (jomanwa) — open a patient's Assessments tab, `GET /scales/phq9`, administer + complete PHQ-9, confirm a row in `assessment_administrations`/`assessment_results` and an `audit_logs` entry. (This is exactly where the §3 mismatches will surface if not yet fixed.)

### Missing / incomplete before it can serve real data
- **Contract reconciliation (§3 items 1–4)** — the real blocker.
- **No deploy config** (Dockerfile/railway.json) — add or rely on Nixpacks.
- **`sidecar_assessments` DB password** — retrieve/rotate for `SIDECAR_POSTGRES_URL`.
- **Shared secret** not yet generated/set on either side.
- **HAM-D `hamd`/`hamd17` bug** (§3.7).

---

## Open questions
1. **Contract ownership:** reconcile by changing the sidecar, the OG client, or adding a translation shim in OG's `/api/assessments/*` routes? (Sidecar is the scoring authority; OG types look like the newer/intended shape — decide the canonical contract.)
2. **`SIDECAR_POSTGRES_URL` connectivity:** does `sidecar_assessments` connect through the Supavisor pooler (and in what username form) or the direct DB endpoint? Confirm before deploy.
3. **`sidecar_assessments` password:** stored in a vault, or rotate now?
4. **Hosting account/project:** which Railway project/org; custom domain vs `*.up.railway.app` for `ASSESSMENTS_SIDECAR_URL`?
5. **MFA/AAL2:** OG enforces MFA before forwarding; confirm prod OG users actually have AAL2 so the human path is genuinely MFA-gated (the sidecar bypass trusts OG on this).
6. **delivery_method semantics:** which vocabulary is correct clinically (`in_office/self_report/remote/paper` vs `clinician/portal_self/portal_assigned`) — drives the §3.1 fix direction.
7. **`SUPABASE_SERVICE_ROLE_KEY_SIDECAR`:** is a separate restricted key actually provisioned, or is this leftover from an earlier design now superseded by `SIDECAR_POSTGRES_URL`?

---

*End of recon. No repo code, deploys, installs, or DB writes were performed; only this document was created.*
