import { test, expect, devices, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_ROOT = path.resolve(process.cwd(), "screenshots", "phase2");

const ROUTES_AUTH = [
  "/dashboard",
  "/patients",
  "/notes",
  "/billing",
  "/settings",
  "/admin",
];

const ROUTES_PUBLIC = [
  "/login",
  "/register",
  "/pricing",
  "/forgot-password",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function safeName(route: string) {
  return route.replace(/^\//, "").replace(/\//g, "_") || "root";
}

async function enableDemoMode(page: Page) {
  // Set demoMode in both cookie and localStorage before any route loads.
  // This matches the pattern referenced in the Phase 1 audit Sidebar.tsx
  // logout handler (which CLEARS demoMode), so the inverse should enable it.
  await page.context().addCookies([
    {
      name: "demoMode",
      value: "true",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("demoMode", "true");
    } catch {}
  });
}

async function captureRoute(page: Page, route: string, viewportName: string) {
  const url = `${BASE_URL}${route}`;
  const outDir = path.join(OUT_ROOT, viewportName);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${safeName(route)}.png`);

  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
    // Wait a beat for client-side hydration / banners / toasts to settle.
    await page.waitForTimeout(800);
    const status = resp?.status() ?? 0;
    await page.screenshot({ path: outPath, fullPage: true });
    return { route, status, file: outPath, ok: status < 400 };
  } catch (err: any) {
    return { route, status: 0, file: outPath, ok: false, error: err?.message };
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`Phase 2 smoke @ ${vp.name}`, () => {
    // Strip defaultBrowserType from device spread — Playwright forbids
    // setting it inside a describe (would force a new worker). The
    // remaining UA / isMobile / hasTouch fields still give us mobile fidelity.
    const mobileExtras = vp.name === "mobile"
      ? (() => {
          const { defaultBrowserType: _unused, ...rest } = devices["iPhone 14"];
          return rest;
        })()
      : {};
    test.use({
      viewport: { width: vp.width, height: vp.height },
      ...mobileExtras,
    });

    test(`Capture routes — ${vp.name}`, async ({ page }) => {
      test.setTimeout(180_000);

      await enableDemoMode(page);

      const results: Array<{ route: string; status: number; ok: boolean; file: string; error?: string }> = [];

      // Try auth-gated routes first
      for (const route of ROUTES_AUTH) {
        const r = await captureRoute(page, route, vp.name);
        results.push(r);
      }

      // Always also capture public routes (useful regardless of auth state)
      for (const route of ROUTES_PUBLIC) {
        const r = await captureRoute(page, route, vp.name);
        results.push(r);
      }

      // Write a summary JSON next to the screenshots
      const summaryPath = path.join(OUT_ROOT, vp.name, "_summary.json");
      fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

      // Soft assertion: at least one route returned 2xx
      const anyOk = results.some((r) => r.ok);
      expect(anyOk, "Expected at least one route to render successfully").toBeTruthy();
    });
  });
}
