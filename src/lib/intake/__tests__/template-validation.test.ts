import { describe, it, expect } from "vitest";
import { validateResponsesAgainstTemplate } from "@/lib/intake/template-validation";
import type { IntakeTemplate } from "@/lib/intake/types";

const TEMPLATE: IntakeTemplate = {
  sections: [
    {
      key: "demographics",
      label: "Demographics",
      fields: [
        { key: "legal_name", type: "text", label: "Legal Name", required: true },
        { key: "date_of_birth", type: "date", label: "DOB", required: true },
        {
          key: "sex",
          type: "select",
          label: "Sex",
          required: true,
          options: ["female", "male", "intersex"],
        },
      ],
    },
    {
      key: "hpi",
      label: "HPI",
      fields: [{ key: "severity", type: "number", label: "Severity", required: false }],
    },
    {
      key: "pmh",
      label: "PMH",
      fields: [
        {
          key: "problems",
          type: "group",
          label: "Problems",
          required: false,
          code_binding: "icd10",
        },
      ],
    },
    {
      key: "allergies",
      label: "Allergies",
      fields: [{ key: "nkda", type: "boolean", label: "NKDA", required: false }],
    },
    {
      key: "consents",
      label: "Consents",
      fields: [{ key: "consent_to_treat", type: "boolean", label: "Consent", required: true }],
    },
    {
      key: "custom",
      label: "Custom",
      fields: [{ key: "widget", type: "future_widget", label: "Widget", required: false }],
    },
  ],
};

describe("validateResponsesAgainstTemplate", () => {
  it("accepts well-formed responses and coerces numeric strings to numbers", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, {
      demographics: { legal_name: "Jane Doe", date_of_birth: "1990-05-01", sex: "female" },
      hpi: { severity: "7" },
      pmh: {
        problems: [{ coded: { code: "E11.9", display: "T2DM", system: "icd10" }, detail: "" }],
      },
      allergies: { nkda: true },
      consents: { consent_to_treat: true },
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.coerced.hpi.severity).toBe(7); // "7" -> 7
    expect(r.coerced.allergies.nkda).toBe(true);
  });

  it("rejects an unknown section key (junk section)", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, { not_a_section: { x: 1 } });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("unknown section: not_a_section");
  });

  it("rejects an unknown field key within a known section", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, {
      demographics: { legal_name: "A", bogus: 1 },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("unknown field: demographics.bogus"))).toBe(true);
  });

  it("rejects a select value not in the declared options", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, { demographics: { sex: "other" } });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("not an allowed option"))).toBe(true);
  });

  it("rejects a non-numeric number field", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, { hpi: { severity: "not-a-number" } });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("expected a number"))).toBe(true);
  });

  it("rejects a non-boolean boolean field", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, { allergies: { nkda: "yes" } });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("expected a boolean"))).toBe(true);
  });

  it("rejects a malformed date", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, {
      demographics: { date_of_birth: "05/01/1990" },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("ISO date"))).toBe(true);
  });

  it("rejects a malformed coded group row", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, {
      pmh: { problems: [{ coded: { code: 123 } }] },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("malformed coded row"))).toBe(true);
  });

  it("accepts a bare-boolean consent (the FM seed shape) and the object form", () => {
    const bare = validateResponsesAgainstTemplate(TEMPLATE, {
      consents: { consent_to_treat: true },
    });
    expect(bare.valid).toBe(true);
    const obj = validateResponsesAgainstTemplate(TEMPLATE, {
      consents: {
        consent_to_treat: {
          value: true,
          at: "2026-07-08T00:00:00Z",
          template_version: 1,
        } as unknown,
      },
    });
    expect(obj.valid).toBe(true);
  });

  it("drops empty optional scalars from the coerced output", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, {
      hpi: { severity: "" },
      demographics: { sex: "" },
    });
    expect(r.valid).toBe(true);
    expect("severity" in r.coerced.hpi).toBe(false);
    expect("sex" in r.coerced.demographics).toBe(false);
  });

  it("passes an unknown/forward-compat field type through unchanged", () => {
    const r = validateResponsesAgainstTemplate(TEMPLATE, {
      custom: { widget: { anything: [1, 2, 3] } },
    });
    expect(r.valid).toBe(true);
    expect(r.coerced.custom.widget).toEqual({ anything: [1, 2, 3] });
  });
});
