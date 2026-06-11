// PRD-02 P0: POST/GET /api/portal-invites.
// Verifies: happy path stores only the SHA-256 token hash and returns a
// one-time URL; no-email and existing-account conflicts; wrong-org gets
// the same 404 as not-found (no existence leak); re-invite expires prior
// unclaimed invites; GET status resolution; no email/token in audit logs.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

interface FakePatient {
  id: string;
  email: string | null;
  organization_id: string;
}

interface FakePortalUser {
  id: string;
  patient_id: string;
  status: string;
}

interface FakeInvite {
  id: string;
  patient_id: string;
  org_id: string;
  token_hash: string;
  email: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  claimed_at: string | null;
}

// Hoisted state shared with vi.mock factories.
const state = vi.hoisted(() => ({
  currentUser: {
    id: "user-a",
    email: "user-a@test",
    role: "USER",
    organizationId: "org-x" as string | null,
  },
  patients: [] as FakePatient[],
  portalUsers: [] as FakePortalUser[],
  invites: [] as FakeInvite[],
  auditCalls: [] as Array<Record<string, unknown>>,
  inviteSeq: 0,
}));

vi.mock("@/lib/auth/api-auth", () => ({
  withAuth: (handler: (ctx: unknown) => Promise<unknown>) => {
    return async (request: unknown) => handler({ user: state.currentUser, request });
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeSupabaseStub()),
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: vi.fn(async (entry: Record<string, unknown>) => {
    state.auditCalls.push(entry);
  }),
}));

vi.mock("@/lib/utils/get-client-ip", () => ({
  getRequestMetadata: () => ({ ipAddress: "127.0.0.1", userAgent: "vitest" }),
}));

vi.mock("@/lib/logging/safe-logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  sanitizeError: (e: unknown) => String(e),
}));

// ── Supabase query stub ──────────────────────────────────────────────────
// Generic filter-chain builder over the in-memory state arrays. Supports
// the exact chains the route uses: select/eq/maybeSingle, select/eq/order/
// limit (thenable), insert/select/single, update/eq/is/gt (thenable).
function tableBuilder(table: string) {
  const rows = (): Record<string, unknown>[] => {
    if (table === "patients") return state.patients as unknown as Record<string, unknown>[];
    if (table === "patient_portal_users")
      return state.portalUsers as unknown as Record<string, unknown>[];
    if (table === "patient_portal_invites")
      return state.invites as unknown as Record<string, unknown>[];
    throw new Error(`Unexpected table ${table}`);
  };

  let mode: "select" | "update" | "insert" = "select";
  let patch: Record<string, unknown> = {};
  let inserted: Record<string, unknown> | null = null;
  let descendingBy: string | null = null;
  let limitN: number | null = null;
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];

  const matches = () => rows().filter((r) => filters.every((f) => f(r)));

  const resolveRows = (): Record<string, unknown>[] => {
    if (mode === "update") {
      const hit = matches();
      hit.forEach((r) => Object.assign(r, patch));
      return hit;
    }
    if (mode === "insert") {
      const row: Record<string, unknown> = {
        id: `invite-${++state.inviteSeq}`,
        claimed_at: null,
        ...inserted,
      };
      if (row.invited_at === undefined) {
        row.invited_at = new Date().toISOString();
      }
      rows().push(row);
      return [row];
    }
    let result = matches();
    if (descendingBy) {
      const key = descendingBy;
      result = [...result].sort((a, b) => String(b[key]).localeCompare(String(a[key])));
    }
    if (limitN !== null) result = result.slice(0, limitN);
    return result;
  };

  const builder = {
    select: () => builder,
    insert: (row: Record<string, unknown>) => {
      mode = "insert";
      inserted = row;
      return builder;
    },
    update: (p: Record<string, unknown>) => {
      mode = "update";
      patch = p;
      return builder;
    },
    eq: (col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return builder;
    },
    is: (col: string, val: unknown) => {
      filters.push((r) => (val === null ? r[col] == null : r[col] === val));
      return builder;
    },
    gt: (col: string, val: string) => {
      // ISO timestamps compare correctly as strings.
      filters.push((r) => String(r[col]) > val);
      return builder;
    },
    order: (col: string) => {
      descendingBy = col;
      return builder;
    },
    limit: (n: number) => {
      limitN = n;
      return builder;
    },
    maybeSingle: async () => {
      const result = resolveRows();
      return { data: result[0] ?? null, error: null };
    },
    single: async () => {
      const result = resolveRows();
      return result[0]
        ? { data: result[0], error: null }
        : { data: null, error: { message: "no rows" } };
    },
    then: (resolve: (v: unknown) => void) => {
      resolve({ data: resolveRows(), error: null });
    },
  };
  return builder;
}

