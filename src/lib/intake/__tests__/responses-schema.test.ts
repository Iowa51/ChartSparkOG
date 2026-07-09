// Unit tests for the portal intake write boundary schema (P2-FIXES / P2-API-1).
// Template-independent hardening: bounds + strict keys + consent-on-submit.

import { describe, expect, test } from "vitest";
import { IntakeWriteSchema, INTAKE_RESPONSE_LIMITS } from "../responses-schema";

function body(overrides: Record<string, unknown> = {}) {
  return {
    template_id: null,
    submission_id: null,
    responses: { demographics: { first_name: "Ada" } },
    submit: false,
    ...overrides,
  };
}

describe("IntakeWriteSchema — accepts well-formed bodies", () => {
  test("minimal draft save", () => {
    expect(IntakeWriteSchema.safeParse(body()).success).toBe(true);
  });

  test("submit with a complete consent { value, at, template_version }", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({
        submit: true,
        responses: {
          consents: { hipaa: { value: true, at: "2026-07-07T00:00:00Z", template_version: 1 } },
        },
      }),
    );
    expect(parsed.success).toBe(true);
  });

  test("draft save allows a partial consent (save-and-resume not blocked)", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({
        submit: false,
        responses: { consents: { hipaa: { value: true, at: null, template_version: null } } },
      }),
    );
    expect(parsed.success).toBe(true);
  });

  test("a bare boolean field is not mistaken for a consent on submit", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({ submit: true, responses: { allergies: { nkda: true } } }),
    );
    expect(parsed.success).toBe(true);
  });
});

describe("IntakeWriteSchema — consent enforcement on submit", () => {
  test("affirmative consent missing `at` is rejected on submit", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({
        submit: true,
        responses: { consents: { hipaa: { value: true, template_version: 1 } } },
      }),
    );
    expect(parsed.success).toBe(false);
  });

  test("affirmative consent missing `template_version` is rejected on submit", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({
        submit: true,
        responses: { consents: { hipaa: { value: true, at: "2026-07-07T00:00:00Z" } } },
      }),
    );
    expect(parsed.success).toBe(false);
  });

  test("a declined consent is version-stamped but needs no timestamp on submit (DELTA-API-1)", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({
        submit: true,
        responses: { consents: { hipaa: { value: false, at: null, template_version: 1 } } },
      }),
    );
    expect(parsed.success).toBe(true);
  });

  test("a declined consent missing template_version is rejected on submit (DELTA-API-1)", () => {
    const parsed = IntakeWriteSchema.safeParse(
      body({ submit: true, responses: { consents: { hipaa: { value: false } } } }),
    );
    expect(parsed.success).toBe(false);
  });
});

describe("IntakeWriteSchema — structural bounds & strict keys", () => {
  test("rejects a junk section key", () => {
    expect(IntakeWriteSchema.safeParse(body({ responses: { "bad key!": { f: 1 } } })).success).toBe(
      false,
    );
  });

  test("rejects a junk field key", () => {
    expect(IntakeWriteSchema.safeParse(body({ responses: { sec: { "b a d": 1 } } })).success).toBe(
      false,
    );
  });

  test("rejects an over-long string value", () => {
    const long = "x".repeat(INTAKE_RESPONSE_LIMITS.maxStringLength + 1);
    expect(IntakeWriteSchema.safeParse(body({ responses: { sec: { note: long } } })).success).toBe(
      false,
    );
  });

  test("rejects an over-long array", () => {
    const arr = Array.from({ length: INTAKE_RESPONSE_LIMITS.maxArrayItems + 1 }, (_, i) => i);
    expect(IntakeWriteSchema.safeParse(body({ responses: { sec: { list: arr } } })).success).toBe(
      false,
    );
  });

  test("rejects nesting deeper than the limit", () => {
    let deep: unknown = "leaf";
    for (let i = 0; i < INTAKE_RESPONSE_LIMITS.maxDepth + 2; i += 1) deep = { nest: deep };
    expect(IntakeWriteSchema.safeParse(body({ responses: { sec: { tree: deep } } })).success).toBe(
      false,
    );
  });

  test("rejects too many sections", () => {
    const responses: Record<string, unknown> = {};
    for (let i = 0; i < INTAKE_RESPONSE_LIMITS.maxSections + 1; i += 1)
      responses[`s_${i}`] = { f: 1 };
    expect(IntakeWriteSchema.safeParse(body({ responses })).success).toBe(false);
  });

  test("rejects a non-object responses payload", () => {
    expect(IntakeWriteSchema.safeParse(body({ responses: "nope" })).success).toBe(false);
  });

  test("rejects unknown top-level keys (strict)", () => {
    expect(IntakeWriteSchema.safeParse({ ...body(), extra: 1 }).success).toBe(false);
  });
});
