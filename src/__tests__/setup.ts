// Test setup file for Vitest
// Provides global mocks and configuration

import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

// Mock console methods to reduce noise in test output
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});
