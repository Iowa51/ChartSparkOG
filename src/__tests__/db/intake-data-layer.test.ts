// DB-integration tests for the Sprint 0 / Phase 1 intake data layer:
//   * RLS: cross-tenant read AND write blocked on every new PHI table
//   * State machine: illegal transitions rejected; signed submissions immutable;
//     INSERT governed (SM-1); signed_snapshot server-derived (SM-2)
//   * Reconciled-row lock: rows of a signed submission cannot be mutated
//   * Vitals RLS remediation (item 7): vitals + siblings org-scoped
//   * anon deny-by-default; intake_templates cross-org scoping (RLS-1)
//
// Run with:
//   bash scripts/db-local-verify.sh
//   npm run test:db
//
// Connects to the local harness DB (127.0.0.1:54322, postgres/postgres)
// unless SUPABASE_DB_URL overrides. Never point SUPABASE_DB_URL at a remote.

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DB_URL = process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;

// Spec-mandated fixtures. Clinician lives in ORG_A; the "foreign" patient
// lives in ORG_B, so the clinician must not be able to read or write that
// patient's intake rows.
const CLINICIAN_ID = "4b4c04d9-4b40-48fe-93c0-e41b544ceb54";
const FOREIGN_PATIENT_ID = "9c50ac6f-9abb-4439-b654-70a69c751165";

// Per-run unique orgs/patient so parallel or prior runs do not collide.
const ORG_A = randomUUID();
const ORG_B = randomUUID();
const PATIENT_A = randomUUID();
const SUFFIX = randomUUID().slice(0, 8);

// One representative valid row per PHI table. `sub` is the submission id used
// where the table requires one (ros_responses).
type RowFactory = (org: string, patient: string, sub: string) => Record<string, unknown>;

const PHI_TABLES: { name: string; row: RowFactory }[] = [
  {
    name: "intake_submissions",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      status: "patient_entered",
      responses: "{}",
    }),
  },
  {
    name: "problems",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      code_system: "icd10",
      code: "E11.9",
      display: "Type 2 diabetes",
    }),
  },
  {
    name: "medications",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      name: "Metformin",
      rxnorm_code: "860975",
    }),
  },
  {
    name: "allergies",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      allergen_type: "drug",
      allergen_display: "Penicillin",
      severity: "moderate",
    }),
  },
  {
    name: "family_history",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      relative: "mother",
      condition_display: "Hypertension",
    }),
  },
  {
    name: "social_history",
    row: (org, patient) => ({ organization_id: org, patient_id: patient, tobacco_status: "never" }),
  },
  {
    name: "immunizations",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      vaccine_display: "Influenza",
    }),
  },
  {
    name: "ros_responses",
    row: (org, patient, sub) => ({
      organization_id: org,
      patient_id: patient,
      intake_submission_id: sub,
      system: "cardiovascular",
      finding: "negative",
    }),
  },
];

// The pre-existing vitals + sibling tables (20260218) tightened to org-scoped
// RLS by the P1-FIXES migration (20260706120003). `recorded_by`/`administered_by`/
// `provider_id` are NOT NULL but carry no FK, so any uuid is valid.
const VITALS_TABLES: { name: string; row: RowFactory }[] = [
  {
    name: "vitals",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      recorded_by: CLINICIAN_ID,
      heart_rate: 72,
    }),
  },
  {
    name: "screening_scores",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      administered_by: CLINICIAN_ID,
      instrument: "PHQ9",
      total_score: 5,
      item_responses: "{}",
    }),
  },
  {
    name: "smart_triage_results",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      triage_type: "chart_summary",
      result_data: "{}",
    }),
  },
  {
    name: "medication_interaction_log",
    row: (org, patient) => ({
      organization_id: org,
      patient_id: patient,
      medication_a: "DrugA",
      medication_b: "DrugB",
      severity: "low",
      action_taken: "acknowledged",
      provider_id: CLINICIAN_ID,
    }),
  },
];

