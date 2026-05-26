---
name: testing-patterns
description: Write tests for ChartSparkOG code that meet the 80% coverage gate and the security gate. Use whenever you add or modify code in any sidecar or in OG core. Covers Jest unit tests, Supertest integration tests, Playwright E2E tests, and the mandatory RLS test pattern (cross-references the rls-testing skill).
---

# Testing Patterns

## The four layers

| Layer | Tool | When | Coverage target |
|---|---|---|---|
| Unit | Jest | All business logic, domain functions | ≥80% |
| RLS | Jest + Supabase | Every new PHI table | 100% of policies |
| Integration | Supertest (sidecar) or fetch (Next.js) | Every API endpoint | ≥80% |
| E2E | Playwright | Every user-facing flow | Key paths only |

## Unit tests — domain logic

```typescript
// src/domain/scoring/__tests__/phq9.test.ts

import { scorePhq9 } from "../phq9";

describe("scorePhq9", () => {
  test("returns 0 for all-zero responses", () => {
    const responses = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 };
    const result = scorePhq9(responses);
    expect(result.totalScore).toBe(0);
    expect(result.severity).toBe("Minimal");
    expect(result.flags).toEqual([]);
  });

  test("flags suicide risk when Q9 >= 1", () => {
    const responses = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 1 };
    const result = scorePhq9(responses);
    expect(result.flags).toContain("suicide_risk_item");
  });

  test("severity = Severe at score 20+", () => {
    const responses = { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3, q6: 3, q7: 1, q8: 0, q9: 1 };
    const result = scorePhq9(responses);
    expect(result.totalScore).toBe(20);
    expect(result.severity).toBe("Severe");
  });

  test("throws on missing required item", () => {
    const responses = { q1: 1 }; // missing 8 items
    expect(() => scorePhq9(responses)).toThrow("INCOMPLETE_RESPONSES");
  });

  test("throws on out-of-range value", () => {
    const responses = { q1: 4, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 };
    expect(() => scorePhq9(responses)).toThrow("INVALID_RESPONSE_VALUE");
  });
});
```

Naming: describe the function, each test is a sentence about behavior. Test edge cases and error paths, not just the happy path.

## Integration tests — API endpoints

```typescript
// tests/integration/notes.test.ts

import request from "supertest";
import { createApp } from "../../src/server";
import { createTestUser, cleanupTestUser } from "../helpers/auth";

describe("POST /api/notes", () => {
  let app: Express.Application;
  let userToken: string;
  let userId: string;
  let orgId: string;

  beforeAll(async () => {
    app = createApp();
    const user = await createTestUser();
    userToken = user.token;
    userId = user.id;
    orgId = user.orgId;
  });

  afterAll(async () => {
    await cleanupTestUser(userId);
  });

  test("401 without auth", async () => {
    const res = await request(app)
      .post("/api/notes")
      .send({ patientId: "00000000-0000-0000-0000-000000000000", noteText: "test" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("422 on invalid input", async () => {
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ patientId: "not-a-uuid", noteText: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });

  test("403 when MFA not verified", async () => {
    // assume helper creates a non-MFA-verified user
    // ...
  });

  test("201 on success", async () => {
    // create a patient in user's org first
    // ...
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ patientId, noteText: "Patient is doing well." });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test("404 for patient in another org (does NOT leak existence)", async () => {
    const otherOrgPatient = await createTestPatient({ orgId: "different-org-id" });
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ patientId: otherOrgPatient.id, noteText: "test" });
    expect(res.status).toBe(404); // not 403 — same response as "doesn't exist"
  });
});
```

Critical: test the **cross-org case** for every PHI endpoint. The expectation is 404, not 403, so you can verify the endpoint doesn't leak existence of out-of-org resources.

## E2E tests — user flows

```typescript
// tests/e2e/intake-flow.spec.ts

import { test, expect } from "@playwright/test";

test("clinician sends intake invite; patient claims and submits", async ({ browser }) => {
  // Clinician sends invite
  const clinicianCtx = await browser.newContext({ storageState: "tests/auth/clinician.json" });
  const clinicianPage = await clinicianCtx.newPage();
  await clinicianPage.goto("/patients/new");
  await clinicianPage.fill('[name="email"]', "newpatient@example.com");
  await clinicianPage.click('text=Send Portal Invite');
  await expect(clinicianPage.locator("text=Invite sent")).toBeVisible();

  // Get invite link from test inbox (Mailpit or similar)
  const inviteLink = await getInviteLinkFromInbox("newpatient@example.com");

  // Patient claims
  const patientCtx = await browser.newContext();
  const patientPage = await patientCtx.newPage();
  await patientPage.goto(inviteLink);
  await patientPage.fill('[name="password"]', "PatientPass123!");
  await patientPage.fill('[name="passwordConfirm"]', "PatientPass123!");
  await patientPage.click('text=Create Account');

  // Patient completes intake
  await expect(patientPage.locator("text=Welcome")).toBeVisible();
  await patientPage.click('text=Start Intake');
  // ... fill form
  await patientPage.click('text=Submit');

  // Verify on clinician side
  await clinicianPage.reload();
  await expect(clinicianPage.locator("text=Intake submitted")).toBeVisible();
});
```

E2E tests are expensive — write them for critical paths only:
- New patient → portal invite → intake submission
- Clinician note creation → AI draft → sign
- Appointment scheduling → reminder sent → check-in
- Claim creation → scrub → submit → ERA post

## Test data isolation

```typescript
// tests/helpers/test-data.ts

export async function createTestOrg(name = `test-org-${Date.now()}`) {
  const { data } = await adminClient.from("organizations").insert({ name }).select().single();
  return data!.id;
}

export async function createTestUser(opts: { orgId?: string; mfaVerified?: boolean } = {}) {
  const orgId = opts.orgId ?? (await createTestOrg());
  const email = `test-${Date.now()}@example.com`;
  // ... create auth user, get JWT, return { id, email, token, orgId, mfaVerified }
}

export async function cleanupTestData(prefixOrIds: string | string[]) {
  // Hard delete test data — uses service role
}
```

Rules for test data:
- Every test run creates its own org(s) and user(s)
- Cleanup happens in `afterAll`, not between tests (faster, and explicit)
- Test emails use a unique suffix (`Date.now()`) to avoid collisions
- Never use real-looking PHI in test data (no real names, no real DOBs)

## Coverage gates

`jest.config.js` enforces the gate:

```javascript
module.exports = {
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
```

If a PR drops coverage below 80%, CI blocks merge. You can't `--no-verify` your way past it.

## What NOT to test

- Third-party library internals (assume Zod parses correctly)
- Trivial getters/setters
- Type definitions
- Framework boilerplate (Next.js layouts, Express middleware that wraps known-good code)

Focus tests where bugs hide: business logic, edge cases, error paths, security boundaries.

## See also

- `rls-testing` — mandatory pattern for every PHI table
- `security-first` — what the security checks look like at the code level (mirror them in tests)
- `api-endpoints` — the structure your integration tests will hit
