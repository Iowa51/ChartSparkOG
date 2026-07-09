// Pure-logic unit tests: template parsing, conditional visibility, and required
// enforcement. These cover the "definition JSONB -> plan" split with no React.

import { describe, it, expect } from "vitest";
import { parseTemplate, safeParseTemplate } from "@/lib/intake/template";
import {
  evaluateConditional,
  visibleSections,
  missingRequired,
  isNkdaActive,
  getResponseAt,
} from "@/lib/intake/logic";
import type { IntakeResponses } from "@/lib/intake/types";
import {
  SMOKE_DEFINITION,
  CONDITIONAL_DEFINITION,
  ALLERGIES_DEFINITION,
} from "@/components/intake/__tests__/fixtures";

describe("parseTemplate", () => {
  it("parses the seed _smoke_test definition (non-family-medicine)", () => {
    const t = parseTemplate(SMOKE_DEFINITION);
    expect(t.sections.map((s) => s.key)).toEqual(["alpha", "bravo", "charlie"]);
    expect(t.sections[0].fields[0]).toMatchObject({ key: "field_one", type: "text" });
  });

  it("defaults required=false and label when omitted", () => {
    const t = parseTemplate({ sections: [{ key: "s", fields: [{ key: "f", type: "text" }] }] });
    expect(t.sections[0].fields[0].required).toBe(false);
    expect(t.sections[0].label).toBe("");
  });

  it("rejects a definition with no sections", () => {
    const res = safeParseTemplate({ sections: [] });
    expect(res.success).toBe(false);
  });

  it("rejects a non-object definition", () => {
    expect(safeParseTemplate(null).success).toBe(false);
    expect(safeParseTemplate("nope").success).toBe(false);
  });

  it("preserves an unknown field type (renderer falls back)", () => {
    const t = parseTemplate({ sections: [{ key: "s", fields: [{ key: "f", type: "mystery" }] }] });
    expect(t.sections[0].fields[0].type).toBe("mystery");
  });
});

describe("getResponseAt / evaluateConditional", () => {
  const responses: IntakeResponses = { demographics: { sex: "female" } };

  it("reads a dotted path", () => {
    expect(getResponseAt(responses, "demographics.sex")).toBe("female");
    expect(getResponseAt(responses, "demographics.missing")).toBeUndefined();
  });

  it("a missing conditional is always visible", () => {
    expect(evaluateConditional(undefined, {})).toBe(true);
  });

  it("matches on equality", () => {
    expect(evaluateConditional({ field: "demographics.sex", equals: "female" }, responses)).toBe(
      true,
    );
    expect(evaluateConditional({ field: "demographics.sex", equals: "male" }, responses)).toBe(
      false,
    );
  });

  it("normalizes types (boolean/number vs string)", () => {
    expect(evaluateConditional({ field: "a.b", equals: true }, { a: { b: true } })).toBe(true);
    expect(evaluateConditional({ field: "a.b", equals: 3 }, { a: { b: 3 } })).toBe(true);
  });
});

describe("visibleSections (conditional OB/GYN)", () => {
  const template = parseTemplate(CONDITIONAL_DEFINITION);

  it("hides the OB/GYN section by default", () => {
    const keys = visibleSections(template, {}).map((s) => s.key);
    expect(keys).toEqual(["demographics", "consents"]);
  });

  it("shows OB/GYN when sex=female", () => {
    const keys = visibleSections(template, { demographics: { sex: "female" } }).map((s) => s.key);
    expect(keys).toEqual(["demographics", "obgyn", "consents"]);
  });
});

describe("missingRequired", () => {
  const template = parseTemplate(CONDITIONAL_DEFINITION);

  it("reports required fields that are empty", () => {
    const missing = missingRequired(template, {});
    const fields = missing.map((m) => `${m.section}.${m.field}`);
    expect(fields).toContain("demographics.legal_name");
    expect(fields).toContain("demographics.sex");
    // consent (required boolean) is unchecked -> missing
    expect(fields).toContain("consents.consent_to_treat");
    // OB/GYN is hidden -> its required lmp is NOT demanded
    expect(fields).not.toContain("obgyn.lmp");
  });

  it("demands the conditional section required field once it is visible", () => {
    const missing = missingRequired(template, { demographics: { sex: "female" } });
    expect(missing.map((m) => `${m.section}.${m.field}`)).toContain("obgyn.lmp");
  });

  it("passes when all visible required fields are satisfied", () => {
    const responses: IntakeResponses = {
      demographics: { legal_name: "Jane", sex: "male" },
      consents: {
        consent_to_treat: { value: true, at: "2026-07-07T00:00:00Z", template_version: 1 },
      },
    };
    expect(missingRequired(template, responses)).toHaveLength(0);
  });
});

describe("NKDA suppression", () => {
  const template = parseTemplate(ALLERGIES_DEFINITION);

  it("isNkdaActive is true only when the nkda boolean is checked", () => {
    expect(isNkdaActive(template.sections[0], {})).toBe(false);
    expect(isNkdaActive(template.sections[0], { allergies: { nkda: true } })).toBe(true);
  });

  it("exempts a required group when NKDA is checked", () => {
    // Without NKDA, the required allergies group is missing.
    expect(missingRequired(template, {}).some((m) => m.field === "allergies")).toBe(true);
    // With NKDA checked, the group requirement is waived.
    const withNkda: IntakeResponses = { allergies: { nkda: true } };
    expect(missingRequired(template, withNkda).some((m) => m.field === "allergies")).toBe(false);
  });
});
