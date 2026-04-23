// Sentry server-side configuration
// This file configures Sentry for Node.js server runtime
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { beforeSendScrubPhi } from "@/lib/sentry/scrub-phi";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        debug: false,
        beforeSend: beforeSendScrubPhi,
    });
}
