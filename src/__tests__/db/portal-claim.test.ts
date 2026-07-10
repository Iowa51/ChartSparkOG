// DB-integration tests for Sprint 2 / P3-FIXES -- the portal invite validate +
// claim SECURITY DEFINER functions (migration 20260709120000_sprint2_p3_fixes.sql).
//
// Covers (P3-HIGH-4 / P3-MED-6):
//   * validate_portal_invite: valid / claimed / expired / invalid states.
//   * claim_portal_invite: single-use atomic claim -> links patient_portal_users +
//     marks the invite claimed; account_exists guard; expired guard.
//   * Privilege (delta3 pattern): EXECUTE granted to patient_portal, DENIED to
//     authenticated + anon (permission denied).
//   * Concurrency: two real patient_portal claims on the same invite -> exactly one
//     succeeds; the loser sees 'claimed' (the invite is claimed once).
//
// Run with:  bash scripts/db-local-verify.sh  &&  npm run test:db

import { createHash, randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DB_URL = process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;

const ORG = randomUUID();
const CLIN = randomUUID(); // invited_by clinician
const SUFFIX = randomUUID().slice(0, 8);

let admin: Client;
let sess: Client;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Run fn as `role` with auth.uid()=uid, then ROLLBACK (privilege probes).
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

// Call a portal function as patient_portal in a committed txn (effects persist).
async function callAsPortal<T = Record<string, unknown>>(
  c: Client,
  sql: string,
  params: unknown[],
): Promise<T> {
  await c.query("BEGIN");
  try {
    await c.query("SET LOCAL ROLE patient_portal");
    const { rows } = await c.query<{ r: T }>(sql, params);
    await c.query("COMMIT");
    return rows[0]!.r;
  } catch (err) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw err;
  }
}

// Insert a fresh patient + invite; returns the plaintext token and ids.
async function newInvite(opts: { expiresAt?: string } = {}): Promise<{
  token: string;
  patientId: string;
  inviteId: string;
}> {
  const patientId = randomUUID();
  await admin.query(
    `INSERT INTO public.patients (id, organization_id, first_name, last_name) VALUES ($1,$2,'Portal','Patient')`,
    [patientId, ORG],
  );
  const token = randomUUID() + randomUUID();
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO public.patient_portal_invites (patient_id, org_id, token_hash, email, invited_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [
      patientId,
      ORG,
      hash(token),
      `p3claim-${randomUUID().slice(0, 8)}@test.local`,
      CLIN,
      opts.expiresAt ?? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    ],
  );
  return { token, patientId, inviteId: rows[0]!.id };
}

async function cleanup(c: Client) {
  await c
    .query(`DELETE FROM public.patient_portal_invites WHERE org_id = $1`, [ORG])
    .catch(() => undefined);
  await c
    .query(
      `DELETE FROM public.patient_portal_users WHERE patient_id IN (SELECT id FROM public.patients WHERE organization_id = $1)`,
      [ORG],
    )
    .catch(() => undefined);
  await c
    .query(`DELETE FROM public.patients WHERE organization_id = $1`, [ORG])
    .catch(() => undefined);
  await c.query(`DELETE FROM public.users WHERE id = $1`, [CLIN]).catch(() => undefined);
  await c.query(`DELETE FROM auth.users WHERE id = $1`, [CLIN]).catch(() => undefined);
  await c.query(`DELETE FROM public.organizations WHERE id = $1`, [ORG]).catch(() => undefined);
}

beforeAll(async () => {
  admin = new Client({ connectionString: DB_URL });
  await admin.connect();
  const { rows } = await admin.query(`SELECT 1 FROM pg_proc WHERE proname = 'claim_portal_invite'`);
  if (rows.length === 0) {
    throw new Error(
      "function claim_portal_invite not found. Run `bash scripts/db-local-verify.sh` (which applies " +
        "20260709120000_sprint2_p3_fixes.sql) before `npm run test:db`.",
    );
  }
  sess = new Client({ connectionString: DB_URL });
  await sess.connect();

  await cleanup(admin);
  await admin.query(`INSERT INTO public.organizations (id, name, slug) VALUES ($1,$2,$3)`, [
    ORG,
    `P3 Claim Org ${SUFFIX}`,
    `p3-claim-org-${SUFFIX}`,
  ]);
  await admin.query(`INSERT INTO auth.users (id) VALUES ($1)`, [CLIN]);
  await admin.query(
    `INSERT INTO public.users (id, email, role, organization_id) VALUES ($1,$2,'USER',$3)`,
    [CLIN, `p3-claim-clin-${SUFFIX}@test.local`, ORG],
  );
});

afterAll(async () => {
  if (admin) {
    await cleanup(admin).catch(() => undefined);
    await admin.end();
  }
  if (sess) await sess.end();
});

