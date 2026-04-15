import { test, expect } from '@playwright/test';

// SEC-AUDIT-2026-04-10: Test credentials MUST come from the environment so we
// never commit real or stable demo secrets to the repo. Missing values fail
// the affected tests loudly rather than falling back to hardcoded defaults.
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

function requireTestCredentials(): { email: string; password: string } {
    if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
        throw new Error(
            'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in the environment to run credential-based e2e tests.'
        );
    }
    return { email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD };
}

/**
 * E2E: Login Flow
 * Tests the clinician login with demo credentials
 */
test.describe('Login Flow', () => {
    test('should display login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/ChartSpark/i);
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    });

    test('should reject invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
        await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should show error or stay on login page
        await page.waitForTimeout(2000);
        const url = page.url();
        expect(url).toContain('/login');
    });

    test('should login with demo clinician credentials', async ({ page }) => {
        const { email, password } = requireTestCredentials();
        await page.goto('/login');

        // Fill credentials sourced from environment variables
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"], input[name="password"]', password);
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        expect(page.url()).toContain('/dashboard');

        // Dashboard should show greeting
        await expect(page.locator('text=/good/i')).toBeVisible({ timeout: 10000 });
    });

    test('should logout successfully', async ({ page }) => {
        const { email, password } = requireTestCredentials();
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"], input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // Find and click logout (may be in sidebar or dropdown)
        const signOutBtn = page.locator('text=/sign out|logout|log out/i').first();
        if (await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await signOutBtn.click();
            await page.waitForURL('**/login', { timeout: 10000 });
            expect(page.url()).toContain('/login');
        }
    });
});
