// Test setup file for Vitest
// Provides global mocks and configuration

import { vi } from 'vitest';

const testEnv = process.env as Record<string, string | undefined>;

// Mock environment variables
testEnv.NODE_ENV = 'test';
testEnv.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

// PHI encryption key for testing (32+ chars required for AES-256)
// This is a TEST-ONLY key — never use in production
testEnv.PHI_ENCRYPTION_KEY = 'test-encryption-key-for-vitest-chartspark-32chars!';

// Mock console methods to reduce noise in test output
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});
