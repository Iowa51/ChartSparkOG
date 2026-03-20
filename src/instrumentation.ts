// This file is used to initialize Sentry on the server side
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { ensureRequiredEnvVars, logEnvironmentConfig } from '@/lib/config/environment';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logEnvironmentConfig();
    ensureRequiredEnvVars();
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
