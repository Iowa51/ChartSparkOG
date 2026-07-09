// DB-integration tests for Sprint 1 / P2 -- Patient Portal v1 intake RLS
// (migration 20260707120000_sprint1_p2_portal_intake_rls.sql).
//
// Covers the `patient_portal` role:
//   * INSERT/UPDATE own intake rows while the submission is patient_entered +
//     unsubmitted (positive controls)
//   * the submit lock: setting submitted_at freezes further portal writes
//     (UPDATE USING excludes the row -> 0 rows, NOT an error)
//   * cannot write forbidden fields (source<>'patient', reconciled=true,
//     created_by, status skips) -> WITH CHECK raises
//   * cannot read or write another patient's rows
//   * zero access to vitals + clinician tables + intake_templates writes
//   * SELECT active templates only (system/own-org), never inactive
//
// RLS semantics that shape the assertions:
//   - USING excludes a row on UPDATE/DELETE/SELECT  -> 0 rows affected, NO error
//   - WITH CHECK violation on INSERT/UPDATE         -> raises (42501)
//   - missing table privilege                       -> raises "permission denied"
//
// Run with:
//   bash scripts/db-local-verify.sh
//   npm run test:db

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DB_URL = process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;

// Per-run unique ids so parallel/prior runs do not collide.
const ORG_A = randomUUID();
const ORG_B = randomUUID();
const PATIENT_A = randomUUID(); // the portal patient (ORG_A)
const FOREIGN_PATIENT = randomUUID(); // another patient (ORG_B)
const PORTAL_UID = randomUUID(); // Supabase Auth id for PATIENT_A's portal session
const CLINICIAN_UID = randomUUID(); // a real public.users id (ORG_A) for FK-valid reviewer writes
const SUFFIX = randomUUID().slice(0, 8);

// Matches an RLS/privilege rejection: USING-excluded 0-row updates are asserted
// separately (rowCount), but WITH CHECK / privilege failures raise one of these.
const RLS_ERR = /row-level security|violates|permission denied|policy|patient_entered|transition/i;

let admin: Client;
let portal: Client; // impersonates the patient_portal role

function insertSql(table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  return {
    text: `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`,
    values: Object.values(row),
  };
}

async function adminInsert(table: string, row: Record<string, unknown>): Promise<string> {
  const { text, values } = insertSql(table, row);
  const { rows } = await admin.query<{ id: string }>(text, values);
  return rows[0]!.id;
}

// Run `fn` inside a transaction as the patient_portal role with the given portal
// auth uid as auth.uid()'s `sub`, then roll back so nothing persists.
async function asPortal<T>(authUid: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await portal.query("BEGIN");
  try {
    await portal.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: authUid, role: "patient_portal" }),
    ]);
    await portal.query("SET LOCAL ROLE patient_portal");
    return await fn(portal);
  } finally {
    await portal.query("ROLLBACK");
  }
}

