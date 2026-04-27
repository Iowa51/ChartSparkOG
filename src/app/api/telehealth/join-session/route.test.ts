// P0-D: Verify the cookie-bound telehealth join-session resolution path.
// Failure modes covered: missing cookie, both cookies present (ambiguous),
// expired/used ref (single-use semantics), and the happy path.

import { describe, it, expect, vi, beforeEach } from 'vitest';

type CookieEntry = { name: string; value: string };

const cookieState = vi.hoisted(() => ({
    entries: [] as CookieEntry[],
}));

const resolveResult = vi.hoisted(() => ({
    next: null as
        | null
        | {
              appointmentId: string;
              organizationId: string;
              participantRole: 'provider' | 'patient';
              roomUrl: string;
              meetingToken?: string;
          },
}));

vi.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) => {
            const entry = cookieState.entries.find((c) => c.name === name);
            return entry ? { name: entry.name, value: entry.value } : undefined;
        },
    }),
}));

vi.mock('@/lib/security/telehealth-session-tokens', () => ({
    resolveTelehealthJoinSession: vi.fn(async () => resolveResult.next),
}));

vi.mock('@/lib/security/audit-log', () => ({
    logAuditEvent: vi.fn(async () => {}),
}));

vi.mock('@/lib/utils/get-client-ip', () => ({
    getClientIP: () => '127.0.0.1',
}));

vi.mock('@/lib/logging/safe-logger', () => ({
    logError: vi.fn(),
    sanitizeError: (e: unknown) => String(e),
}));

import { POST } from '@/app/api/telehealth/join-session/route';
import { logAuditEvent } from '@/lib/security/audit-log';
import { resolveTelehealthJoinSession } from '@/lib/security/telehealth-session-tokens';

function makeRequest() {
    return {
        method: 'POST',
        url: 'http://localhost:3000/api/telehealth/join-session',
        headers: new Headers({ 'user-agent': 'vitest', 'content-type': 'application/json' }),
        json: async () => ({}),
    } as unknown as Parameters<typeof POST>[0];
}

const VALID_REF = 'a'.repeat(64) + '.2099-01-01T00:00:00.000Z.' + 'b'.repeat(64);

beforeEach(() => {
    cookieState.entries = [];
    resolveResult.next = null;
    vi.clearAllMocks();
});

describe('POST /api/telehealth/join-session', () => {
    it('happy path: provider cookie resolves to credentials and clears cookie', async () => {
        cookieState.entries = [
            { name: 'chartspark_th_session_provider', value: VALID_REF },
        ];
        resolveResult.next = {
            appointmentId: 'appt-1',
            organizationId: 'org-x',
            participantRole: 'provider',
            roomUrl: 'https://daily.co/room-abc',
            meetingToken: 'tk_provider_xyz',
        };

        const res = await POST(makeRequest());

        expect(res.status).toBe(200);
        const json = (await res.json()) as Record<string, unknown>;
        expect(json.roomUrl).toBe('https://daily.co/room-abc');
        expect(json.token).toBe('tk_provider_xyz');
        expect(json.appointmentId).toBe('appt-1');
        expect(json.participantRole).toBe('provider');

        // Single-use semantics: cookie cleared on success.
        const setCookie = res.headers.get('set-cookie') || '';
        expect(setCookie).toMatch(/chartspark_th_session_provider=;/);
        expect(setCookie).toMatch(/Max-Age=0/i);

        // Audit details must NOT carry credential material.
        const audit = (logAuditEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls;
        const flat = JSON.stringify(audit);
        expect(flat).not.toContain('https://daily.co/room-abc');
        expect(flat).not.toContain('tk_provider_xyz');
        expect(flat).not.toContain(VALID_REF);
        expect(flat).toContain('telehealth_session_resolved');
    });

    it('returns 410 when the ref is expired or already used (resolve returns null)', async () => {
        cookieState.entries = [
            { name: 'chartspark_th_session_provider', value: VALID_REF },
        ];
        resolveResult.next = null;

        const res = await POST(makeRequest());
        expect(res.status).toBe(410);

        const json = (await res.json()) as Record<string, unknown>;
        expect(json.roomUrl).toBeUndefined();
        expect(json.token).toBeUndefined();

        // Stale cookie cleared even on failure.
        const setCookie = res.headers.get('set-cookie') || '';
        expect(setCookie).toMatch(/chartspark_th_session_provider=;/);
    });

    it('returns 410 when the same ref is resolved twice (already-used semantics)', async () => {
        cookieState.entries = [
            { name: 'chartspark_th_session_patient', value: VALID_REF },
        ];
        // First resolve succeeds.
        resolveResult.next = {
            appointmentId: 'appt-1',
            organizationId: 'org-x',
            participantRole: 'patient',
            roomUrl: 'https://daily.co/r',
            meetingToken: 'tk',
        };
        const first = await POST(makeRequest());
        expect(first.status).toBe(200);

        // Second resolve returns null (atomic UPDATE found no row with used=false).
        resolveResult.next = null;
        const second = await POST(makeRequest());
        expect(second.status).toBe(410);
        const json = (await second.json()) as Record<string, unknown>;
        expect(json.roomUrl).toBeUndefined();
    });

    it('returns 400 when no session cookie is present', async () => {
        cookieState.entries = [];

        const res = await POST(makeRequest());
        expect(res.status).toBe(400);
        const json = (await res.json()) as Record<string, unknown>;
        expect(json.error).toMatch(/session/i);
        // resolve must not have been called.
        expect((resolveTelehealthJoinSession as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
    });

    it('returns 400 when both provider and patient cookies are present (ambiguous)', async () => {
        cookieState.entries = [
            { name: 'chartspark_th_session_provider', value: VALID_REF },
            { name: 'chartspark_th_session_patient', value: VALID_REF },
        ];

        const res = await POST(makeRequest());
        expect(res.status).toBe(400);
        const json = (await res.json()) as Record<string, unknown>;
        expect(json.error).toMatch(/ambiguous/i);
        // resolve must not have been called — neither cookie wins.
        expect((resolveTelehealthJoinSession as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
    });

    it('rejects a cookie value too short to be a real ref', async () => {
        cookieState.entries = [
            { name: 'chartspark_th_session_provider', value: 'short' },
        ];

        const res = await POST(makeRequest());
        // Short value fails the length check before resolveTelehealthJoinSession runs.
        expect(res.status).toBe(400);
    });
});