function makeSupabaseStub() {
  return { from: (table: string) => tableBuilder(table) };
}

// Route imports must follow vi.mock calls.
import { GET, POST } from "@/app/api/portal-invites/route";

function makeRequest(query: Record<string, string> = {}, method = "GET", body?: unknown) {
  const params = new URLSearchParams(query);
  return {
    method,
    url: "http://localhost:3000/api/portal-invites?" + params.toString(),
    nextUrl: { searchParams: params },
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body ?? {},
  };
}

const callPost = (body?: unknown) =>
  (POST as unknown as (r: unknown) => Promise<Response>)(makeRequest({}, "POST", body));
const callGet = (query: Record<string, string>) =>
  (GET as unknown as (r: unknown) => Promise<Response>)(makeRequest(query));

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG_PATIENT_ID = "22222222-2222-4222-8222-222222222222";
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  state.currentUser = { id: "user-a", email: "user-a@test", role: "USER", organizationId: "org-x" };
  state.patients = [
    { id: PATIENT_ID, email: "pt@example.com", organization_id: "org-x" },
    { id: OTHER_ORG_PATIENT_ID, email: "other@example.com", organization_id: "org-y" },
  ];
  state.portalUsers = [];
  state.invites = [];
  state.auditCalls = [];
  state.inviteSeq = 0;
  vi.clearAllMocks();
});