let admin: Client;
let clin: Client; // used to impersonate the authenticated clinician
let submissionA = ""; // submission in ORG_A (for positive ros_responses insert)
let submissionB = ""; // submission in ORG_B (foreign; for negative ros_responses)

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

// Run `fn` inside a transaction impersonating an authenticated user, then roll
// back so nothing persists. RLS is enforced because the session role becomes
// the non-superuser `authenticated`.
async function asUser<T>(userId: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await clin.query("BEGIN");
  try {
    await clin.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await clin.query("SET LOCAL ROLE authenticated");
    return await fn(clin);
  } finally {
    await clin.query("ROLLBACK");
  }
}

// Run `fn` impersonating the unauthenticated `anon` role, then roll back.
// RLS policies are all `TO authenticated`, so anon is denied by default.
async function asAnon<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await clin.query("BEGIN");
  try {
    await clin.query("SET LOCAL ROLE anon");
    return await fn(clin);
  } finally {
    await clin.query("ROLLBACK");
  }
}

// Best-effort teardown that bypasses the immutability/lock triggers (superuser
// replica mode) and removes everything keyed on our run's orgs + fixed ids.
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
    // Pre-existing vitals + siblings (org/patient-keyed, no cross-FK here).
    "vitals",
    "screening_scores",
    "smart_triage_results",
    "medication_interaction_log",
  ];
  try {
    await c.query(`SET session_replication_role = 'replica'`);
    for (const t of childTables) {
      await c
        .query(
          `DELETE FROM public.${t} WHERE organization_id = ANY($1::uuid[]) OR patient_id = ANY($2::uuid[])`,
          [
            [ORG_A, ORG_B],
            [PATIENT_A, FOREIGN_PATIENT_ID],
          ],
        )
        .catch(() => undefined);
    }
    // intake_templates has organization_id but no patient_id; keep system
    // (organization_id IS NULL) seed templates intact.
    await c
      .query(`DELETE FROM public.intake_templates WHERE organization_id = ANY($1::uuid[])`, [
        [ORG_A, ORG_B],
      ])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM public.patients WHERE id = ANY($1::uuid[])`, [
        [PATIENT_A, FOREIGN_PATIENT_ID],
      ])
      .catch(() => undefined);
    await c.query(`DELETE FROM public.users WHERE id = $1`, [CLINICIAN_ID]).catch(() => undefined);
    await c.query(`DELETE FROM auth.users WHERE id = $1`, [CLINICIAN_ID]).catch(() => undefined);
    await c
      .query(`DELETE FROM public.organizations WHERE id = ANY($1::uuid[])`, [[ORG_A, ORG_B]])
      .catch(() => undefined);
  } finally {
    await c.query(`SET session_replication_role = 'origin'`).catch(() => undefined);
  }
}

beforeAll(async () => {
  admin = new Client({ connectionString: DB_URL });
  await admin.connect();

  // Fail fast if this phase's migration has not been applied.
  const { rows } = await admin.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intake_submissions'`,
  );
  if (rows.length === 0) {
    throw new Error(
      "public.intake_submissions not found. Run `bash scripts/db-local-verify.sh` " +
        "to build the local verification DB before `npm run test:db`.",
    );
  }

  clin = new Client({ connectionString: DB_URL });
  await clin.connect();

  // Clean any residue from a crashed prior run, then seed fixtures as admin
  // (postgres bypasses RLS).
  await cleanup(admin);

  await admin.query(
    `INSERT INTO public.organizations (id, name, slug) VALUES ($1,$2,$3), ($4,$5,$6)`,
    [ORG_A, `Org A ${SUFFIX}`, `org-a-${SUFFIX}`, ORG_B, `Org B ${SUFFIX}`, `org-b-${SUFFIX}`],
  );
  await admin.query(`INSERT INTO auth.users (id) VALUES ($1)`, [CLINICIAN_ID]);
  await admin.query(
    `INSERT INTO public.users (id, email, role, organization_id) VALUES ($1,$2,'USER',$3)`,
    [CLINICIAN_ID, `clinician-${SUFFIX}@test.local`, ORG_A],
  );
  await admin.query(
    `INSERT INTO public.patients (id, organization_id, first_name, last_name) VALUES ($1,$2,'A','Patient'), ($3,$4,'B','Patient')`,
    [PATIENT_A, ORG_A, FOREIGN_PATIENT_ID, ORG_B],
  );

  submissionA = await adminInsert("intake_submissions", {
    organization_id: ORG_A,
    patient_id: PATIENT_A,
    status: "patient_entered",
    responses: "{}",
  });
  submissionB = await adminInsert("intake_submissions", {
    organization_id: ORG_B,
    patient_id: FOREIGN_PATIENT_ID,
    status: "patient_entered",
    responses: "{}",
  });
});