async function cleanup(c: Client) {
  const childTables = [
    "ros_responses",
    "problems",
    "medications",
    "allergies",
    "family_history",
    "social_history",
    "immunizations",
    "intake_submissions",
  ];
  try {
    await c.query(`SET session_replication_role = 'replica'`);
    for (const t of childTables) {
      await c
        .query(
          `DELETE FROM public.${t} WHERE organization_id = ANY($1::uuid[]) OR patient_id = ANY($2::uuid[])`,
          [
            [ORG_A, ORG_B],
            [PATIENT_A, FOREIGN_PATIENT],
          ],
        )
        .catch(() => undefined);
    }
    await c
      .query(`DELETE FROM public.intake_templates WHERE organization_id = ANY($1::uuid[])`, [
        [ORG_A, ORG_B],
      ])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM public.patient_portal_invites WHERE patient_id = ANY($1::uuid[])`, [
        [PATIENT_A, FOREIGN_PATIENT],
      ])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM public.patient_portal_users WHERE patient_id = ANY($1::uuid[])`, [
        [PATIENT_A, FOREIGN_PATIENT],
      ])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM public.patients WHERE id = ANY($1::uuid[])`, [
        [PATIENT_A, FOREIGN_PATIENT],
      ])
      .catch(() => undefined);
    await c.query(`DELETE FROM public.users WHERE id = $1`, [CLINICIAN_UID]).catch(() => undefined);
    await c.query(`DELETE FROM auth.users WHERE id = $1`, [CLINICIAN_UID]).catch(() => undefined);
    await c
      .query(`DELETE FROM public.organizations WHERE id = ANY($1::uuid[])`, [[ORG_A, ORG_B]])
      .catch(() => undefined);
  } finally {
    await c.query(`SET session_replication_role = 'origin'`).catch(() => undefined);
  }
}

// A fresh, open (patient_entered, unsubmitted) submission for PATIENT_A.
async function freshOpenSubmission(): Promise<string> {
  return adminInsert("intake_submissions", {
    organization_id: ORG_A,
    patient_id: PATIENT_A,
    status: "patient_entered",
    responses: "{}",
  });
}

// Minimal valid child row for PATIENT_A/ORG_A. Pass a submission id to link it
// (omit `sub` entirely to leave intake_submission_id unset). `overrides` tweak
// source/reconciled/link for the read-scoping negatives.
const CHILD_TABLES = [
  "problems",
  "medications",
  "allergies",
  "ros_responses",
  "family_history",
  "social_history",
  "immunizations",
] as const;

function childRow(table: string, sub?: string | null, overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = { organization_id: ORG_A, patient_id: PATIENT_A };
  if (sub !== undefined) base.intake_submission_id = sub;
  const perTable: Record<string, Record<string, unknown>> = {
    problems: {
      code_system: "icd10",
      code: "R05",
      display: "Cough",
      source: "patient",
      reconciled: false,
    },
    medications: { name: "Aspirin", source: "patient", reconciled: false },
    allergies: { allergen_display: "Peanut", source: "patient", reconciled: false },
    ros_responses: { system: "respiratory", finding: "positive" },
    family_history: { relative: "mother", condition_display: "Hypertension", source: "patient" },
    social_history: { tobacco_status: "never", source: "patient" },
    immunizations: { vaccine_display: "Influenza", source: "patient" },
  };
  return { ...base, ...perTable[table], ...overrides };
}

// Row count visible to PATIENT_A's portal session for a given id.
async function portalSees(table: string, id: string): Promise<number> {
  return asPortal(PORTAL_UID, async (c) => {
    const { rows } = await c.query(`SELECT id FROM public.${table} WHERE id = $1`, [id]);
    return rows.length;
  });
}

beforeAll(async () => {
  admin = new Client({ connectionString: DB_URL });
  await admin.connect();

  const { rows } = await admin.query(`SELECT 1 FROM pg_roles WHERE rolname = 'patient_portal'`);
  if (rows.length === 0) {
    throw new Error(
      "role patient_portal not found. Run `bash scripts/db-local-verify.sh` (which now applies " +
        "the portal foundation + P2 portal RLS migrations) before `npm run test:db`.",
    );
  }

  portal = new Client({ connectionString: DB_URL });
  await portal.connect();

  await cleanup(admin);

  await admin.query(
    `INSERT INTO public.organizations (id, name, slug) VALUES ($1,$2,$3), ($4,$5,$6)`,
    [ORG_A, `Org A ${SUFFIX}`, `org-a-${SUFFIX}`, ORG_B, `Org B ${SUFFIX}`, `org-b-${SUFFIX}`],
  );
  await admin.query(
    `INSERT INTO public.patients (id, organization_id, first_name, last_name) VALUES ($1,$2,'A','Patient'), ($3,$4,'B','Patient')`,
    [PATIENT_A, ORG_A, FOREIGN_PATIENT, ORG_B],
  );
  // Link PATIENT_A to a portal account keyed on PORTAL_UID (auth_user_id has
  // no FK -- separate auth namespace).
  await admin.query(
    `INSERT INTO public.patient_portal_users (patient_id, auth_user_id, email, status)
         VALUES ($1, $2, $3, 'active')`,
    [PATIENT_A, PORTAL_UID, `portal-${SUFFIX}@test.local`],
  );
  // A real ORG_A clinician so reviewer-field FKs (users.id) resolve -- lets the
  // reviewed_by WITH CHECK test fail on RLS, not on a foreign-key violation.
  await admin.query(`INSERT INTO auth.users (id) VALUES ($1)`, [CLINICIAN_UID]);
  await admin.query(
    `INSERT INTO public.users (id, email, role, organization_id) VALUES ($1, $2, 'USER', $3)`,
    [CLINICIAN_UID, `clinician-${SUFFIX}@test.local`, ORG_A],
  );
});

afterAll(async () => {
  if (admin) await cleanup(admin);
  await portal?.end().catch(() => undefined);
  await admin?.end().catch(() => undefined);
});

describe("Portal intake: own-submission write (positive controls)", () => {
  test("portal can INSERT a fresh submission for itself (patient_entered)", async () => {
    const id = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO public.intake_submissions (organization_id, patient_id, status, responses)
                 VALUES ($1, $2, 'patient_entered', '{}') RETURNING id`,
        [ORG_A, PATIENT_A],
      );
      return rows[0]!.id;
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("portal can UPDATE (save-and-resume) its own open submission responses", async () => {
    const sub = await freshOpenSubmission();
    const affected = await asPortal(PORTAL_UID, async (c) => {
      const r = await c.query(
        `UPDATE public.intake_submissions SET responses = '{"chief_complaint":"cough"}' WHERE id = $1`,
        [sub],
      );
      return r.rowCount;
    });
    expect(affected).toBe(1);
  });

  test("portal can INSERT a problem linked to its own open submission (source patient, reconciled false)", async () => {
    const sub = await freshOpenSubmission();
    const id = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO public.problems (organization_id, patient_id, intake_submission_id, code_system, code, display, source, reconciled)
                 VALUES ($1, $2, $3, 'icd10', 'R05', 'Cough', 'patient', false) RETURNING id`,
        [ORG_A, PATIENT_A, sub],
      );
      return rows[0]!.id;
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("portal can INSERT a ros_response linked to its own open submission", async () => {
    const sub = await freshOpenSubmission();
    const id = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO public.ros_responses (organization_id, patient_id, intake_submission_id, system, finding)
                 VALUES ($1, $2, $3, 'respiratory', 'positive') RETURNING id`,
        [ORG_A, PATIENT_A, sub],
      );
      return rows[0]!.id;
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("portal can INSERT a family_history row linked to its own open submission (source patient)", async () => {
    const sub = await freshOpenSubmission();
    const id = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO public.family_history (organization_id, patient_id, intake_submission_id, relative, condition_display, source)
                 VALUES ($1, $2, $3, 'mother', 'Hypertension', 'patient') RETURNING id`,
        [ORG_A, PATIENT_A, sub],
      );
      return rows[0]!.id;
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("Portal intake: forbidden fields on INSERT (WITH CHECK raises)", () => {
  const rlsError =
    /row-level security|violates|permission denied|policy|patient_entered|transition/i;

  test("cannot INSERT a submission for a different patient", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.intake_submissions (organization_id, patient_id, status, responses)
                     VALUES ($1, $2, 'patient_entered', '{}')`,
          [ORG_B, FOREIGN_PATIENT],
        );
      }),
    ).rejects.toThrow(rlsError);
  });

  test("cannot INSERT a submission stamped with a foreign organization_id", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.intake_submissions (organization_id, patient_id, status, responses)
                     VALUES ($1, $2, 'patient_entered', '{}')`,
          [ORG_B, PATIENT_A],
        );
      }),
    ).rejects.toThrow(rlsError);
  });

  test("cannot INSERT a submission at a non-initial status (skips state machine)", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.intake_submissions (organization_id, patient_id, status, responses)
                     VALUES ($1, $2, 'provider_review', '{}')`,
          [ORG_A, PATIENT_A],
        );
      }),
    ).rejects.toThrow(rlsError);
  });

  test("cannot INSERT a submission with a clinician created_by", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.intake_submissions (organization_id, patient_id, status, responses, created_by)
                     VALUES ($1, $2, 'patient_entered', '{}', $3)`,
          [ORG_A, PATIENT_A, randomUUID()],
        );
      }),
    ).rejects.toThrow(rlsError);
  });

  test("cannot INSERT a problem with source=provider", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.problems (organization_id, patient_id, intake_submission_id, code_system, code, source, reconciled)
                     VALUES ($1, $2, $3, 'icd10', 'R05', 'provider', false)`,
          [ORG_A, PATIENT_A, sub],
        );
      }),
    ).rejects.toThrow(rlsError);
  });

  test("cannot INSERT a problem pre-reconciled (reconciled=true)", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.problems (organization_id, patient_id, intake_submission_id, code_system, code, source, reconciled)
                     VALUES ($1, $2, $3, 'icd10', 'R05', 'patient', true)`,
          [ORG_A, PATIENT_A, sub],
        );
      }),
    ).rejects.toThrow(rlsError);
  });

  test("cannot INSERT a problem linked to another patient submission", async () => {
    const foreignSub = await adminInsert("intake_submissions", {
      organization_id: ORG_B,
      patient_id: FOREIGN_PATIENT,
      status: "patient_entered",
      responses: "{}",
    });
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.problems (organization_id, patient_id, intake_submission_id, code_system, code, source, reconciled)
                     VALUES ($1, $2, $3, 'icd10', 'R05', 'patient', false)`,
          [ORG_A, PATIENT_A, foreignSub],
        );
      }),
    ).rejects.toThrow(rlsError);
  });
});

