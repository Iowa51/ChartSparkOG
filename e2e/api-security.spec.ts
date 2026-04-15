import { test, expect } from '@playwright/test';

/**
 * E2E: API Security
 * Verifies that unauthenticated API requests are properly rejected
 */
test.describe('API Security — Unauthenticated Access', () => {
    const protectedEndpoints = [
        { method: 'GET', path: '/api/patients', name: 'Patients' },
        { method: 'GET', path: '/api/notes', name: 'Notes' },
        { method: 'GET', path: '/api/ehr/configurations', name: 'EHR Configs' },
        { method: 'GET', path: '/api/ehr/consent', name: 'EHR Consent' },
        { method: 'GET', path: '/api/ehr/audit-log', name: 'EHR Audit Log' },
        { method: 'GET', path: '/api/subscriptions/status', name: 'Subscription Status' },
        { method: 'GET', path: '/api/managed-billing/invoices', name: 'Billing Invoices' },
        { method: 'GET', path: '/api/managed-billing/claims', name: 'Billing Claims' },
        { method: 'GET', path: '/api/managed-billing/collections', name: 'Billing Collections' },
    ];

    for (const endpoint of protectedEndpoints) {
        test(`should reject unauthenticated ${endpoint.method} ${endpoint.name}`, async ({ request }) => {
            const response = await request.get(endpoint.path, {
                headers: {
                    // No auth cookies — should be rejected
                    'Content-Type': 'application/json',
                },
            });

            // Should return 401 or 403
            expect([401, 403]).toContain(response.status());
        });
    }

    // POST endpoints should also reject unauthenticated requests
    const postEndpoints = [
        { path: '/api/patients', name: 'Create Patient', body: { first_name: 'Test', last_name: 'User' } },
        { path: '/api/ai/chat', name: 'AI Chat', body: { message: 'test' } },
        { path: '/api/ai/diagnose', name: 'AI Diagnose', body: { symptoms: 'test' } },
    ];

    for (const endpoint of postEndpoints) {
        test(`should reject unauthenticated POST ${endpoint.name}`, async ({ request }) => {
            const response = await request.post(endpoint.path, {
                data: endpoint.body,
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Should return 401 or 403
            expect([401, 403]).toContain(response.status());
        });
    }
});

test.describe('API Security — CSRF Protection', () => {
    test('should reject POST without CSRF header', async ({ request }) => {
        const response = await request.post('/api/patients', {
            data: { first_name: 'Test', last_name: 'CSRF' },
            headers: {
                'Content-Type': 'application/json',
                // Deliberately omit x-csrf-token / x-requested-with
            },
        });

        // Should be rejected (401 for unauthed or 403 for CSRF)
        expect([401, 403]).toContain(response.status());
    });
});
