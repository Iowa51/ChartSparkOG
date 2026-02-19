// src/__tests__/csrf.test.ts
// TEST-CRIT-01: Priority test suite — CSRF validation
// Tests the origin validation logic that protects all state-changing routes.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateOrigin, isAllowedOrigin, checkCSRF } from '@/lib/security/csrf';
import { NextRequest } from 'next/server';

// Helper to create a mock NextRequest with specified headers
function createMockRequest(
    method: string = 'POST',
    headers: Record<string, string> = {}
): NextRequest {
    return new NextRequest(new URL('http://localhost:3000/api/patients'), {
        method,
        headers,
    });
}

describe('validateOrigin', () => {
    it('accepts request with matching origin and host', () => {
        const request = createMockRequest('POST', {
            origin: 'http://localhost:3000',
            host: 'localhost:3000',
        });
        expect(validateOrigin(request)).toBe(true);
    });

    it('rejects request with mismatched origin', () => {
        const request = createMockRequest('POST', {
            origin: 'http://evil.com',
            host: 'localhost:3000',
        });
        expect(validateOrigin(request)).toBe(false);
    });

    it('accepts request with matching referer when no origin', () => {
        const request = createMockRequest('POST', {
            referer: 'http://localhost:3000/dashboard',
            host: 'localhost:3000',
        });
        expect(validateOrigin(request)).toBe(true);
    });

    it('rejects request with mismatched referer', () => {
        const request = createMockRequest('POST', {
            referer: 'http://evil.com/fake',
            host: 'localhost:3000',
        });
        expect(validateOrigin(request)).toBe(false);
    });

    it('rejects request with no origin or referer in production', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const request = createMockRequest('POST', { host: 'localhost:3000' });
        expect(validateOrigin(request)).toBe(false);
        process.env.NODE_ENV = origEnv;
    });
});

describe('isAllowedOrigin', () => {
    it('accepts localhost in development', () => {
        expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    });

    it('accepts Vercel preview URLs', () => {
        expect(isAllowedOrigin('https://chartspark-abc123.vercel.app')).toBe(true);
    });

    it('rejects random origins', () => {
        expect(isAllowedOrigin('https://evil.com')).toBe(false);
    });
});

describe('checkCSRF', () => {
    it('returns null for GET requests (safe method)', () => {
        const request = createMockRequest('GET', {});
        expect(checkCSRF(request)).toBeNull();
    });

    it('returns null for HEAD requests', () => {
        const request = createMockRequest('HEAD', {});
        expect(checkCSRF(request)).toBeNull();
    });

    it('returns null for OPTIONS requests', () => {
        const request = createMockRequest('OPTIONS', {});
        expect(checkCSRF(request)).toBeNull();
    });

    it('returns 403 for POST without origin', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const request = createMockRequest('POST', { host: 'localhost:3000' });
        const result = checkCSRF(request);
        expect(result).not.toBeNull();
        expect(result?.status).toBe(403);
        process.env.NODE_ENV = origEnv;
    });

    it('returns null for POST with valid origin', () => {
        const request = createMockRequest('POST', {
            origin: 'http://localhost:3000',
            host: 'localhost:3000',
        });
        expect(checkCSRF(request)).toBeNull();
    });
});
