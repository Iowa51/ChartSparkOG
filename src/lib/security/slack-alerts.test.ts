// Build 5: tests for the Slack alert dispatcher.
//   - Fingerprint determinism + specificity
//   - Dedup gate hit / miss / Redis-error fail-open
//   - Webhook absence is a no-op
//   - Payload sanitization (no PHI fields leak)
//   - dispatchAlert never throws to the caller

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const redisState = vi.hoisted(() => ({
    setReturn: 'OK' as 'OK' | null,
    throwOnSet: false,
    setCalls: [] as Array<{ key: string; value: string; opts: unknown }>,
}));

vi.mock('@upstash/redis', () => ({
    Redis: class {
        constructor(_cfg: unknown) {}
        async set(key: string, value: string, opts: unknown) {
            redisState.setCalls.push({ key, value, opts });
            if (redisState.throwOnSet) throw new Error('upstash exploded');
            return redisState.setReturn;
        }
    },
}));

vi.mock('@/lib/logging/safe-logger', () => ({
    logWarn: vi.fn(),
    logError: vi.fn(),
    safeLog: vi.fn(),
    sanitizeError: (e: unknown) => String(e),
}));

import {
    dispatchAlert,
    fingerprint,
    formatSlackMessage,
    _shouldDispatch,
    type AlertEvent,
} from './slack-alerts';

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
    redisState.setReturn = 'OK';
    redisState.throwOnSet = false;
    redisState.setCalls = [];
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
    vi.stubEnv('SLACK_PILOT_ALERTS_WEBHOOK', 'https://hooks.slack.com/services/T/B/X');
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
});

describe('fingerprint', () => {
    it('returns the same fingerprint for the same event shape', () => {
        const a: AlertEvent = {
            kind: '5xx',
            route: '/api/notes',
            status: 500,
            errorCode: 'PGRST116',
        };
        const b: AlertEvent = {
            kind: '5xx',
            route: '/api/notes',
            status: 500,
            errorCode: 'PGRST116',
        };
        expect(fingerprint(a)).toBe(fingerprint(b));
    });

    it('returns different fingerprints when route, status, or code differ', () => {
        const e: AlertEvent = { kind: '5xx', route: '/api/x', status: 500, errorCode: 'A' };
        expect(fingerprint(e)).not.toBe(
            fingerprint({ kind: '5xx', route: '/api/y', status: 500, errorCode: 'A' }),
        );
        expect(fingerprint(e)).not.toBe(
            fingerprint({ kind: '5xx', route: '/api/x', status: 502, errorCode: 'A' }),
        );
        expect(fingerprint(e)).not.toBe(
            fingerprint({ kind: '5xx', route: '/api/x', status: 500, errorCode: 'B' }),
        );
    });

    it('treats unauthorized_access reasons as fingerprint-distinguishing', () => {
        const a: AlertEvent = {
            kind: 'unauthorized_access',
            route: '/api/notes',
            status: 403,
            reason: 'role_not_in_allowlist',
        };
        const b: AlertEvent = {
            kind: 'unauthorized_access',
            route: '/api/notes',
            status: 403,
            reason: 'unauthenticated',
        };
        expect(fingerprint(a)).not.toBe(fingerprint(b));
    });
});

describe('_shouldDispatch — dedup gate', () => {
    it('returns true when Redis SET NX returns "OK" (key was free)', async () => {
        redisState.setReturn = 'OK';
        await expect(_shouldDispatch('fp:1')).resolves.toBe(true);
    });

    it('returns false when Redis SET NX returns null (key already exists)', async () => {
        redisState.setReturn = null;
        await expect(_shouldDispatch('fp:2')).resolves.toBe(false);
    });

    it('uses the spec NX + EX 900 options on the SET call', async () => {
        redisState.setReturn = 'OK';
        await _shouldDispatch('fp:3');
        const last = redisState.setCalls.at(-1);
        expect(last?.key).toContain('fp:3');
        expect(last?.opts).toMatchObject({ nx: true, ex: 900 });
    });

    it('fails open (returns true) when Redis throws', async () => {
        redisState.throwOnSet = true;
        await expect(_shouldDispatch('fp:4')).resolves.toBe(true);
    });

    it('fails open (returns true) when Redis env vars are absent', async () => {
        vi.unstubAllEnvs();
        await expect(_shouldDispatch('fp:5')).resolves.toBe(true);
    });
});