afterAll(async () => {
  if (admin) await cleanup(admin);
  await clin?.end().catch(() => undefined);
  await admin?.end().catch(() => undefined);
});

describe("RLS: cross-tenant isolation on every new PHI table", () => {
  for (const { name, row } of PHI_TABLES) {
    test(`${name}: clinician (ORG_A) cannot READ ORG_B rows`, async () => {
      // Seed a foreign (ORG_B) row as admin.
      const foreignId = await adminInsert(name, row(ORG_B, FOREIGN_PATIENT_ID, submissionB));

      const visible = await asUser(CLINICIAN_ID, async (c) => {
        const { rows } = await c.query(`SELECT id FROM public.${name} WHERE id = $1`, [foreignId]);
        return rows.length;
      });
      expect(visible).toBe(0);
    });

    test(`${name}: clinician (ORG_A) cannot WRITE an ORG_B-stamped row`, async () => {
      await expect(
        asUser(CLINICIAN_ID, async (c) => {
          const { text, values } = insertSql(name, row(ORG_B, FOREIGN_PATIENT_ID, submissionB));
          await c.query(text, values);
        }),
      ).rejects.toThrow(/row-level security|violates|permission denied|policy/i);
    });

    test(`${name}: clinician (ORG_A) CAN write within their own org (positive control)`, async () => {
      const inserted = await asUser(CLINICIAN_ID, async (c) => {
        const { text, values } = insertSql(name, row(ORG_A, PATIENT_A, submissionA));
        const { rows } = await c.query<{ id: string }>(text, values);
        return rows[0]!.id;
      });
      expect(inserted).toMatch(/^[0-9a-f-]{36}$/i);
    });
  }
});