describe("Portal intake: submit lock", () => {
  test("after submitted_at is set, further portal UPDATEs are excluded (0 rows, no error)", async () => {
    const sub = await freshOpenSubmission();
    const result = await asPortal(PORTAL_UID, async (c) => {
      const submit = await c.query(
        `UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`,
        [sub],
      );
      const afterLock = await c.query(
        `UPDATE public.intake_submissions SET responses = '{"y":2}' WHERE id = $1`,
        [sub],
      );
      return { submit: submit.rowCount, afterLock: afterLock.rowCount };
    });
    expect(result.submit).toBe(1); // the submit write is admitted once
    expect(result.afterLock).toBe(0); // every write after it is excluded
  });

  test("portal cannot relocate its own submission to a foreign organization_id (WITH CHECK)", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET organization_id = $2 WHERE id = $1`, [
          sub,
          ORG_B,
        ]);
      }),
    ).rejects.toThrow(/row-level security|violates|policy/i);
  });

  test("portal cannot advance status out of patient_entered (WITH CHECK)", async () => {
    const sub = await freshOpenSubmission();
    // UPDATE ... status='provider_review': WITH CHECK requires status stays
    // patient_entered -> raises (before the state-machine trigger even runs).
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `UPDATE public.intake_submissions SET status = 'provider_review' WHERE id = $1`,
          [sub],
        );
      }),
    ).rejects.toThrow(/row-level security|violates|policy|transition/i);
  });

  test("after parent is submitted, INSERTing a child is rejected (parent no longer open)", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`, [
          sub,
        ]);
        await c.query(
          `INSERT INTO public.problems (organization_id, patient_id, intake_submission_id, code_system, code, source, reconciled)
                     VALUES ($1, $2, $3, 'icd10', 'R05', 'patient', false)`,
          [ORG_A, PATIENT_A, sub],
        );
      }),
    ).rejects.toThrow(/row-level security|violates|policy/i);
  });

  test("after parent is submitted, UPDATEing an existing child is excluded (0 rows)", async () => {
    const sub = await freshOpenSubmission();
    const problemId = await adminInsert("problems", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      intake_submission_id: sub,
      code_system: "icd10",
      code: "R05",
      display: "Cough",
      source: "patient",
      reconciled: false,
    });
    const affected = await asPortal(PORTAL_UID, async (c) => {
      await c.query(`UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`, [
        sub,
      ]);
      const r = await c.query(`UPDATE public.problems SET display = 'changed' WHERE id = $1`, [
        problemId,
      ]);
      return r.rowCount;
    });
    expect(affected).toBe(0);
  });
});

