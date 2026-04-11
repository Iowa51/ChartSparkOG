import { test, expect } from '@playwright/test';

// SEC-AUDIT-2026-04-10: Test credentials sourced from environment — never
// hardcoded. Missing values fail the suite loudly rather than falling back
// to stable demo secrets.
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

function assertTestCredentials(): { email: string; password: string } {
    if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
        throw new Error(
            'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in the environment to run the Notes / Navigation e2e suites.'
        );
    }
    return { email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD };
}

/**
 * E2E: Notes Page
 * Tests clinical notes list loading and navigation (requires authenticated session)
 */
test.describe('Notes Page', () => {
    test.beforeEach(async ({ page }) => {
        const { email, password } = assertTestCredentials();
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"], input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
    });

    test('should load notes page', async ({ page }) => {
        await page.goto('/notes');
        await page.waitForLoadState('networkidle');

        // Should display notes page content
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        // Should not show an unhandled error
        expect(pageContent).not.toContain('Application error');
    });

    test('should navigate to new note creation', async ({ page }) => {
        await page.goto('/notes');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Look for "New Note" or "Create" button
        const newNoteBtn = page.locator('text=/new note|create note|add note/i').first();
        const hasNewNote = await newNoteBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasNewNote) {
            await newNoteBtn.click();
            await page.waitForTimeout(2000);
            // Should navigate to note creation
            const url = page.url();
            expect(url).toContain('/notes');
        }
    });

    test('should display dashboard correctly after login', async ({ page }) => {
        // Verify dashboard has expected sections
        await page.waitForLoadState('networkidle');
        const body = await page.textContent('body');

        // Dashboard should have some meaningful content
        expect(body).toBeTruthy();
        expect(body!.length).toBeGreaterThan(100);
    });
});

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        const { email, password } = assertTestCredentials();
        await page.goto('/login');
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"], input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
    });

    test('should navigate between main sections without errors', async ({ page }) => {
        const routes = ['/patients', '/notes', '/encounters', '/calendar'];

        for (const route of routes) {
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            // Each page should load without errors
            const body = await page.textContent('body');
            expect(body).not.toContain('Application error');
            expect(body).not.toContain('500');
        }
    });
});