describe("State machine: intake_submissions", () => {
  async function freshSubmission(): Promise<string> {
    return adminInsert("intake_submissions", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      status: "patient_entered",
      responses: "{}",
    });
  }
  async function setStatus(id: string, status: string) {
    // P3-CRIT-2: provider_review requires submitted_at. Stamp it on the first
    // transition (COALESCE keeps it once set) so these state-machine tests
    // exercise the legal flow. No first-class rows exist here, so the
    // reconciled/signed readiness gate passes trivially.
    await admin.query(
      `UPDATE public.intake_submissions SET status = $2, submitted_at = COALESCE(submitted_at, NOW()) WHERE id = $1`,
      [id, status],
    );
  }

  test("legal path patient_entered -> provider_review -> reconciled -> signed", async () => {
    const id = await freshSubmission();
    await expect(setStatus(id, "provider_review")).resolves.toBeUndefined();
    await expect(setStatus(id, "reconciled")).resolves.toBeUndefined();
    await expect(setStatus(id, "signed")).resolves.toBeUndefined();

    const { rows } = await admin.query<{ signed_snapshot: unknown }>(
      `SELECT signed_snapshot FROM public.intake_submissions WHERE id = $1`,
      [id],
    );
    expect(rows[0]!.signed_snapshot).not.toBeNull();
    expect(rows[0]!.signed_snapshot).toMatchObject({ submission_id: id });
  });

  test("skip patient_entered -> reconciled is rejected", async () => {
    const id = await freshSubmission();
    await expect(setStatus(id, "reconciled")).rejects.toThrow(/illegal .* transition/i);
  });

  test("skip patient_entered -> signed is rejected", async () => {
    const id = await freshSubmission();
    await expect(setStatus(id, "signed")).rejects.toThrow(/illegal .* transition/i);
  });

  test("skip provider_review -> signed is rejected", async () => {
    const id = await freshSubmission();
    await setStatus(id, "provider_review");
    await expect(setStatus(id, "signed")).rejects.toThrow(/illegal .* transition/i);
  });

  test("backward reconciled -> provider_review is rejected", async () => {
    const id = await freshSubmission();
    await setStatus(id, "provider_review");
    await setStatus(id, "reconciled");
    await expect(setStatus(id, "provider_review")).rejects.toThrow(/illegal .* transition/i);
  });

  test("signed submission is immutable (UPDATE rejected)", async () => {
    const id = await freshSubmission();
    await setStatus(id, "provider_review");
    await setStatus(id, "reconciled");
    await setStatus(id, "signed");
    await expect(
      admin.query(`UPDATE public.intake_submissions SET responses = '{"x":1}' WHERE id = $1`, [id]),
    ).rejects.toThrow(/signed and immutable/i);
  });

  test("signed submission cannot be DELETEd", async () => {
    const id = await freshSubmission();
    await setStatus(id, "provider_review");
    await setStatus(id, "reconciled");
    await setStatus(id, "signed");
    await expect(
      admin.query(`DELETE FROM public.intake_submissions WHERE id = $1`, [id]),
    ).rejects.toThrow(/signed and cannot be deleted/i);
  });
});

