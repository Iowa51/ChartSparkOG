// DB-integration tests for Sprint 2 / P3 -- provider reconciliation + child-row
// materialization (migration 20260708120000_sprint2_p3_reconciliation.sql).
//
// Covers:
//   * portal_submit_intake RPC: materializes 7 domains from responses JSONB,
//     source='patient'/reconciled=false/linked/created_by NULL; NKDA suppresses
//     allergen rows; code-less rows flagged needs_coding; idempotent re-submit;
//     transactional rollback on malformed input; auth.uid() ownership guard.
//   * RPC privilege: EXECUTE granted to patient_portal, DENIED to authenticated
//     (role-escape probe, delta3 pattern).
//   * Reconciliation state machine (provider = authenticated): forward
//     transitions only; provider attribution (reconciled_by/reconciled_at);
//     reject soft-flag; sign builds the snapshot from reconciled rows only and
//     locks the child rows; cross-org isolation.
//
// RLS semantics: USING excludes -> 0 rows (no error); WITH CHECK / trigger /
// privilege violation -> raises.
//
// Run with:  bash scripts/db-local-verify.sh  &&  npm run test:db

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DB_URL = process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;

const ORG_A = randomUUID();
const ORG_B = randomUUID();
const PATIENT_A = randomUUID();
const PATIENT_B = randomUUID();
const PORTAL_UID = randomUUID(); // Supabase Auth id for PATIENT_A
const CLIN_A = randomUUID(); // provider in ORG_A
const CLIN_B = randomUUID(); // provider in ORG_B
const SUFFIX = randomUUID().slice(0, 8);

let admin: Client;
let sess: Client; // used for SET LOCAL ROLE impersonation

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

// Run fn inside a txn as `role` with auth.uid()=uid, then ROLLBACK (nothing
// persists). Multiple queries in one call share the txn and build on each other.
async function asRole<T>(role: string, uid: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await sess.query("BEGIN");
  try {
    await sess.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: uid, role }),
    ]);
    await sess.query(`SET LOCAL ROLE ${role}`);
    return await fn(sess);
  } finally {
    await sess.query("ROLLBACK");
  }
}

