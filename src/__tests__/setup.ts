// Test setup file for Vitest
// Provides global mocks and configuration

import { vi } from 'vitest';

const testEnv = process.env as Record<string, string | undefined>;
const TEST_ENCRYPTION_KEY_DO_NOT_USE_IN_PRODUCTION = 'test-encryption-key-for-vitest-chartspark-32chars!';

if (
    process.env.NODE_ENV &&
    process.env.NODE_ENV !== 'test' &&
    process.env.PHI_ENCRYPTION_KEY === TEST_ENCRYPTION_KEY_DO_NOT_USE_IN_PRODUCTION
) {
    throw new Error('TEST_ENCRYPTION_KEY_DO_NOT_USE_IN_PRODUCTION must never be used outside NODE_ENV=test');
}

// Mock environment variables
testEnv.NODE_ENV = 'test';
testEnv.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

// PHI encryption key for testing (32+ chars required for AES-256).
// TEST-ONLY constant: never use this value outside the Vitest environment.
testEnv.PHI_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY_DO_NOT_USE_IN_PRODUCTION;

// Mock console methods to reduce noise in test output
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});