describe("Reconciled-row lock: children of a signed submission", () => {
  test("a reconciled problem cannot be mutated once its submission is signed; new versions still insert", async () => {
    const subId = await adminInsert("intake_submissions", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      status: "patient_entered",
      responses: "{}",
    });
    // P3-CRIT-2: stamp submitted_at (provider_review gate). The problem is
    // inserted after 'reconciled', so the readiness gate sees no rows here.
    await admin.query(
      `UPDATE public.intake_submissions SET status = 'provider_review', submitted_at = NOW() WHERE id = $1`,
      [subId],
    );
    await admin.query(`UPDATE public.intake_submissions SET status = 'reconciled' WHERE id = $1`, [
      subId,
    ]);

    const problemId = await adminInsert("problems", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      intake_submission_id: subId,
      code_system: "icd10",
      code: "I10",
      display: "Hypertension",
      reconciled: true,
    });

    await admin.query(`UPDATE public.intake_submissions SET status = 'signed' WHERE id = $1`, [
      subId,
    ]);

    await expect(
      admin.query(`UPDATE public.problems SET display = 'changed' WHERE id = $1`, [problemId]),
    ).rejects.toThrow(/locked|signed/i);

    await expect(
      admin.query(`DELETE FROM public.problems WHERE id = $1`, [problemId]),
    ).rejects.toThrow(/locked|signed/i);

    // A new version (INSERT) linked to the same signed submission is allowed.
    const newVersion = await adminInsert("problems", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      intake_submission_id: subId,
      code_system: "icd10",
      code: "I10",
      display: "Hypertension (corrected)",
      reconciled: true,
    });
    expect(newVersion).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("Template catalog: intake_templates", () => {
  test("both seed templates exist; smoke-test template is inactive", async () => {
    const { rows } = await admin.query<{ specialty: string; active: boolean }>(
      `SELECT specialty, active FROM public.intake_templates
             WHERE specialty IN ('family_medicine', '_smoke_test') ORDER BY specialty`,
    );
    const bySpecialty = Object.fromEntries(rows.map((r) => [r.specialty, r.active]));
    expect(bySpecialty["family_medicine"]).toBe(true);
    expect(bySpecialty["_smoke_test"]).toBe(false);
  });

  test("a normal clinician cannot read the inactive _smoke_test template", async () => {
    const visible = await asUser(CLINICIAN_ID, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM public.intake_templates WHERE specialty = '_smoke_test'`,
      );
      return rows.length;
    });
    expect(visible).toBe(0);
  });

  test("a normal clinician (USER) cannot write a template", async () => {
    await expect(
      asUser(CLINICIAN_ID, async (c) => {
        await c.query(
          `INSERT INTO public.intake_templates (organization_id, specialty, name, version, definition)
                     VALUES ($1, 'cardiology', 'Nope', 1, '{"sections":[]}'::jsonb)`,
          [ORG_A],
        );
      }),
    ).rejects.toThrow(/row-level security|violates|permission denied|policy/i);
  });
});

// ============================================================
// SM-1: the state machine now governs INSERT. New rows may only enter at
// 'patient_entered'; transition-derived fields cannot be supplied at insert.
// (Runs as the superuser `admin` — BEFORE triggers fire regardless of role.)
// ============================================================
describe("State machine: INSERT is governed (SM-1)", () => {
  for (const badStatus of ["provider_review", "reconciled", "signed"]) {
    test(`INSERT with status='${badStatus}' is rejected`, async () => {
      await expect(
        adminInsert("intake_submissions", {
          organization_id: ORG_A,
          patient_id: PATIENT_A,
          status: badStatus,
          responses: "{}",
        }),
      ).rejects.toThrow(/patient_entered|transition/i);
    });
  }

  test("INSERT carrying a pre-supplied signed_snapshot is rejected", async () => {
    await expect(
      adminInsert("intake_submissions", {
        organization_id: ORG_A,
        patient_id: PATIENT_A,
        status: "patient_entered",
        responses: "{}",
        signed_snapshot: JSON.stringify({ forged: true }),
      }),
    ).rejects.toThrow(/signed_snapshot|reviewed|transition/i);
  });

  test("INSERT carrying a pre-supplied reviewed_by is rejected", async () => {
    await expect(
      adminInsert("intake_submissions", {
        organization_id: ORG_A,
        patient_id: PATIENT_A,
        status: "patient_entered",
        responses: "{}",
        reviewed_by: CLINICIAN_ID,
      }),
    ).rejects.toThrow(/reviewed|signed_snapshot|transition/i);
  });

  test("INSERT at the initial state still succeeds (positive control)", async () => {
    const id = await adminInsert("intake_submissions", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      responses: "{}",
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

// ============================================================
// SM-2: at reconciled->signed the trigger ALWAYS rebuilds signed_snapshot
// server-side; a caller-supplied value is discarded, and there is no
// NULL-at-sign path.
// ============================================================
describe("State machine: signed_snapshot is server-derived (SM-2)", () => {
  type Snapshot = {
    forged?: unknown;
    submission_id?: string;
    problems: Array<{ code: string }>;
    medications: unknown[];
    allergies: unknown[];
    ros: unknown[];
  };

  async function reconciledSubmission(): Promise<string> {
    const id = await adminInsert("intake_submissions", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      status: "patient_entered",
      responses: "{}",
    });
    // P3-CRIT-2: provider_review requires submitted_at. Reconciled children (if
    // any) are inserted by the caller after this returns, so the readiness gate
    // sees no unresolved rows at the reconciled transition here.
    await admin.query(
      `UPDATE public.intake_submissions SET status='provider_review', submitted_at=NOW() WHERE id=$1`,
      [id],
    );
    await admin.query(`UPDATE public.intake_submissions SET status='reconciled' WHERE id=$1`, [id]);
    return id;
  }

  test("a caller-supplied snapshot on sign is discarded; server rebuilds it from reconciled state", async () => {
    const id = await reconciledSubmission();
    // A reconciled child linked to this submission MUST appear in the snapshot.
    await adminInsert("problems", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      intake_submission_id: id,
      code_system: "icd10",
      code: "I10",
      display: "Hypertension",
      reconciled: true,
    });

    // Sign WITH a forged snapshot (empty problems, extra key).
    await admin.query(
      `UPDATE public.intake_submissions SET status='signed', signed_snapshot=$2 WHERE id=$1`,
      [id, JSON.stringify({ forged: true, problems: [] })],
    );

    const { rows } = await admin.query<{ signed_snapshot: Snapshot }>(
      `SELECT signed_snapshot FROM public.intake_submissions WHERE id=$1`,
      [id],
    );
    const snap = rows[0]!.signed_snapshot;
    expect(snap).not.toBeNull();
    expect(snap.forged).toBeUndefined(); // forged key discarded
    expect(snap.submission_id).toBe(id); // server field present
    expect(Array.isArray(snap.problems)).toBe(true);
    expect(snap.problems).toHaveLength(1); // reconciled child captured
    expect(snap.problems[0]!.code).toBe("I10");
  });

  test("signing with no children yields a non-null snapshot with empty arrays", async () => {
    const id = await reconciledSubmission();
    await admin.query(`UPDATE public.intake_submissions SET status='signed' WHERE id=$1`, [id]);
    const { rows } = await admin.query<{ signed_snapshot: Snapshot }>(
      `SELECT signed_snapshot FROM public.intake_submissions WHERE id=$1`,
      [id],
    );
    const snap = rows[0]!.signed_snapshot;
    expect(snap).not.toBeNull();
    expect(snap.problems).toEqual([]);
    expect(snap.medications).toEqual([]);
    expect(snap.allergies).toEqual([]);
    expect(snap.ros).toEqual([]);
  });
});

// ============================================================
// Vitals RLS remediation (CODEX-REVIEW-P1 item 7): vitals + the sibling
// tables are now org-scoped, matching the intake-table pattern.
// ============================================================
describe("Vitals RLS remediation: cross-tenant isolation (item 7)", () => {
  for (const { name, row } of VITALS_TABLES) {
    test(`${name}: clinician (ORG_A) cannot READ ORG_B rows`, async () => {
      const foreignId = await adminInsert(name, row(ORG_B, FOREIGN_PATIENT_ID, ""));
      const visible = await asUser(CLINICIAN_ID, async (c) => {
        const { rows } = await c.query(`SELECT id FROM public.${name} WHERE id = $1`, [foreignId]);
        return rows.length;
      });
      expect(visible).toBe(0);
    });

    test(`${name}: clinician (ORG_A) cannot WRITE an ORG_B-stamped row`, async () => {
      await expect(
        asUser(CLINICIAN_ID, async (c) => {
          const { text, values } = insertSql(name, row(ORG_B, FOREIGN_PATIENT_ID, ""));
          await c.query(text, values);
        }),
      ).rejects.toThrow(/row-level security|violates|permission denied|policy/i);
    });

    test(`${name}: clinician (ORG_A) CAN write within their own org (positive control)`, async () => {
      const inserted = await asUser(CLINICIAN_ID, async (c) => {
        const { text, values } = insertSql(name, row(ORG_A, PATIENT_A, ""));
        const { rows } = await c.query<{ id: string }>(text, values);
        return rows[0]!.id;
      });
      expect(inserted).toMatch(/^[0-9a-f-]{36}$/i);
    });
  }
});

describe("Vitals RLS remediation: getPatientLatestVitals read path (item 7.4)", () => {
  test("in-org clinician reads latest vitals for an in-org patient (feature keeps working)", async () => {
    await adminInsert("vitals", {
      organization_id: ORG_A,
      patient_id: PATIENT_A,
      recorded_by: CLINICIAN_ID,
      heart_rate: 80,
    });
    const found = await asUser(CLINICIAN_ID, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM public.vitals WHERE patient_id=$1 AND organization_id=$2 ORDER BY created_at DESC LIMIT 1`,
        [PATIENT_A, ORG_A],
      );
      return rows.length;
    });
    expect(found).toBe(1);
  });

  test("cross-org patient_id-only read now returns nothing (leak closed)", async () => {
    await adminInsert("vitals", {
      organization_id: ORG_B,
      patient_id: FOREIGN_PATIENT_ID,
      recorded_by: CLINICIAN_ID,
      heart_rate: 90,
    });
    // Mimics the OLD getPatientLatestVitals (patient_id filter only, no org).
    const found = await asUser(CLINICIAN_ID, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM public.vitals WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [FOREIGN_PATIENT_ID],
      );
      return rows.length;
    });
    expect(found).toBe(0);
  });
});