describe("validate_portal_invite", () => {
  test("valid invite returns status=valid + fields", async () => {
    const inv = await newInvite();
    const { rows } = await admin.query(`SELECT public.validate_portal_invite($1) AS r`, [
      hash(inv.token),
    ]);
    const r = rows[0].r;
    expect(r.status).toBe("valid");
    expect(r.invite.patientId).toBe(inv.patientId);
    expect(r.invite.orgId).toBe(ORG);
  });

  test("unknown token returns status=invalid", async () => {
    const { rows } = await admin.query(`SELECT public.validate_portal_invite($1) AS r`, [
      hash("nope"),
    ]);
    expect(rows[0].r.status).toBe("invalid");
  });

  test("expired invite returns status=expired", async () => {
    const inv = await newInvite({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const { rows } = await admin.query(`SELECT public.validate_portal_invite($1) AS r`, [
      hash(inv.token),
    ]);
    expect(rows[0].r.status).toBe("expired");
  });
});

describe("claim_portal_invite", () => {
  test("claims an invite: links portal user + marks invite claimed (single-use)", async () => {
    const inv = await newInvite();
    const authId = randomUUID();
    const r = await callAsPortal(admin, `SELECT public.claim_portal_invite($1,$2,$3) AS r`, [
      hash(inv.token),
      authId,
      `claim-${SUFFIX}@test.local`,
    ]);
    expect(r.ok).toBe(true);

    const ppu = await admin.query(
      `SELECT auth_user_id, status FROM public.patient_portal_users WHERE patient_id = $1`,
      [inv.patientId],
    );
    expect(ppu.rows[0].auth_user_id).toBe(authId);
    expect(ppu.rows[0].status).toBe("active");

    const invite = await admin.query(
      `SELECT claimed_at, claimed_by FROM public.patient_portal_invites WHERE id = $1`,
      [inv.inviteId],
    );
    expect(invite.rows[0].claimed_at).not.toBeNull();
    expect(invite.rows[0].claimed_by).not.toBeNull();

    // Second claim on the same (now claimed) invite -> rejected.
    const second = await callAsPortal(admin, `SELECT public.claim_portal_invite($1,$2,$3) AS r`, [
      hash(inv.token),
      randomUUID(),
      `claim2-${SUFFIX}@test.local`,
    ]);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("claimed");
    // No duplicate portal user created.
    const count = await admin.query(
      `SELECT count(*)::int AS n FROM public.patient_portal_users WHERE patient_id = $1`,
      [inv.patientId],
    );
    expect(count.rows[0].n).toBe(1);
  });

  test("expired invite cannot be claimed", async () => {
    const inv = await newInvite({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const r = await callAsPortal(admin, `SELECT public.claim_portal_invite($1,$2,$3) AS r`, [
      hash(inv.token),
      randomUUID(),
      `exp-${SUFFIX}@test.local`,
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("expired");
  });

  test("account_exists when the patient already has a portal user", async () => {
    const inv = await newInvite();
    await admin.query(
      `INSERT INTO public.patient_portal_users (patient_id, auth_user_id, email, status)
         VALUES ($1,$2,$3,'active')`,
      [inv.patientId, randomUUID(), `existing-${SUFFIX}@test.local`],
    );
    const r = await callAsPortal(admin, `SELECT public.claim_portal_invite($1,$2,$3) AS r`, [
      hash(inv.token),
      randomUUID(),
      `dup-${SUFFIX}@test.local`,
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("account_exists");
    // The invite must NOT be marked claimed on a rejected claim.
    const invite = await admin.query(
      `SELECT claimed_at FROM public.patient_portal_invites WHERE id = $1`,
      [inv.inviteId],
    );
    expect(invite.rows[0].claimed_at).toBeNull();
  });

  test("two concurrent claims on one invite -> exactly one succeeds (MED-6)", async () => {
    const inv = await newInvite();
    const c1 = new Client({ connectionString: DB_URL });
    const c2 = new Client({ connectionString: DB_URL });
    await c1.connect();
    await c2.connect();
    try {
      await c1.query("BEGIN");
      await c1.query("SET LOCAL ROLE patient_portal");
      await c2.query("BEGIN");
      await c2.query("SET LOCAL ROLE patient_portal");
      // c1 runs the full claim (links user, marks invite) but does NOT commit -- it
      // holds the invite-row lock (FOR UPDATE).
      const r1 = (
        await c1.query<{ r: { ok: boolean; reason?: string } }>(
          `SELECT public.claim_portal_invite($1,$2,$3) AS r`,
          [hash(inv.token), randomUUID(), `c1-${SUFFIX}@test.local`],
        )
      ).rows[0]!.r;
      // c2 claims the SAME invite; it blocks on c1's lock, then sees claimed_at.
      const p2 = c2.query<{ r: { ok: boolean; reason?: string } }>(
        `SELECT public.claim_portal_invite($1,$2,$3) AS r`,
        [hash(inv.token), randomUUID(), `c2-${SUFFIX}@test.local`],
      );
      await c1.query("COMMIT");
      const r2 = (await p2).rows[0]!.r;
      await c2.query("COMMIT");
      expect([r1.ok, r2.ok].sort()).toEqual([false, true]); // exactly one succeeded
      const count = await admin.query(
        `SELECT count(*)::int AS n FROM public.patient_portal_users WHERE patient_id = $1`,
        [inv.patientId],
      );
      expect(count.rows[0].n).toBe(1); // one portal user, not two
    } finally {
      await c1.end().catch(() => undefined);
      await c2.end().catch(() => undefined);
    }
  });
});

describe("claim/validate privilege (role-escape probes)", () => {
  test("patient_portal CAN execute claim_portal_invite", async () => {
    const inv = await newInvite();
    await expect(
      asRole("patient_portal", randomUUID(), (c) =>
        c.query(`SELECT public.claim_portal_invite($1,$2,$3)`, [
          hash(inv.token),
          randomUUID(),
          `probe-${SUFFIX}@test.local`,
        ]),
      ),
    ).resolves.toBeDefined();
  });

  test("authenticated CANNOT execute claim_portal_invite -- permission denied", async () => {
    const inv = await newInvite();
    await expect(
      asRole("authenticated", CLIN, (c) =>
        c.query(`SELECT public.claim_portal_invite($1,$2,$3)`, [
          hash(inv.token),
          randomUUID(),
          `probe2-${SUFFIX}@test.local`,
        ]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  test("anon CANNOT execute validate_portal_invite -- permission denied", async () => {
    const inv = await newInvite();
    await expect(
      asRole("anon", randomUUID(), (c) =>
        c.query(`SELECT public.validate_portal_invite($1)`, [hash(inv.token)]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});
