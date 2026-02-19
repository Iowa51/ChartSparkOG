// src/__tests__/safe-logger.test.ts
// TEST-CRIT-01: Priority test suite — PHI-safe logging utilities
// Tests that the safe-logger properly sanitizes sensitive data from logs.

import { describe, it, expect } from 'vitest';
import { sanitizeError } from '@/lib/logging/safe-logger';

describe('sanitizeError', () => {
    it('extracts message from Error objects', () => {
        const result = sanitizeError(new Error('Something went wrong'));
        expect(result).toContain('Something went wrong');
    });

    it('handles string errors', () => {
        const result = sanitizeError('string error');
        expect(result).toBe('string error');
    });

    it('handles null/undefined', () => {
        expect(sanitizeError(null)).toBeDefined();
        expect(sanitizeError(undefined)).toBeDefined();
    });

    it('handles object errors', () => {
        const result = sanitizeError({ message: 'object error', code: 'ERR_01' });
        expect(typeof result).toBe('string');
    });

    it('does not expose stack traces in returned value', () => {
        const error = new Error('test error');
        error.stack = 'Error: test error\n    at /secret/path/file.ts:42:10';
        const result = sanitizeError(error);
        // The sanitized result should not contain file paths
        expect(result).not.toContain('/secret/path');
    });
});