// ============================================================
// anon deny-by-default (item 6, "Ollie's Nest"): every RLS policy is
// `TO authenticated`, so the unauthenticated anon role sees nothing and
// cannot write, even though the harness grants anon table-level SELECT.
// ============================================================
describe("anon role: deny-by-default (item 6)", () => {
  const ALL_TABLES = [
    "intake_templates",
    "intake_submissions",
    "problems",
    "medications",
    "allergies",
    "family_history",
    "social_history",
    "ros_responses",
    "immunizations",
    "vitals",
  ];
  for (const t of ALL_TABLES) {
    test(`anon SELECT on ${t} returns 0 rows`, async () => {
      const n = await asAnon(async (c) => {
        const { rows } = await c.query(`SELECT * FROM public.${t} LIMIT 5`);
        return rows.length;
      });
      expect(n).toBe(0);
    });
  }

  test("anon cannot INSERT into a PHI table", async () => {
    await expect(
      asAnon(async (c) => {
        await c.query(
          `INSERT INTO public.problems (organization_id, patient_id, code_system, code)
                     VALUES ($1, $2, 'icd10', 'E11.9')`,
          [ORG_A, PATIENT_A],
        );
      }),
    ).rejects.toThrow(/permission denied|row-level security|policy|violates/i);
  });
});