// Call the materialization RPC with auth.uid()=uid on the (autocommit) admin
// connection so its effects PERSIST -- lets us test idempotency across calls.
// admin is superuser so grants don't block it; the function still runs
// SECURITY DEFINER and reads request.jwt.claims for its ownership guard.
async function callRpc(uid: string, submissionId: string): Promise<Record<string, unknown>> {
  await admin.query(`SELECT set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: uid }),
  ]);
  try {
    const { rows } = await admin.query<{ r: Record<string, unknown> }>(
      `SELECT public.portal_submit_intake($1) AS r`,
      [submissionId],
    );
    return rows[0]!.r;
  } finally {
    await admin.query(`SELECT set_config('request.jwt.claims', '', false)`);
  }
}

function newSubmission(responses: unknown, patientId = PATIENT_A, orgId = ORG_A): Promise<string> {
  return adminInsert("intake_submissions", {
    organization_id: orgId,
    patient_id: patientId,
    status: "patient_entered",
    responses: JSON.stringify(responses),
  });
}

// Open a txn on `c` as patient_portal with auth.uid()=uid (does NOT commit/rollback
// -- the caller controls the transaction; used for the concurrency probe).
async function beginAsPortal(c: Client, uid: string): Promise<void> {
  await c.query("BEGIN");
  await c.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: uid, role: "patient_portal" }),
  ]);
  await c.query("SET LOCAL ROLE patient_portal");
}

// Resolve every first-class row so the P3-CRIT-2 readiness gate admits
// reconciled/signed: accept the coded rows, reject the code-less ones.
async function resolveAllFirstClass(c: Client, sub: string): Promise<void> {
  for (const t of ["problems", "medications", "allergies"]) {
    await c.query(
      `UPDATE public.${t} SET reconciled=true, reconciled_by=$2, reconciled_at=NOW()
        WHERE intake_submission_id=$1 AND rejected=false AND needs_coding=false`,
      [sub, CLIN_A],
    );
    await c.query(
      `UPDATE public.${t} SET rejected=true WHERE intake_submission_id=$1 AND needs_coding=true`,
      [sub],
    );
  }
}

async function countChildren(table: string, sub: string): Promise<number> {
  const { rows } = await admin.query<{ n: string }>(
    `SELECT count(*)::int AS n FROM public.${table} WHERE intake_submission_id = $1`,
    [sub],
  );
  return Number(rows[0]!.n);
}

// A representative filled-in intake payload (mirrors the FM template response shape).
const RICH_RESPONSES = {
  pmh: {
    problems: [
      {
        coded: { code: "E11.9", display: "Type 2 diabetes mellitus", system: "icd10" },
        detail: "",
      },
      { coded: { code: null, display: "Chronic knee pain", system: "icd10" }, detail: "" },
    ],
  },
  medications: {
    medications: [
      { coded: { code: "860975", display: "Metformin 500 MG", system: "rxnorm" } },
      { coded: { code: null, display: "Turmeric supplement" } },
    ],
  },
  allergies: { nkda: false, allergies: [{ coded: { code: null, display: "Penicillin" } }] },
  family_history: { family_history: [{ coded: { code: null, display: "Mother - hypertension" } }] },
  social_history: {
    tobacco_status: "former",
    pack_years: 10,
    alcohol_audit_c: 3,
    occupation: "Teacher",
    living_situation: "With family",
  },
  ros: { constitutional: "negative", cardiovascular: "positive", respiratory: "negative" },
  immunizations: { immunizations: [{ coded: { code: "140", display: "Influenza, seasonal" } }] },
  demographics: { legal_name: "Test Patient", sex: "female" },
  consents: { consent_to_treat: true, hipaa_acknowledged: true },
};

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
        .query(`DELETE FROM public.${t} WHERE organization_id = ANY($1::uuid[])`, [[ORG_A, ORG_B]])
        .catch(() => undefined);
    }
    await c
      .query(`DELETE FROM public.patient_portal_users WHERE patient_id = ANY($1::uuid[])`, [
        [PATIENT_A, PATIENT_B],
      ])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM public.patients WHERE id = ANY($1::uuid[])`, [[PATIENT_A, PATIENT_B]])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM public.users WHERE id = ANY($1::uuid[])`, [[CLIN_A, CLIN_B]])
      .catch(() => undefined);
    await c
      .query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [[CLIN_A, CLIN_B]])
      .catch(() => undefined);
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
  const { rows } = await admin.query(
    `SELECT 1 FROM pg_proc WHERE proname = 'portal_submit_intake'`,
  );
  if (rows.length === 0) {
    throw new Error(
      "function portal_submit_intake not found. Run `bash scripts/db-local-verify.sh` " +
        "(which now applies the Sprint 2 reconciliation migration) before `npm run test:db`.",
    );
  }
  sess = new Client({ connectionString: DB_URL });
  await sess.connect();

  await cleanup(admin);
  await admin.query(
    `INSERT INTO public.organizations (id, name, slug) VALUES ($1,$2,$3), ($4,$5,$6)`,
    [
      ORG_A,
      `Org A ${SUFFIX}`,
      `p3-org-a-${SUFFIX}`,
      ORG_B,
      `Org B ${SUFFIX}`,
      `p3-org-b-${SUFFIX}`,
    ],
  );
  await admin.query(
    `INSERT INTO public.patients (id, organization_id, first_name, last_name)
       VALUES ($1,$2,'A','Patient'), ($3,$4,'B','Patient')`,
    [PATIENT_A, ORG_A, PATIENT_B, ORG_B],
  );
  await admin.query(
    `INSERT INTO public.patient_portal_users (patient_id, auth_user_id, email, status)
       VALUES ($1,$2,$3,'active')`,
    [PATIENT_A, PORTAL_UID, `p3-portal-${SUFFIX}@test.local`],
  );
  await admin.query(`INSERT INTO auth.users (id) VALUES ($1), ($2)`, [CLIN_A, CLIN_B]);
  await admin.query(
    `INSERT INTO public.users (id, email, role, organization_id)
       VALUES ($1,$2,'USER',$3), ($4,$5,'USER',$6)`,
    [
      CLIN_A,
      `p3-clin-a-${SUFFIX}@test.local`,
      ORG_A,
      CLIN_B,
      `p3-clin-b-${SUFFIX}@test.local`,
      ORG_B,
    ],
  );
});

afterAll(async () => {
  if (admin) {
    await cleanup(admin).catch(() => undefined);
    await admin.end();
  }
  if (sess) await sess.end();
});

describe("portal_submit_intake — materialization", () => {
  test("materializes all seven domains with correct provenance", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    const counts = await callRpc(PORTAL_UID, sub);
    expect(counts).toMatchObject({
      already_submitted: false,
      problems: 2,
      medications: 2,
      allergies: 1,
      family_history: 1,
      social_history: 1,
      ros_responses: 3,
      immunizations: 1,
    });
    // Every materialized child row: source='patient', reconciled=false (where
    // the column exists), linked to the submission, created_by NULL.
    const { rows } = await admin.query(
      `SELECT source, reconciled, created_by FROM public.problems WHERE intake_submission_id = $1`,
      [sub],
    );
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.source).toBe("patient");
      expect(r.reconciled).toBe(false);
      expect(r.created_by).toBeNull();
    }
    // The submit lock + idempotency sentinel are set.
    const s = await admin.query(
      `SELECT submitted_at, materialized_at, status FROM public.intake_submissions WHERE id = $1`,
      [sub],
    );
    expect(s.rows[0].submitted_at).not.toBeNull();
    expect(s.rows[0].materialized_at).not.toBeNull();
    expect(s.rows[0].status).toBe("patient_entered"); // submit does NOT change status
  });

  test("flags code-less rows needs_coding, carries codes through otherwise", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    await callRpc(PORTAL_UID, sub);
    const { rows } = await admin.query(
      `SELECT code, display, needs_coding FROM public.problems WHERE intake_submission_id = $1 ORDER BY needs_coding`,
      [sub],
    );
    const coded = rows.find((r) => r.code === "E11.9");
    const free = rows.find((r) => r.display === "Chronic knee pain");
    expect(coded.needs_coding).toBe(false);
    expect(free.needs_coding).toBe(true);
    expect(free.code).toBe(""); // code NOT NULL -> empty sentinel, flagged by needs_coding
    // medications: rxnorm carried through / null flagged
    const meds = await admin.query(
      `SELECT rxnorm_code, needs_coding FROM public.medications WHERE intake_submission_id = $1`,
      [sub],
    );
    expect(meds.rows.find((m) => m.rxnorm_code === "860975").needs_coding).toBe(false);
    expect(meds.rows.find((m) => m.rxnorm_code === null).needs_coding).toBe(true);
  });

  test("NKDA materializes one nkda row and suppresses allergen rows", async () => {
    const sub = await newSubmission({
      ...RICH_RESPONSES,
      allergies: { nkda: true, allergies: [{ coded: { code: null, display: "Penicillin" } }] },
    });
    const counts = await callRpc(PORTAL_UID, sub);
    expect(counts.allergies).toBe(1);
    const { rows } = await admin.query(
      `SELECT nkda, allergen_display FROM public.allergies WHERE intake_submission_id = $1`,
      [sub],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].nkda).toBe(true);
    expect(rows[0].allergen_display).toBeNull();
  });

  test("is idempotent — a second submit does not duplicate rows", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    const first = await callRpc(PORTAL_UID, sub);
    expect(first.already_submitted).toBe(false);
    const second = await callRpc(PORTAL_UID, sub);
    expect(second.already_submitted).toBe(true);
    // Counts unchanged (no duplication).
    expect(await countChildren("problems", sub)).toBe(2);
    expect(await countChildren("medications", sub)).toBe(2);
    expect(await countChildren("ros_responses", sub)).toBe(3);
    expect(second.problems).toBe(2);
  });

  test("two concurrent patient_portal submits materialize exactly once (CRIT-1)", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    const c1 = new Client({ connectionString: DB_URL });
    const c2 = new Client({ connectionString: DB_URL });
    await c1.connect();
    await c2.connect();
    try {
      await beginAsPortal(c1, PORTAL_UID);
      await beginAsPortal(c2, PORTAL_UID);
      // c1 runs the FULL RPC (child rows inserted, materialized_at claimed) but does
      // NOT commit yet -- it holds the parent-row lock.
      const r1 = (
        await c1.query<{ r: Record<string, unknown> }>(
          `SELECT public.portal_submit_intake($1) AS r`,
          [sub],
        )
      ).rows[0]!.r;
      // c2 fires the SAME submit concurrently; SELECT ... FOR UPDATE makes it block
      // on c1's lock. After c1 commits, c2 re-reads with materialized_at set and no-ops.
      const p2 = c2.query<{ r: Record<string, unknown> }>(
        `SELECT public.portal_submit_intake($1) AS r`,
        [sub],
      );
      await c1.query("COMMIT");
      const r2 = (await p2).rows[0]!.r;
      await c2.query("COMMIT");
      // Exactly one materialization: one call did the work, the other was idempotent.
      expect([r1.already_submitted, r2.already_submitted].sort()).toEqual([false, true]);
      expect(await countChildren("problems", sub)).toBe(2); // NOT 4 (the reviewer's bug)
      expect(await countChildren("medications", sub)).toBe(2);
      expect(await countChildren("ros_responses", sub)).toBe(3);
    } finally {
      await c1.end().catch(() => undefined);
      await c2.end().catch(() => undefined);
    }
  });

  test("rolls back the whole submit on malformed clinical input (atomic)", async () => {
    const sub = await newSubmission({
      ...RICH_RESPONSES,
      ros: { cardiovascular: "maybe" }, // invalid finding -> RAISE after other domains insert
    });
    await expect(callRpc(PORTAL_UID, sub)).rejects.toThrow(/invalid ROS finding|maybe/i);
    // Nothing materialized, submission not submitted (all rolled back).
    expect(await countChildren("problems", sub)).toBe(0);
    expect(await countChildren("medications", sub)).toBe(0);
    const s = await admin.query(
      `SELECT submitted_at, materialized_at FROM public.intake_submissions WHERE id = $1`,
      [sub],
    );
    expect(s.rows[0].submitted_at).toBeNull();
    expect(s.rows[0].materialized_at).toBeNull();
  });

  test("ownership guard: caller cannot materialize another patient's submission", async () => {
    const subB = await newSubmission(RICH_RESPONSES, PATIENT_B, ORG_B);
    // PORTAL_UID maps to PATIENT_A; subB belongs to PATIENT_B.
    await expect(callRpc(PORTAL_UID, subB)).rejects.toThrow(/not belong|no portal identity/i);
    expect(await countChildren("problems", subB)).toBe(0);
  });

  test("state guard: cannot re-materialize a non-patient_entered submission", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    // Force status to provider_review WITHOUT submitting: bypass the trigger (which
    // now requires submitted_at for provider_review) so submitted_at stays NULL and
    // the RPC reaches its own state guard rather than the idempotency short-circuit.
    await admin.query(`SET session_replication_role = 'replica'`);
    await admin.query(`UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`, [
      sub,
    ]);
    await admin.query(`SET session_replication_role = 'origin'`);
    await expect(callRpc(PORTAL_UID, sub)).rejects.toThrow(/patient_entered|must be/i);
  });
});

describe("portal_submit_intake — privilege (role-escape probes)", () => {
  test("patient_portal CAN execute the RPC", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    // asRole rolls back, so this only proves EXECUTE is permitted (no throw).
    await expect(
      asRole("patient_portal", PORTAL_UID, (c) =>
        c.query(`SELECT public.portal_submit_intake($1)`, [sub]),
      ),
    ).resolves.toBeDefined();
  });

  test("authenticated (clinician) CANNOT execute the RPC — permission denied", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    await expect(
      asRole("authenticated", CLIN_A, (c) =>
        c.query(`SELECT public.portal_submit_intake($1)`, [sub]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  test("anon CANNOT execute the RPC — permission denied", async () => {
    const sub = await newSubmission(RICH_RESPONSES);
    await expect(
      asRole("anon", PORTAL_UID, (c) => c.query(`SELECT public.portal_submit_intake($1)`, [sub])),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("reconciliation state machine + attribution (provider = authenticated)", () => {
  async function submittedSubmission(): Promise<{ sub: string; p1: string; p2: string }> {
    const sub = await newSubmission(RICH_RESPONSES);
    await callRpc(PORTAL_UID, sub); // materialize + submit
    const { rows } = await admin.query<{ id: string; display: string }>(
      `SELECT id, display FROM public.problems WHERE intake_submission_id = $1 ORDER BY display`,
      [sub],
    );
    return { sub, p1: rows[0]!.id, p2: rows[1]!.id };
  }

  test("provider advances patient_entered -> provider_review -> reconciled -> signed", async () => {
    const { sub } = await submittedSubmission();
    const snapshot = await asRole("authenticated", CLIN_A, async (c) => {
      const r1 = await c.query(
        `UPDATE public.intake_submissions SET status='provider_review', reviewed_by=$2, reviewed_at=NOW() WHERE id=$1`,
        [sub, CLIN_A],
      );
      // P3-CRIT-2: every first-class row must be resolved before reconciled/signed.
      await resolveAllFirstClass(c, sub);
      const r2 = await c.query(
        `UPDATE public.intake_submissions SET status='reconciled' WHERE id=$1`,
        [sub],
      );
      const r3 = await c.query(
        `UPDATE public.intake_submissions SET status='signed' WHERE id=$1 RETURNING signed_snapshot`,
        [sub],
      );
      return { c1: r1.rowCount, c2: r2.rowCount, snap: r3.rows[0].signed_snapshot };
    });
    expect(snapshot.c1).toBe(1);
    expect(snapshot.c2).toBe(1);
    expect(snapshot.snap).toBeTruthy();
    expect(snapshot.snap.signed_at).toBeTruthy();
  });

  test("illegal skip patient_entered -> reconciled raises", async () => {
    const { sub } = await submittedSubmission();
    await expect(
      asRole("authenticated", CLIN_A, (c) =>
        c.query(`UPDATE public.intake_submissions SET status='reconciled' WHERE id=$1`, [sub]),
      ),
    ).rejects.toThrow(/illegal.*transition/i);
  });

  test("provider_review requires submitted_at (cannot review an unsubmitted intake) [CRIT-2]", async () => {
    const sub = await newSubmission(RICH_RESPONSES); // created but NOT materialized -> submitted_at NULL
    await expect(
      asRole("authenticated", CLIN_A, (c) =>
        c.query(`UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`, [sub]),
      ),
    ).rejects.toThrow(/submitted|provider_review/i);
  });

  test("sign is BLOCKED while any first-class row is unresolved (readiness gate) [CRIT-2]", async () => {
    const { sub } = await submittedSubmission();
    await expect(
      asRole("authenticated", CLIN_A, async (c) => {
        await c.query(`UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`, [
          sub,
        ]);
        // Leave the materialized rows unresolved -> the reconciled transition raises.
        await c.query(`UPDATE public.intake_submissions SET status='reconciled' WHERE id=$1`, [
          sub,
        ]);
      }),
    ).rejects.toThrow(/unresolved/i);
  });

  test("accept records provider attribution; reject soft-flags the row", async () => {
    const { sub, p1, p2 } = await submittedSubmission();
    const result = await asRole("authenticated", CLIN_A, async (c) => {
      await c.query(`UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`, [
        sub,
      ]);
      await c.query(
        `UPDATE public.problems SET reconciled=true, reconciled_by=$2, reconciled_at=NOW() WHERE id=$1`,
        [p1, CLIN_A],
      );
      await c.query(`UPDATE public.problems SET rejected=true WHERE id=$1`, [p2]);
      const { rows } = await c.query(
        `SELECT id, reconciled, reconciled_by, rejected, source FROM public.problems WHERE intake_submission_id=$1 ORDER BY id`,
        [sub],
      );
      return rows;
    });
    const accepted = result.find((r) => r.id === p1);
    const rejected = result.find((r) => r.id === p2);
    expect(accepted.reconciled).toBe(true);
    expect(accepted.reconciled_by).toBe(CLIN_A);
    expect(accepted.source).toBe("patient"); // source stays patient (Guardrail 5)
    expect(rejected.rejected).toBe(true);
    expect(rejected.reconciled).toBe(false); // rejected rows never reconciled
  });

  test("signed snapshot records ALL first-class rows WITH disposition (accepted + rejected) [CRIT-2]", async () => {
    const { sub } = await submittedSubmission();
    const snap = await asRole("authenticated", CLIN_A, async (c) => {
      await c.query(`UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`, [
        sub,
      ]);
      // Coded rows accepted, code-less rows rejected -> every row resolved.
      await resolveAllFirstClass(c, sub);
      await c.query(`UPDATE public.intake_submissions SET status='reconciled' WHERE id=$1`, [sub]);
      const { rows } = await c.query(
        `UPDATE public.intake_submissions SET status='signed' WHERE id=$1 RETURNING signed_snapshot`,
        [sub],
      );
      return rows[0].signed_snapshot;
    });
    const problems = snap.problems as Array<{ id: string; reconciled: boolean; rejected: boolean }>;
    // Disposition, not omission: BOTH the accepted (coded) and rejected (code-less)
    // problem rows are present, each carrying its disposition flags.
    expect(problems).toHaveLength(2);
    const accepted = problems.filter((p) => p.reconciled);
    const rejected = problems.filter((p) => p.rejected);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(accepted[0]!.rejected).toBe(false);
    expect(rejected[0]!.reconciled).toBe(false);
    expect((snap.ros as unknown[]).length).toBe(3); // all ROS captured
  });

  test("after sign, reconciled child rows are locked (block_mutation trigger)", async () => {
    const { sub, p1 } = await submittedSubmission();
    // Sign it (persisted so the lock is observable afterward). Every first-class
    // row must be resolved first (P3-CRIT-2 readiness gate).
    await admin.query(`UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`, [
      sub,
    ]);
    await resolveAllFirstClass(admin, sub);
    await admin.query(`UPDATE public.intake_submissions SET status='reconciled' WHERE id=$1`, [
      sub,
    ]);
    await admin.query(`UPDATE public.intake_submissions SET status='signed' WHERE id=$1`, [sub]);
    await expect(
      asRole("authenticated", CLIN_A, (c) =>
        c.query(`UPDATE public.problems SET display='tampered' WHERE id=$1`, [p1]),
      ),
    ).rejects.toThrow(/locked|signed/i);
  });

  test("cross-org: a provider cannot advance another org's submission (0 rows)", async () => {
    const { sub } = await submittedSubmission(); // ORG_A submission
    const rowCount = await asRole("authenticated", CLIN_B, async (c) => {
      const r = await c.query(
        `UPDATE public.intake_submissions SET status='provider_review' WHERE id=$1`,
        [sub],
      );
      return r.rowCount;
    });
    expect(rowCount).toBe(0); // USING excludes the foreign-org row
  });
});
