import { test, expect } from '@playwright/test';

/**
 * E2E: Route Protection
 * Verifies that authenticated routes redirect unauthenticated users to login
 */
test.describe('Route Protection — Unauthenticated Redirects', () => {
    const protectedRoutes = [
        '/dashboard',
        '/patients',
        '/notes',
        '/encounters',
        '/calendar',
        '/settings',
        '/notifications',
    ];

    for (const route of protectedRoutes) {
        test(`should redirect ${route} to login when unauthenticated`, async ({ page }) => {
            await page.goto(route);
            // Should redirect to login page within timeout
            await page.waitForURL('**/login**', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        });
    }
});

test.describe('Route Protection — Admin Routes', () => {
    const adminRoutes = [
        '/super-admin/users',
        '/super-admin/organizations',
        '/super-admin/analytics',
        '/super-admin/audit-logs',
    ];

    for (const route of adminRoutes) {
        test(`should protect admin route ${route}`, async ({ page }) => {
            await page.goto(route);
            await page.waitForTimeout(3000);
            const url = page.url();
            // Should redirect to login or show access denied
            const isProtected = url.includes('/login') || url.includes('/dashboard') || url.includes('/unauthorized');
            expect(isProtected).toBe(true);
        });
    }
});
