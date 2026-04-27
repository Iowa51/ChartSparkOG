// P0-C: Verify role-conditional access to GET /api/notes.
// AUDITOR must be able to load the review queue but cannot bypass the
// status allowlist via query param, cannot see another org's notes, and
// cannot POST.

import { describe, it, expect, vi, beforeEach } from "vitest";

type Role = "USER" | "AUDITOR" | "ADMIN" | "SUPER_ADMIN";

interface MockUser {
    id: string;
    email: string;
    role: Role;
    organizationId: string | null;
}

interface FakeNote {
    id: string;
    organization_id: string;
    provider_id: string;
    patient_id: string;
    status: string;
    content?: string;
}

// Hoisted state shared with vi.mock factories.
const state = vi.hoisted(() => ({
    currentUser: {
        id: "user-a",
        email: "user-a@test",
        role: "USER" as Role,
        organizationId: "org-x",
    } as MockUser,
    notes: [] as FakeNote[],
    auditCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/auth/api-auth", () => ({
    withAuth: (
        handler: (ctx: unknown) => Promise<unknown>,
        opts?: { requiredRole?: string[] },
    ) => {
        return async (request: unknown) => {
            const { NextResponse } = await import("next/server");
            if (opts?.requiredRole && !opts.requiredRole.includes(state.currentUser.role)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            return handler({
                user: state.currentUser,
                request,
            });
        };
    },
    canAccessPatient: vi.fn(async () => true),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => makeSupabaseStub()),
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: vi.fn(async (entry: Record<string, unknown>) => {
        state.auditCalls.push(entry);
    }),
    logAuditEventAsync: vi.fn((entry: Record<string, unknown>) => {
        state.auditCalls.push(entry);
    }),
    logPHIAccess: vi.fn(async () => {}),
}));

vi.mock("@/lib/utils/get-client-ip", () => ({
    getRequestMetadata: () => ({ ipAddress: "127.0.0.1", userAgent: "vitest" }),
}));

vi.mock("@/lib/logging/safe-logger", () => ({
    logError: vi.fn(),
    logWarn: vi.fn(),
    logInfo: vi.fn(),
    sanitizeError: (e: unknown) => String(e),
}));

// ── Supabase query stub ──────────────────────────────────────────────────
// Captures eq/in filters and resolves against state.notes.
function makeSupabaseStub() {
    function buildBuilder(params: { headOnly: boolean }) {
        const filters: { eq: Record<string, unknown>; in: Record<string, string[]> } = {
            eq: {},
            in: {},
        };
        const apply = () =>
            state.notes.filter((n) => {
                for (const [k, v] of Object.entries(filters.eq)) {
                    if ((n as unknown as Record<string, unknown>)[k] !== v) return false;
                }
                for (const [k, vs] of Object.entries(filters.in)) {
                    const val = (n as unknown as Record<string, unknown>)[k] as string;
                    if (!vs.includes(val)) return false;
                }
                return true;
            });

        const builder: Record<string, unknown> = {
            eq: (col: string, val: unknown) => {
                filters.eq[col] = val;
                return builder;
            },
            in: (col: string, vals: string[]) => {
                filters.in[col] = vals;
                return builder;
            },
            order: () => builder,
            range: () => builder,
            // Awaiting the builder resolves to the filtered result set.
            then: (resolve: (v: unknown) => void) => {
                const filtered = apply();
                if (params.headOnly) {
                    resolve({ count: filtered.length, error: null });
                } else {
                    resolve({ data: filtered, error: null });
                }
            },
        };
        return builder;
    }
    return {
        from: (_table: string) => ({
            select: (
                _cols: string,
                opts?: { count?: string; head?: boolean },
            ) => buildBuilder({ headOnly: !!opts?.head }),
        }),
    };
}

// Route imports must follow vi.mock calls.
import { GET, POST } from "@/app/api/notes/route";

function makeRequest(query: Record<string, string> = {}, method = "GET", body?: unknown) {
    const params = new URLSearchParams(query);
    return {
        method,
        url: "http://localhost:3000/api/notes?" + params.toString(),
        nextUrl: { searchParams: params },
        headers: new Headers({
            "x-real-ip": "127.0.0.1",
            "user-agent": "vitest",
            "content-type": "application/json",
        }),
        json: async () => body ?? {},
    };
}

beforeEach(() => {
    state.currentUser = {
        id: "user-a",
        email: "user-a@test",
        role: "USER",
        organizationId: "org-x",
    };
    state.notes = [];
    state.auditCalls = [];
    vi.clearAllMocks();
});

