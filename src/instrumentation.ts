// This file is used to initialize Sentry on the server side
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// IMPORTANT: No static imports of Node.js-only modules here.
// instrumentation.ts is bundled for BOTH Node.js and Edge runtimes.
// All Node.js-specific imports (encryption, environment config) must be
// dynamically imported inside the `process.env.NEXT_RUNTIME === 'nodejs'`
// branch so the Edge bundler can dead-code-eliminate them.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureRequiredEnvVars, logEnvironmentConfig } = await import('@/lib/config/environment');
    logEnvironmentConfig();
    ensureRequiredEnvVars();

    // Startup secret validation — structural checks for required secrets.
    // Values are NEVER logged; only variable names and the reason for failure.
    // In production, any failure is fatal (exit 1). In dev, failures warn and continue.
    type SecretKind = 'url' | 'key' | 'name';
    const REQUIRED_SECRETS: ReadonlyArray<{ name: string; kind: SecretKind }> = [
      { name: 'AZURE_OPENAI_ENDPOINT', kind: 'url' },
      { name: 'AZURE_OPENAI_API_KEY', kind: 'key' },
      { name: 'AZURE_OPENAI_DEPLOYMENT_NAME', kind: 'name' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', kind: 'key' },
      { name: 'NEXT_PUBLIC_SUPABASE_URL', kind: 'url' },
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', kind: 'key' },
      { name: 'PHI_ENCRYPTION_KEY', kind: 'key' },
      { name: 'ENCRYPTION_SALT', kind: 'key' },
    ];
    const PLACEHOLDER_MARKERS = ['YOUR_', 'PASTE_', 'CHANGE_ME', 'example', 'test'] as const;

    const secretFailures: string[] = [];
    for (const { name, kind } of REQUIRED_SECRETS) {
      const raw = process.env[name];
      if (!raw || raw.length === 0) {
        secretFailures.push(`${name}: missing or empty`);
        continue;
      }
      const lower = raw.toLowerCase();
      const placeholderHit = PLACEHOLDER_MARKERS.find((m) => lower.includes(m.toLowerCase()));
      if (placeholderHit) {
        secretFailures.push(`${name}: contains placeholder marker "${placeholderHit}"`);
        continue;
      }
      if (kind === 'url' && !raw.startsWith('https://')) {
        secretFailures.push(`${name}: must start with https://`);
        continue;
      }
      if (kind === 'key' && raw.length <= 20) {
        secretFailures.push(`${name}: API key must be longer than 20 characters`);
        continue;
      }
    }

    if (secretFailures.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        for (const failure of secretFailures) {
          console.error(`[CRITICAL] Startup secret validation failed: ${failure}`);
        }
        console.error(
          `[CRITICAL] Aborting startup: ${secretFailures.length} secret validation failure(s) in production.`
        );
        process.exit(1);
      } else {
        for (const failure of secretFailures) {
          console.warn(`[WARN] Startup secret validation: ${failure}`);
        }
        console.warn(
          `[WARN] ${secretFailures.length} secret validation issue(s). Continuing because NODE_ENV != production.`
        );
      }
    } else {
      console.log('[boot] startup secret validation passed');
    }

    // SEC-SPRINT8: Exercise actual encrypt/decrypt cycle at boot
    const { encryptPHI, decryptPHI } = await import('@/lib/security/encryption');
    const testPlaintext = 'chartspark-boot-test';
    const encrypted = await encryptPHI(testPlaintext);
    const decrypted = await decryptPHI(encrypted);
    if (decrypted !== testPlaintext) {
      throw new Error(
        'FATAL: Encryption self-test failed — decrypt(encrypt(plaintext)) did not round-trip. ' +
        'Check PHI_ENCRYPTION_KEY and ENCRYPTION_SALT configuration.'
      );
    }
    console.log('[boot] encryption self-test passed');

    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
