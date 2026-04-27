// Build 5: Slack alert dispatch for the Practice One pilot.
//
// Three alert kinds wire here from the rest of the codebase:
//   - 5xx                       (observed in withAuth after the handler runs)
//   - unauthorized_access       (emitted at the withAuth deny site)
//   - submission_create_failed  (emitted at the /api/notes/[id]/sign route
//                                when the submissions insert fails)
//
// Fingerprint-based dedup via Upstash Redis: identical events collapse to
// one Slack message per 15-minute window. Fail open: if Redis is down,
// dispatch anyway — over-alerting beats missing pilot incidents.
//
// HARD CONSTRAINTS (spec):
//   - No PHI in payloads. Acceptable fields only: route, status, error
//     code/name, request_id, organization UUID, user role, timestamp.
//   - Fire-and-forget from API request thread; never block the response.
//   - Never crash the caller. All failures are swallowed + safeLogged.

import { logWarn } from '@/lib/logging/safe-logger';

export type AlertEvent =
    | {
          kind: '5xx';
          route: string;
          status: number;
          errorCode?: string;
          requestId?: string;
          organizationId?: string;
          userRole?: string;
      }
    | {
          kind: 'unauthorized_access';
          route: string;
          status: 401 | 403;
          reason: string;
          requestId?: string;
          userId?: string;
          organizationId?: string;
      }
    | {
          kind: 'submission_create_failed';
          route: string;
          noteIdHash?: string;
          errorCode?: string;
          requestId?: string;
          organizationId?: string;
      };

const DEDUP_TTL_SECONDS = 15 * 60;
const DEDUP_PREFIX = 'slack-alert-dedup';
const SLACK_TIMEOUT_MS = 3000;

// ── Fingerprinting ───────────────────────────────────────────────────────

export function fingerprint(event: AlertEvent): string {
    switch (event.kind) {
        case '5xx':
            return `5xx:${event.route}:${event.status}:${event.errorCode ?? 'unknown'}`;
        case 'unauthorized_access':
            return `unauth:${event.route}:${event.status}:${event.reason}`;
        case 'submission_create_failed':
            return `submission_fail:${event.route}:${event.errorCode ?? 'unknown'}`;
    }
}

// ── Dedup gate (Upstash) ─────────────────────────────────────────────────

/**
 * Returns true if this fingerprint should fire (the dedup key was free).
 * Returns false if the same fingerprint has already fired in the last
 * 15 minutes. On Redis error, returns true (fail open).
 *
 * Exported for tests; internal callers go through dispatchAlert.
 */
export async function _shouldDispatch(fp: string): Promise<boolean> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        // No Redis configured — fail open. Dev and preview environments
        // don't have rate-limit Redis either, and the pilot is on Vercel
        // production which does.
        return true;
    }

    try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({ url, token });

        // SET key value NX EX 900 — atomic set-if-not-exists with TTL.
        // Returns "OK" when the key was set (we won the race), null when
        // the key already existed (suppress).
        const result = await redis.set(`${DEDUP_PREFIX}:${fp}`, '1', {
            nx: true,
            ex: DEDUP_TTL_SECONDS,
        });
        return result === 'OK';
    } catch (err) {
        logWarn({
            action: 'SLACK_ALERT_DEDUP_FAILED',
            error: err instanceof Error ? err.message : 'unknown',
        });
        // Fail open per spec — better to over-alert than miss.
        return true;
    }
}

// ── Slack Block Kit payload ──────────────────────────────────────────────

interface SlackBlock {
    type: string;
    text?: { type: string; text: string };
    fields?: { type: string; text: string }[];
}

interface SlackPayload {
    text: string;
    blocks: SlackBlock[];
}

const KIND_HEADER: Record<AlertEvent['kind'], string> = {
    '5xx': ':rotating_light: 5xx response',
    'unauthorized_access': ':lock: Unauthorized access',
    'submission_create_failed': ':warning: Submission create failed',
};

export function formatSlackMessage(event: AlertEvent): SlackPayload {
    const header = KIND_HEADER[event.kind];
    const timestamp = new Date().toISOString();

    const fields: { type: string; text: string }[] = [
        { type: 'mrkdwn', text: `*Route:*\n${event.route}` },
    ];

    switch (event.kind) {
        case '5xx':
            fields.push({ type: 'mrkdwn', text: `*Status:*\n${event.status}` });
            fields.push({
                type: 'mrkdwn',
                text: `*Error code:*\n${event.errorCode ?? 'unknown'}`,
            });
            if (event.userRole) {
                fields.push({ type: 'mrkdwn', text: `*User role:*\n${event.userRole}` });
            }
            break;
        case 'unauthorized_access':
            fields.push({ type: 'mrkdwn', text: `*Status:*\n${event.status}` });
            fields.push({ type: 'mrkdwn', text: `*Reason:*\n${event.reason}` });
            if (event.userId) {
                fields.push({ type: 'mrkdwn', text: `*User id:*\n${event.userId}` });
            }
            break;
        case 'submission_create_failed':
            fields.push({
                type: 'mrkdwn',
                text: `*Error code:*\n${event.errorCode ?? 'unknown'}`,
            });
            if (event.noteIdHash) {
                fields.push({
                    type: 'mrkdwn',
                    text: `*Note id (sha256/8):*\n${event.noteIdHash}`,
                });
            }
            break;
    }

    if (event.requestId) {
        fields.push({ type: 'mrkdwn', text: `*Request id:*\n${event.requestId}` });
    }
    if (event.organizationId) {
        fields.push({ type: 'mrkdwn', text: `*Organization:*\n${event.organizationId}` });
    }
    fields.push({ type: 'mrkdwn', text: `*Time:*\n${timestamp}` });

    const text = `${header} — ${event.route}`;

    return {
        text,
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${header} ${event.route}` },
            },
            { type: 'section', fields },
        ],
    };
}

// ── Slack POST ───────────────────────────────────────────────────────────

async function postToSlack(payload: SlackPayload): Promise<void> {
    const webhook = process.env.SLACK_PILOT_ALERTS_WEBHOOK;
    if (!webhook) {
        // Webhook not configured (dev / preview). No-op silently.
        return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

    try {
        const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!res.ok) {
            logWarn({
                action: 'SLACK_ALERT_HTTP_ERROR',
                status: String(res.status),
            });
        }
    } catch (err) {
        logWarn({
            action: 'SLACK_ALERT_POST_FAILED',
            error: err instanceof Error ? err.message : 'unknown',
        });
    } finally {
        clearTimeout(timer);
    }
}

// ── Public entry point ───────────────────────────────────────────────────

/**
 * Fire-and-forget alert dispatch. Caller should treat as `void` and never
 * await — the only reason to await is in tests. Internally:
 *   1. Compute fingerprint.
 *   2. Attempt atomic dedup gate. Suppress if recently fired.
 *   3. Build Slack Block Kit payload (no PHI).
 *   4. POST to webhook with 3s timeout.
 *
 * Wraps everything in try/catch so a malformed event or bad runtime state
 * never crashes the caller's request.
 */
export async function dispatchAlert(event: AlertEvent): Promise<void> {
    try {
        const fp = fingerprint(event);
        const should = await _shouldDispatch(fp);
        if (!should) return;
        const payload = formatSlackMessage(event);
        await postToSlack(payload);
    } catch (err) {
        try {
            logWarn({
                action: 'SLACK_ALERT_DISPATCH_FAILED',
                error: err instanceof Error ? err.message : 'unknown',
            });
        } catch {
            // safeLog itself failed — there's nothing left to do.
        }
    }
}