describe("Portal intake: cross-patient isolation", () => {
  test("portal cannot READ another patient submission", async () => {
    const foreignSub = await adminInsert("intake_submissions", {
      organization_id: ORG_B,
      patient_id: FOREIGN_PATIENT,
      status: "patient_entered",
      responses: "{}",
    });
    const visible = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query(`SELECT id FROM public.intake_submissions WHERE id = $1`, [
        foreignSub,
      ]);
      return rows.length;
    });
    expect(visible).toBe(0);
  });

  test("portal cannot READ another patient problem row", async () => {
    const foreignSub = await adminInsert("intake_submissions", {
      organization_id: ORG_B,
      patient_id: FOREIGN_PATIENT,
      status: "patient_entered",
      responses: "{}",
    });
    const foreignProblem = await adminInsert("problems", {
      organization_id: ORG_B,
      patient_id: FOREIGN_PATIENT,
      intake_submission_id: foreignSub,
      code_system: "icd10",
      code: "E11.9",
      display: "Diabetes",
      source: "patient",
      reconciled: false,
    });
    const visible = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query(`SELECT id FROM public.problems WHERE id = $1`, [
        foreignProblem,
      ]);
      return rows.length;
    });
    expect(visible).toBe(0);
  });
});

describe("Portal intake: zero access to vitals + clinician tables", () => {
  test("portal cannot SELECT vitals (no GRANT -> permission denied)", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`SELECT id FROM public.vitals LIMIT 1`);
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  test("portal cannot INSERT vitals (no GRANT -> permission denied)", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.vitals (organization_id, patient_id, recorded_by, heart_rate)
                     VALUES ($1, $2, $3, 70)`,
          [ORG_A, PATIENT_A, randomUUID()],
        );
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  test("portal cannot SELECT the clinician users table (no GRANT)", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`SELECT id FROM public.users LIMIT 1`);
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  test("portal cannot write intake_templates (SELECT-only grant)", async () => {
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `INSERT INTO public.intake_templates (organization_id, specialty, name, version, definition)
                     VALUES ($1, 'nope', 'Nope', 1, '{"sections":[]}'::jsonb)`,
          [ORG_A],
        );
      }),
    ).rejects.toThrow(/permission denied|row-level security|policy|violates/i);
  });
});

describe("Portal intake: template catalog read (active only)", () => {
  test("portal CAN read the active system family_medicine template", async () => {
    const n = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM public.intake_templates WHERE specialty = 'family_medicine' AND active`,
      );
      return rows.length;
    });
    expect(n).toBe(1);
  });

  test("portal CANNOT read the inactive _smoke_test template", async () => {
    const n = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM public.intake_templates WHERE specialty = '_smoke_test'`,
      );
      return rows.length;
    });
    expect(n).toBe(0);
  });

  test("portal CANNOT read another org's active template", async () => {
    const tplId = await adminInsert("intake_templates", {
      organization_id: ORG_B,
      specialty: `cardio_${SUFFIX}`,
      name: "OrgB Active",
      version: 1,
      active: true,
      definition: '{"sections":[]}',
    });
    const n = await asPortal(PORTAL_UID, async (c) => {
      const { rows } = await c.query(`SELECT id FROM public.intake_templates WHERE id = $1`, [
        tplId,
      ]);
      return rows.length;
    });
    expect(n).toBe(0);
  });
});

// HIGH-1 (P2-RLS-1): portal SELECT must be scoped to the patient's OWN intake
// submissions, NOT every same-patient row. Rows written by provider / P1D-import
// / P3-reconciliation workflows under the same patient_id must stay invisible.
describe("Portal intake: own-submission read scoping (HIGH-1)", () => {
  test("portal CAN read its own patient-entered problem linked to its own submission", async () => {
    const sub = await freshOpenSubmission();
    const id = await adminInsert("problems", childRow("problems", sub));
    expect(await portalSees("problems", id)).toBe(1);
  });

  test("portal CANNOT read an own-patient provider-authored problem (source=provider, unlinked)", async () => {
    const id = await adminInsert(
      "problems",
      childRow("problems", null, { source: "provider", reconciled: true }),
    );
    expect(await portalSees("problems", id)).toBe(0);
  });

  test("portal CANNOT read an own-patient reconciled problem even when linked to its submission", async () => {
    const sub = await freshOpenSubmission();
    const id = await adminInsert("problems", childRow("problems", sub, { reconciled: true }));
    expect(await portalSees("problems", id)).toBe(0);
  });

  test("portal CANNOT read an own-patient external_import problem (P1D import path)", async () => {
    const id = await adminInsert(
      "problems",
      childRow("problems", null, { source: "external_import" }),
    );
    expect(await portalSees("problems", id)).toBe(0);
  });

  test("portal CANNOT read an own-patient patient-source problem that is unlinked to any submission", async () => {
    const id = await adminInsert("problems", childRow("problems", null));
    expect(await portalSees("problems", id)).toBe(0);
  });

  test("portal reads its own linked family_history but not a provider-authored one", async () => {
    const sub = await freshOpenSubmission();
    const mine = await adminInsert("family_history", childRow("family_history", sub));
    const providerRow = await adminInsert(
      "family_history",
      childRow("family_history", null, { source: "provider" }),
    );
    expect(await portalSees("family_history", mine)).toBe(1);
    expect(await portalSees("family_history", providerRow)).toBe(0);
  });
});

// HIGH-2 (P2-RLS-2): family_history/social_history/immunizations now carry
// intake_submission_id; portal writes must set it and are gated on THAT parent
// submission being open -- a second open submission can no longer reopen writes
// to rows linked to an already-submitted one.
describe("Portal intake: link-less child submission linkage (HIGH-2)", () => {
  test.each(["family_history", "social_history", "immunizations"])(
    "portal INSERT %s without intake_submission_id is rejected",
    async (table) => {
      await freshOpenSubmission(); // an open intake exists; the ONLY missing piece is the link
      await expect(
        asPortal(PORTAL_UID, async (c) => {
          const { text, values } = insertSql(table, childRow(table)); // no `sub` -> no link column
          await c.query(text, values);
        }),
      ).rejects.toThrow(RLS_ERR);
    },
  );

  test("portal cannot INSERT family_history linked to an already-submitted submission", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`, [
          sub,
        ]);
        const { text, values } = insertSql("family_history", childRow("family_history", sub));
        await c.query(text, values);
      }),
    ).rejects.toThrow(RLS_ERR);
  });

  test("portal CAN UPDATE a family_history row linked to its own OPEN submission", async () => {
    const sub = await freshOpenSubmission();
    const id = await adminInsert("family_history", childRow("family_history", sub));
    const affected = await asPortal(PORTAL_UID, async (c) => {
      const r = await c.query(`UPDATE public.family_history SET note = 'edited' WHERE id = $1`, [
        id,
      ]);
      return r.rowCount;
    });
    expect(affected).toBe(1);
  });

  test("a second open submission cannot reopen writes to family_history linked to a SUBMITTED one (0 rows)", async () => {
    const subA = await freshOpenSubmission();
    const id = await adminInsert("family_history", childRow("family_history", subA));
    const affected = await asPortal(PORTAL_UID, async (c) => {
      await c.query(`UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`, [
        subA,
      ]);
      await c.query(
        `INSERT INTO public.intake_submissions (organization_id, patient_id, status, responses)
                 VALUES ($1, $2, 'patient_entered', '{}')`,
        [ORG_A, PATIENT_A],
      );
      // The old coarse has_open policy would MATCH this row because B is
      // open; the per-parent gate excludes it because A is submitted.
      const r = await c.query(`UPDATE public.family_history SET note = 'tampered' WHERE id = $1`, [
        id,
      ]);
      return r.rowCount;
    });
    expect(affected).toBe(0);
  });
});