// ============================================================
// intake_templates cross-org scoping (RLS-1 fix): global read is limited to
// ACTIVE SYSTEM (organization_id IS NULL) templates; an org reads only its own
// templates otherwise.
// ============================================================
describe("Template catalog: intake_templates cross-org scoping (RLS-1 fix)", () => {
  test("clinician CAN read the active system (org NULL) family_medicine template", async () => {
    const n = await asUser(CLINICIAN_ID, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM public.intake_templates
                 WHERE specialty='family_medicine' AND organization_id IS NULL AND active`,
      );
      return rows.length;
    });
    expect(n).toBe(1);
  });

  test("clinician CANNOT read another org's ACTIVE template (leak closed)", async () => {
    const tplId = await adminInsert("intake_templates", {
      organization_id: ORG_B,
      specialty: `cardio_${SUFFIX}`,
      name: "OrgB Active Tpl",
      version: 1,
      active: true,
      definition: '{"sections":[]}',
    });
    const n = await asUser(CLINICIAN_ID, async (c) => {
      const { rows } = await c.query(`SELECT id FROM public.intake_templates WHERE id=$1`, [tplId]);
      return rows.length;
    });
    expect(n).toBe(0);
  });

  test("clinician CAN read an own-org template even when inactive", async () => {
    const tplId = await adminInsert("intake_templates", {
      organization_id: ORG_A,
      specialty: `derm_${SUFFIX}`,
      name: "OrgA Tpl",
      version: 1,
      active: false,
      definition: '{"sections":[]}',
    });
    const n = await asUser(CLINICIAN_ID, async (c) => {
      const { rows } = await c.query(`SELECT id FROM public.intake_templates WHERE id=$1`, [tplId]);
      return rows.length;
    });
    expect(n).toBe(1);
  });
});
