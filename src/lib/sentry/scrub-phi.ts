// PHI scrubbing for Sentry events. Runs in Node, browser, and edge runtimes,
// so only standard JS is used — no Node-specific APIs.

import type { ErrorEvent } from "@sentry/nextjs";

const PHI_KEYS: ReadonlySet<string> = new Set([
    "patient_id",
    "patient_name",
    "first_name",
    "last_name",
    "date_of_birth",
    "dob",
    "ssn",
    "mrn",
    "phone",
    "email",
    "address",
    "content",
    "transcript",
    "note_content",
    "subjective",
    "objective",
    "assessment",
    "plan",
    "chief_complaint",
    "clinicianinput",
    "scribetranscription",
    "allergies",
    "medications",
    "problems",
]);

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 10;

function isPhiKey(key: string): boolean {
    return PHI_KEYS.has(key.toLowerCase());
}

// Recursively walk a value; replace values under PHI keys with [REDACTED].
function scrubObject(value: unknown, depth = 0): unknown {
    if (depth > MAX_DEPTH || value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((v) => scrubObject(v, depth + 1));
    if (typeof value !== "object") return value;

    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src)) {
        out[k] = isPhiKey(k) ? REDACTED : scrubObject(src[k], depth + 1);
    }
    return out;
}

function scrubMaybeJsonString(s: string): string {
    try {
        const parsed = JSON.parse(s);
        return JSON.stringify(scrubObject(parsed));
    } catch {
        return s;
    }
}

// Conservative patterns for free-form text in breadcrumb messages.
// MRN-shaped: 6–12 consecutive digits. Name-shaped: two capitalized words in a row.
const MRN_PATTERN = /\b\d{6,12}\b/g;
const NAME_PATTERN = /\b[A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20}\b/g;

function scrubText(s: string): string {
    return s.replace(MRN_PATTERN, REDACTED).replace(NAME_PATTERN, REDACTED);
}

export function scrubPhiFromEvent(event: ErrorEvent): ErrorEvent {
    // 1. request.data — POST bodies.
    if (event.request && event.request.data !== undefined) {
        const data = event.request.data;
        if (typeof data === "string") {
            event.request.data = scrubMaybeJsonString(data);
        } else if (data && typeof data === "object") {
            event.request.data = scrubObject(data) as typeof data;
        }
    }

    // 2. exception stack frame vars — local variables may hold PHI.
    const exceptionValues = event.exception?.values;
    if (exceptionValues) {
        for (const ex of exceptionValues) {
            const frames = ex.stacktrace?.frames;
            if (!frames) continue;
            for (const frame of frames) {
                if ((frame as { vars?: unknown }).vars !== undefined) {
                    delete (frame as { vars?: unknown }).vars;
                }
            }
        }
    }

    // 3. breadcrumbs — delete PHI keys in data, redact PHI shapes in messages.
    if (event.breadcrumbs) {
        for (const bc of event.breadcrumbs) {
            if (bc.data && typeof bc.data === "object") {
                const d = bc.data as Record<string, unknown>;
                for (const k of Object.keys(d)) {
                    if (isPhiKey(k)) delete d[k];
                }
            }
            if (typeof bc.message === "string") {
                bc.message = scrubText(bc.message);
            }
        }
    }

    // 4. extra + contexts — delete PHI keys.
    if (event.extra) {
        for (const k of Object.keys(event.extra)) {
            if (isPhiKey(k)) delete event.extra[k];
        }
    }
    if (event.contexts) {
        for (const k of Object.keys(event.contexts)) {
            if (isPhiKey(k)) delete (event.contexts as Record<string, unknown>)[k];
        }
    }

    return event;
}

export const beforeSendScrubPhi = (event: ErrorEvent): ErrorEvent => scrubPhiFromEvent(event);