// P2-COV-1: adversarial gaps the first pass missed.
describe("Portal intake: forbidden reviewer/snapshot writes on UPDATE (P2-COV-1)", () => {
  test("portal cannot set reviewed_by on its own open submission", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET reviewed_by = $2 WHERE id = $1`, [
          sub,
          CLINICIAN_UID,
        ]);
      }),
    ).rejects.toThrow(RLS_ERR);
  });

  test("portal cannot set reviewed_at on its own open submission", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET reviewed_at = NOW() WHERE id = $1`, [
          sub,
        ]);
      }),
    ).rejects.toThrow(RLS_ERR);
  });

  test("portal cannot set signed_snapshot on its own open submission", async () => {
    const sub = await freshOpenSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(
          `UPDATE public.intake_submissions SET signed_snapshot = '{}'::jsonb WHERE id = $1`,
          [sub],
        );
      }),
    ).rejects.toThrow(RLS_ERR);
  });
});

describe("Portal intake: child-table org relocation blocked (P2-COV-1)", () => {
  test.each(CHILD_TABLES)(
    "portal cannot relocate its own %s row to a foreign organization_id",
    async (table) => {
      const sub = await freshOpenSubmission();
      const id = await adminInsert(table, childRow(table, sub));
      await expect(
        asPortal(PORTAL_UID, async (c) => {
          await c.query(`UPDATE public.${table} SET organization_id = $2 WHERE id = $1`, [
            id,
            ORG_B,
          ]);
        }),
      ).rejects.toThrow(/row-level security|violates|policy/i);
    },
  );
});