describe("GET /api/notes — role-conditional access", () => {
    it("AUDITOR can load the queue and only sees pending_review/approved/needs_revision", async () => {
        state.currentUser.role = "AUDITOR";
        state.notes = [
            { id: "n1", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "draft" },
            { id: "n2", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "pending_review" },
            { id: "n3", organization_id: "org-x", provider_id: "user-b", patient_id: "p2", status: "approved" },
            { id: "n4", organization_id: "org-x", provider_id: "user-b", patient_id: "p2", status: "needs_revision" },
            { id: "n5", organization_id: "org-x", provider_id: "user-a", patient_id: "p3", status: "signed" },
        ];

        const res = await (GET as unknown as (r: unknown) => Promise<Response>)(makeRequest());

        expect(res.status).toBe(200);
        const json = (await res.json()) as { notes: FakeNote[] };
        const ids = json.notes.map((n) => n.id).sort();
        expect(ids).toEqual(["n2", "n3", "n4"]);

        const auditorAudit = state.auditCalls.find(
            (c) => (c.details as Record<string, unknown>)?.action === "AUDITOR_QUEUE_VIEWED",
        );
        expect(auditorAudit).toBeDefined();
        // No PHI / patient ids in audit details
        const details = auditorAudit?.details as Record<string, unknown>;
        expect(JSON.stringify(details)).not.toContain("p1");
        expect(JSON.stringify(details)).not.toContain("n2");
    });

    it("AUDITOR cannot bypass the status allowlist via ?status=draft", async () => {
        state.currentUser.role = "AUDITOR";
        state.notes = [
            { id: "d1", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "draft" },
            { id: "d2", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "draft" },
            { id: "p1", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "pending_review" },
        ];

        const res = await (GET as unknown as (r: unknown) => Promise<Response>)(
            makeRequest({ status: "draft" }),
        );

        expect(res.status).toBe(200);
        const json = (await res.json()) as { notes: FakeNote[] };
        expect(json.notes).toEqual([]);
    });

    it("AUDITOR cannot see notes from another organization", async () => {
        state.currentUser.role = "AUDITOR";
        state.currentUser.organizationId = "org-x";
        state.notes = [
            { id: "x1", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "approved" },
            { id: "y1", organization_id: "org-y", provider_id: "other", patient_id: "p9", status: "approved" },
        ];

        const res = await (GET as unknown as (r: unknown) => Promise<Response>)(makeRequest());
        const json = (await res.json()) as { notes: FakeNote[] };
        expect(json.notes.map((n) => n.id)).toEqual(["x1"]);
    });

    it("USER still sees only their own notes (regression check)", async () => {
        state.currentUser.role = "USER";
        state.currentUser.id = "user-a";
        state.notes = [
            { id: "a1", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "draft" },
            { id: "a2", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "pending_review" },
            { id: "b1", organization_id: "org-x", provider_id: "user-b", patient_id: "p2", status: "draft" },
        ];

        const res = await (GET as unknown as (r: unknown) => Promise<Response>)(makeRequest());
        const json = (await res.json()) as { notes: FakeNote[] };
        expect(json.notes.map((n) => n.id).sort()).toEqual(["a1", "a2"]);
    });

    it("ADMIN sees all org notes regardless of status or provider (regression check)", async () => {
        state.currentUser.role = "ADMIN";
        state.notes = [
            { id: "a1", organization_id: "org-x", provider_id: "user-a", patient_id: "p1", status: "draft" },
            { id: "b1", organization_id: "org-x", provider_id: "user-b", patient_id: "p2", status: "approved" },
            { id: "c1", organization_id: "org-x", provider_id: "user-c", patient_id: "p3", status: "signed" },
            { id: "z1", organization_id: "org-y", provider_id: "user-z", patient_id: "p9", status: "draft" },
        ];

        const res = await (GET as unknown as (r: unknown) => Promise<Response>)(makeRequest());
        const json = (await res.json()) as { notes: FakeNote[] };
        expect(json.notes.map((n) => n.id).sort()).toEqual(["a1", "b1", "c1"]);
    });
});

describe("POST /api/notes — AUDITOR write access blocked", () => {
    it("returns 403 when an AUDITOR attempts to POST", async () => {
        state.currentUser.role = "AUDITOR";

        const res = await (POST as unknown as (r: unknown) => Promise<Response>)(
            makeRequest({}, "POST", {
                patient_id: "00000000-0000-0000-0000-000000000001",
                content: "x",
            }),
        );

        expect(res.status).toBe(403);
    });
});