describe("POST /api/portal-invites", () => {
  it("201 happy path: stores only the SHA-256 hash, returns one-time URL with 7-day expiry", async () => {
    const res = await callPost({ patient_id: PATIENT_ID });

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      invite_id: string;
      invite_url: string;
      expires_at: string;
    };
    expect(json.invite_url).toMatch(
      /^https:\/\/portal\.chartspark\.io\/invite\/[A-Za-z0-9_-]{40,}$/,
    );

    // Stored row holds the hash of the returned token — never the plaintext.
    const token = json.invite_url.split("/invite/")[1];
    expect(state.invites).toHaveLength(1);
    const stored = state.invites[0];
    expect(stored.token_hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(stored.token_hash).not.toBe(token);
    expect(stored.email).toBe("pt@example.com");
    expect(stored.invited_by).toBe("user-a");
    expect(stored.org_id).toBe("org-x");

    // ~7-day expiry.
    const ttlMs = new Date(json.expires_at).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);

    // Audited, with no email and no token anywhere in the entry details.
    const audit = state.auditCalls.find((c) => c.resourceType === "portal_invite");
    expect(audit).toBeDefined();
    expect(audit?.eventType).toBe("USER_INVITATION_CREATED");
    const detailsJson = JSON.stringify(audit?.details);
    expect(detailsJson).not.toContain("pt@example.com");
    expect(detailsJson).not.toContain(token);
  });

  it("409 when the patient has no email on file; no invite row created", async () => {
    state.patients[0].email = null;

    const res = await callPost({ patient_id: PATIENT_ID });

    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/no email/i);
    expect(state.invites).toHaveLength(0);
  });

  it("404 for a patient in another org — same response as not-found (no existence leak)", async () => {
    const resOtherOrg = await callPost({ patient_id: OTHER_ORG_PATIENT_ID });
    const resMissing = await callPost({ patient_id: "33333333-3333-4333-8333-333333333333" });

    expect(resOtherOrg.status).toBe(404);
    expect(resMissing.status).toBe(404);
    expect(await resOtherOrg.json()).toEqual(await resMissing.json());
    expect(state.invites).toHaveLength(0);
  });

  it("re-invite expires the prior unclaimed invite and issues a fresh one", async () => {
    state.invites.push({
      id: "invite-old",
      patient_id: PATIENT_ID,
      org_id: "org-x",
      token_hash: "old-hash",
      email: "pt@example.com",
      invited_by: "user-a",
      invited_at: PAST,
      expires_at: FUTURE,
      claimed_at: null,
    });

    const res = await callPost({ patient_id: PATIENT_ID });

    expect(res.status).toBe(201);
    expect(state.invites).toHaveLength(2);
    const old = state.invites.find((i) => i.id === "invite-old");
    // Prior link is dead: expires_at pulled back to ~now.
    expect(new Date(old!.expires_at).getTime()).toBeLessThanOrEqual(Date.now());
    const fresh = state.invites.find((i) => i.id !== "invite-old");
    expect(new Date(fresh!.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("does not touch already-claimed invites on re-invite", async () => {
    state.invites.push({
      id: "invite-claimed",
      patient_id: PATIENT_ID,
      org_id: "org-x",
      token_hash: "claimed-hash",
      email: "pt@example.com",
      invited_by: "user-a",
      invited_at: PAST,
      expires_at: FUTURE,
      claimed_at: PAST,
    });

    await callPost({ patient_id: PATIENT_ID });

    const claimed = state.invites.find((i) => i.id === "invite-claimed");
    expect(claimed!.expires_at).toBe(FUTURE);
  });

  it("409 when the patient already has a portal account", async () => {
    state.portalUsers.push({ id: "pu-1", patient_id: PATIENT_ID, status: "active" });

    const res = await callPost({ patient_id: PATIENT_ID });

    expect(res.status).toBe(409);
    expect(state.invites).toHaveLength(0);
  });

  it("400 on invalid body", async () => {
    const res = await callPost({ patient_id: "not-a-uuid" });
    expect(res.status).toBe(400);

    const resExtra = await callPost({ patient_id: PATIENT_ID, extra: "field" });
    expect(resExtra.status).toBe(400);
  });
});

describe("GET /api/portal-invites", () => {
  it("not_invited when there are no invites and no account", async () => {
    const res = await callGet({ patient_id: PATIENT_ID });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { portal_status: string; invite: unknown };
    expect(json.portal_status).toBe("not_invited");
    expect(json.invite).toBeNull();
  });

  it("pending for an unclaimed, unexpired invite", async () => {
    state.invites.push({
      id: "invite-1",
      patient_id: PATIENT_ID,
      org_id: "org-x",
      token_hash: "h",
      email: "pt@example.com",
      invited_by: "user-a",
      invited_at: PAST,
      expires_at: FUTURE,
      claimed_at: null,
    });

    const res = await callGet({ patient_id: PATIENT_ID });
    const json = (await res.json()) as { portal_status: string; invite: { expires_at: string } };
    expect(json.portal_status).toBe("pending");
    expect(json.invite.expires_at).toBe(FUTURE);
  });

  it("expired for an unclaimed, past-expiry invite", async () => {
    state.invites.push({
      id: "invite-1",
      patient_id: PATIENT_ID,
      org_id: "org-x",
      token_hash: "h",
      email: "pt@example.com",
      invited_by: "user-a",
      invited_at: PAST,
      expires_at: PAST,
      claimed_at: null,
    });

    const res = await callGet({ patient_id: PATIENT_ID });
    const json = (await res.json()) as { portal_status: string };
    expect(json.portal_status).toBe("expired");
  });

  it("active when a portal account exists", async () => {
    state.portalUsers.push({ id: "pu-1", patient_id: PATIENT_ID, status: "active" });

    const res = await callGet({ patient_id: PATIENT_ID });
    const json = (await res.json()) as { portal_status: string; account_status: string };
    expect(json.portal_status).toBe("active");
    expect(json.account_status).toBe("active");
  });

  it("status reads the LATEST invite when several exist", async () => {
    state.invites.push(
      {
        id: "invite-old",
        patient_id: PATIENT_ID,
        org_id: "org-x",
        token_hash: "h1",
        email: "pt@example.com",
        invited_by: "user-a",
        invited_at: "2026-01-01T00:00:00.000Z",
        expires_at: PAST,
        claimed_at: null,
      },
      {
        id: "invite-new",
        patient_id: PATIENT_ID,
        org_id: "org-x",
        token_hash: "h2",
        email: "pt@example.com",
        invited_by: "user-a",
        invited_at: "2026-06-01T00:00:00.000Z",
        expires_at: FUTURE,
        claimed_at: null,
      },
    );

    const res = await callGet({ patient_id: PATIENT_ID });
    const json = (await res.json()) as { portal_status: string };
    expect(json.portal_status).toBe("pending");
  });

  it("404 for a patient in another org", async () => {
    const res = await callGet({ patient_id: OTHER_ORG_PATIENT_ID });
    expect(res.status).toBe(404);
  });

  it("400 on a malformed patient_id", async () => {
    const res = await callGet({ patient_id: "nope" });
    expect(res.status).toBe(400);
  });
});