describe("Portal intake: double submit (P2-COV-1)", () => {
  test("the second submit write is excluded by the lock (0 rows, no error)", async () => {
    const sub = await freshOpenSubmission();
    const r = await asPortal(PORTAL_UID, async (c) => {
      const first = await c.query(
        `UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`,
        [sub],
      );
      const second = await c.query(
        `UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`,
        [sub],
      );
      return { first: first.rowCount, second: second.rowCount };
    });
    expect(r.first).toBe(1);
    expect(r.second).toBe(0);
  });
});

// DELTA-RLS-1 / DELTA-COV-1: HIGH-1 must also exclude CLINICIAN-authored child
// rows linked to the patient's OWN submission -- for SELECT and for the UPDATE
// USING (old-row) scope. Portal-authored rows ALWAYS carry created_by IS NULL
// (the INSERT policies force it), so created_by is the clinician marker.
//
// The adversarial row is a clinician row that LOOKS patient-authored:
// source='patient', reconciled=false (from childRow defaults) but with a non-null
// created_by. This is the row the pre-fix policies failed to exclude:
//   - ros_responses had NO created_by check at all (source/reconciled absent), so
//     such a row was BOTH readable and updatable by the portal.
//   - the source/reconciled tables' pre-fix SELECT (source='patient' AND
//     reconciled=false) still admitted it, and the UPDATE USING (patient +
//     open-parent only) still matched it -- so a rewrite that set created_by=NULL
//     laundered it into a portal-owned row.
// A source='provider'/reconciled=true row is a WEAKER test: the SELECT policy
// already hides it (and RLS applies the SELECT policy to an UPDATE ... WHERE),
// so it can never demonstrate the gap. created_by is the load-bearing marker.
const CREATED_BY_CLINICIAN = { created_by: CLINICIAN_UID } as const;

