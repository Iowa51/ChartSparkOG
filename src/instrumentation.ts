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
