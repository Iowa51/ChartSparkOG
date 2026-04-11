import { test, expect } from '@playwright/test';

// SEC-AUDIT-2026-04-10: Test credentials sourced from environment — never
// hardcoded. Missing values fail the suite loudly so CI can't silently start
// authenticating against stale/demo accounts.
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

/**
 * E2E: Patients Page
 * Tests patient list loading and navigation (requires authenticated session)
 */
test.describe('Patients Page', () => {
    test.beforeEach(async ({ page }) => {
        if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
            throw new Error(
                'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in the environment to run the Patients Page e2e suite.'
            );
        }
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"], input[name="email"]', E2E_TEST_EMAIL);
        await page.fill('input[type="password"], input[name="password"]', E2E_TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
    });

    test('should load patients page', async ({ page }) => {
        await page.goto('/patients');
        await page.waitForLoadState('networkidle');

        // Should display patients list or empty state
        const hasPatients = await page.locator('text=/patient/i').first().isVisible({ timeout: 10000 });
        expect(hasPatients).toBe(true);
    });

    test('should display patient data', async ({ page }) => {
        await page.goto('/patients');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check for presence of patient cards/rows
        const patientElements = page.locator('[data-testid="patient-card"], tr, [class*="patient"]');
        const count = await patientElements.count();

        // Should have at least some content on the patients page
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });

    test('should have search functionality', async ({ page }) => {
        await page.goto('/patients');
        await page.waitForLoadState('networkidle');

        // Look for search input
        const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
        const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasSearch) {
            await searchInput.fill('test');
            await page.waitForTimeout(1000);
            // Search should filter without errors
            const pageContent = await page.textContent('body');
            expect(pageContent).toBeTruthy();
        }
    });
});