describe('dispatchAlert — Slack POST', () => {
    it('POSTs to the configured webhook on a fresh fingerprint', async () => {
        redisState.setReturn = 'OK';
        await dispatchAlert({
            kind: '5xx',
            route: '/api/notes',
            status: 500,
            errorCode: 'PGRST116',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://hooks.slack.com/services/T/B/X');
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.text).toContain('/api/notes');
        expect(body.blocks).toBeDefined();
    });

    it('does NOT POST when the dedup key already exists', async () => {
        redisState.setReturn = null;
        await dispatchAlert({
            kind: '5xx',
            route: '/api/notes',
            status: 500,
            errorCode: 'PGRST116',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still POSTs when Redis is down (fail open)', async () => {
        redisState.throwOnSet = true;
        await dispatchAlert({
            kind: 'unauthorized_access',
            route: '/api/notes',
            status: 401,
            reason: 'unauthenticated',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('is a silent no-op when SLACK_PILOT_ALERTS_WEBHOOK is absent', async () => {
        vi.stubEnv('SLACK_PILOT_ALERTS_WEBHOOK', '');
        // The dispatcher reads from process.env at runtime; stubbing to '' is
        // equivalent to unset for our truthiness check.
        delete process.env.SLACK_PILOT_ALERTS_WEBHOOK;

        await dispatchAlert({
            kind: '5xx',
            route: '/api/notes',
            status: 500,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('never throws to the caller, even if fetch rejects', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network down'));
        await expect(
            dispatchAlert({ kind: '5xx', route: '/api/x', status: 500 }),
        ).resolves.toBeUndefined();
    });

    it('never throws to the caller for malformed input', async () => {
        await expect(
            // @ts-expect-error deliberately malformed
            dispatchAlert({ kind: 'bogus', route: '/x', status: 500 }),
        ).resolves.toBeUndefined();
    });
});

describe('formatSlackMessage — payload sanitization', () => {
    it('5xx payload includes route + status + code, no extras', () => {
        const payload = formatSlackMessage({
            kind: '5xx',
            route: '/api/notes',
            status: 502,
            errorCode: 'EBADGATEWAY',
            requestId: 'req-1',
            organizationId: 'org-x',
            userRole: 'USER',
        });
        const flat = JSON.stringify(payload);
        expect(flat).toContain('/api/notes');
        expect(flat).toContain('502');
        expect(flat).toContain('EBADGATEWAY');
        expect(flat).toContain('req-1');
        expect(flat).toContain('org-x');
        expect(flat).toContain('USER');
    });

    it('does not include unexpected event fields in the payload', () => {
        // Cast through unknown so we can simulate a misbehaving caller that
        // added stray fields to the event. The dispatcher must not surface
        // those into the Slack payload.
        const tainted = {
            kind: '5xx' as const,
            route: '/api/notes',
            status: 500,
            errorCode: 'X',
            patientName: 'Jane Doe',
            note_id: '00000000-0000-0000-0000-000000000001',
        } as unknown as AlertEvent;
        const payload = formatSlackMessage(tainted);
        const flat = JSON.stringify(payload);
        expect(flat).not.toContain('Jane Doe');
        expect(flat).not.toContain('00000000-0000-0000-0000-000000000001');
    });

    it('submission_create_failed payload includes the hash, not the raw note id', () => {
        const payload = formatSlackMessage({
            kind: 'submission_create_failed',
            route: '/api/notes/abc/sign',
            noteIdHash: 'deadbeef',
            errorCode: '23503',
            organizationId: 'org-x',
        });
        const flat = JSON.stringify(payload);
        expect(flat).toContain('deadbeef');
        expect(flat).toContain('23503');
    });
});
