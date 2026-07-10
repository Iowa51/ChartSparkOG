// @vitest-environment node
//
// Sprint 2 / P3-FIXES (HIGH-4) static guard: the portal paths must NEVER use the
// service-role client. All portal DB access goes through the patient_portal role +
// RLS / SECURITY DEFINER functions. The ONLY portal-related Auth-admin calls are
// isolated in src/lib/auth/portal-auth-admin.ts (Auth API, not a DB write), which
// is deliberately outside the trees scanned here.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../.."); // repo root
const PORTAL_TREES = [
  path.join(ROOT, "src", "app", "(portal)"),
  path.join(ROOT, "src", "lib", "portal"),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("portal paths are service-role-free (P3-HIGH-4)", () => {
  it("no file under (portal) or lib/portal imports/uses createServiceRoleClient", () => {
    const offenders: string[] = [];
    for (const tree of PORTAL_TREES) {
      for (const file of walk(tree)) {
        // Skip this guard test itself.
        if (file.endsWith("no-service-role.test.ts")) continue;
        const src = readFileSync(file, "utf8");
        if (src.includes("createServiceRoleClient") || src.includes("service-role-client")) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("scans a non-empty set of portal files (guard is not vacuous)", () => {
    const total = PORTAL_TREES.reduce((n, t) => n + walk(t).length, 0);
    expect(total).toBeGreaterThan(0);
  });
});
