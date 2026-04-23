// Sentry browser-side configuration
// This file configures Sentry for the client runtime
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Session Replay is intentionally NOT enabled — replays would capture the
// rendered DOM, which can include PHI (patient names, DOBs, note content).

import * as Sentry from "@sentry/nextjs";
import { beforeSendScrubPhi } from "@/lib/sentry/scrub-phi";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        debug: false,
        beforeSend: beforeSendScrubPhi,
    });
}
