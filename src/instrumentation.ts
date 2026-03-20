// This file is used to initialize Sentry on the server side
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { ensureRequiredEnvVars, logEnvironmentConfig } from '@/lib/config/environment';

async function runEncryptionSelfTest(): Promise<void> {
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
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logEnvironmentConfig();
    ensureRequiredEnvVars();
    // SEC-SPRINT8: Exercise actual encrypt/decrypt cycle at boot
    await runEncryptionSelfTest();
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