// The rewrite a portal attacker would use to launder the row into the portal
// shape: null out created_by (and re-affirm the patient source/reconciled the
// WITH CHECK demands). Pre-fix this succeeds (1 row); post-fix it is 0 rows.
const LAUNDER_SET: Record<string, string> = {
  problems: `source='patient', reconciled=false, created_by=NULL`,
  medications: `source='patient', reconciled=false, created_by=NULL`,
  allergies: `source='patient', reconciled=false, created_by=NULL`,
  family_history: `source='patient', created_by=NULL`,
  social_history: `source='patient', created_by=NULL`,
  immunizations: `source='patient', created_by=NULL`,
  ros_responses: `created_by=NULL`,
};

describe("Portal intake: own-submission read scoping across every child table (DELTA-COV-1)", () => {
  test.each(CHILD_TABLES)(
    "portal CAN read its own patient-authored %s row linked to its submission",
    async (table) => {
      const sub = await freshOpenSubmission();
      const id = await adminInsert(table, childRow(table, sub)); // created_by NULL, source patient
      expect(await portalSees(table, id)).toBe(1);
    },
  );

  test.each(CHILD_TABLES)(
    "portal CANNOT read a clinician-authored %s row linked to its own submission (created_by set)",
    async (table) => {
      const sub = await freshOpenSubmission();
      const id = await adminInsert(table, childRow(table, sub, CREATED_BY_CLINICIAN));
      expect(await portalSees(table, id)).toBe(0);
    },
  );
});

describe("Portal intake: clinician-authored linked rows cannot be hijacked via UPDATE (DELTA-RLS-1)", () => {
  test.each(CHILD_TABLES)(
    "portal cannot launder a clinician-authored linked %s row into a patient row (0 rows)",
    async (table) => {
      const sub = await freshOpenSubmission(); // the patient's OWN, still-open submission
      const id = await adminInsert(table, childRow(table, sub, CREATED_BY_CLINICIAN));
      const affected = await asPortal(PORTAL_UID, async (c) => {
        const r = await c.query(`UPDATE public.${table} SET ${LAUNDER_SET[table]} WHERE id = $1`, [
          id,
        ]);
        return r.rowCount;
      });
      expect(affected).toBe(0);
    },
  );
});

// DELTA2-RLS-1 (CODEX-REVIEW-P2-DELTA2, the single HIGH): a PROVIDER-INITIATED
// intake_submissions row (created_by set, still patient_entered + unsubmitted) is a
// legitimate row the patient must be able to complete. The pre-fix portal UPDATE
// WITH CHECK pinned `created_by IS NULL`, which blocked a normal save (created_by
// preserved) yet ADMITTED a save that NULLed created_by -- letting the patient erase
// provider provenance (rowcount 1). P2-FIXES-3 moves the invariant to its correct
// home: created_by is now immutable in the role-agnostic state-machine trigger, and
// the portal WITH CHECK drops the created_by pin. A trigger raise carries "immutable"
// in its message (proving the TRIGGER, not just an RLS deny, is what blocks tamper).
const CREATED_BY_IMMUTABLE = /immutable/i;

// A provider-INITIATED open submission for PATIENT_A: created_by = the clinician,
// still patient_entered + unsubmitted (the exact shape DELTA2-RLS-1 is about).
async function providerInitiatedSubmission(): Promise<string> {
  return adminInsert("intake_submissions", {
    organization_id: ORG_A,
    patient_id: PATIENT_A,
    status: "patient_entered",
    responses: "{}",
    created_by: CLINICIAN_UID,
  });
}

describe("Portal intake: provider-initiated submission provenance (DELTA2-RLS-1)", () => {
  test("(a) portal CAN save responses on a provider-initiated open submission; created_by preserved", async () => {
    const sub = await providerInitiatedSubmission();
    const result = await asPortal(PORTAL_UID, async (c) => {
      const r = await c.query(
        `UPDATE public.intake_submissions SET responses = '{"chief_complaint":"cough"}' WHERE id = $1`,
        [sub],
      );
      const { rows } = await c.query(
        `SELECT created_by FROM public.intake_submissions WHERE id = $1`,
        [sub],
      );
      return { affected: r.rowCount, createdBy: rows[0]?.created_by };
    });
    expect(result.affected).toBe(1); // normal save now succeeds (pre-fix: WITH CHECK rejected)
    expect(result.createdBy).toBe(CLINICIAN_UID); // provider provenance untouched
  });

  test("(a+d) portal CAN complete (submit) a provider-initiated submission; created_by intact; lock then holds", async () => {
    const sub = await providerInitiatedSubmission();
    const result = await asPortal(PORTAL_UID, async (c) => {
      const submit = await c.query(
        `UPDATE public.intake_submissions SET submitted_at = NOW() WHERE id = $1`,
        [sub],
      );
      const { rows } = await c.query(
        `SELECT created_by FROM public.intake_submissions WHERE id = $1`,
        [sub],
      );
      const afterLock = await c.query(
        `UPDATE public.intake_submissions SET responses = '{"y":2}' WHERE id = $1`,
        [sub],
      );
      return {
        submit: submit.rowCount,
        createdBy: rows[0]?.created_by,
        afterLock: afterLock.rowCount,
      };
    });
    expect(result.submit).toBe(1); // submit admitted once (pre-fix: created_by pin blocked it)
    expect(result.createdBy).toBe(CLINICIAN_UID); // provenance preserved through submit
    expect(result.afterLock).toBe(0); // (d) post-submit lock still holds -> 0 rows, no error
  });

  test("(b) portal CANNOT null created_by on a provider-initiated submission (trigger raises)", async () => {
    const sub = await providerInitiatedSubmission();
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET created_by = NULL WHERE id = $1`, [
          sub,
        ]);
      }),
    ).rejects.toThrow(CREATED_BY_IMMUTABLE);
  });

  test("(b) portal CANNOT stamp created_by onto its own patient-initiated submission (trigger raises)", async () => {
    const sub = await freshOpenSubmission(); // created_by NULL
    await expect(
      asPortal(PORTAL_UID, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET created_by = $2 WHERE id = $1`, [
          sub,
          CLINICIAN_UID,
        ]);
      }),
    ).rejects.toThrow(CREATED_BY_IMMUTABLE);
  });

  test("(c) role-agnostic state transition on a provider-initiated submission is unaffected; created_by preserved", async () => {
    const sub = await providerInitiatedSubmission();
    // The clinician (role-agnostic path here via admin) advances the state machine;
    // a transition never touches created_by, so the new immutability guard is transparent.
    await admin.query(
      `UPDATE public.intake_submissions SET status = 'provider_review' WHERE id = $1`,
      [sub],
    );
    const { rows } = await admin.query(
      `SELECT created_by, status FROM public.intake_submissions WHERE id = $1`,
      [sub],
    );
    expect(rows[0].created_by).toBe(CLINICIAN_UID);
    expect(rows[0].status).toBe("provider_review");
  });

  test("(c) created_by is immutable for ALL roles: even an owner/admin UPDATE changing it raises", async () => {
    const sub = await providerInitiatedSubmission();
    await expect(
      admin.query(`UPDATE public.intake_submissions SET created_by = NULL WHERE id = $1`, [sub]),
    ).rejects.toThrow(CREATED_BY_IMMUTABLE);
  });
});
