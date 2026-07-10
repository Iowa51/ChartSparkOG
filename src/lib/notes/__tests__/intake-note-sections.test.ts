import { describe, it, expect } from "vitest";
import { buildIntakeNoteDraft } from "@/lib/notes/intake-note-sections";

const SNAPSHOT = {
  submission_id: "s1",
  signed_at: "2026-07-08T12:00:00Z",
  responses: {
    psh: { surgeries: [{ coded: { code: null, display: "Appendectomy" }, detail: "" }] },
    family_history: {
      family_history: [{ coded: { code: null, display: "Hypertension" }, relative: "mother" }],
    },
    social_history: {
      tobacco_status: "former",
      pack_years: 10,
      alcohol_audit_c: 3,
      occupation: "Teacher",
    },
  },
  problems: [
    { id: "p1", code: "E11.9", code_system: "icd10", display: "Type 2 diabetes", reconciled: true },
  ],
  medications: [{ id: "m1", name: "Metformin", strength: "500 mg", rxnorm_code: "860975" }],
  allergies: [
    {
      id: "a1",
      allergen_display: "Penicillin",
      reaction: "hives",
      severity: "moderate",
      nkda: false,
    },
  ],
  ros: [
    { system: "cardiovascular", finding: "positive" },
    { system: "respiratory", finding: "negative" },
  ],
};

describe("buildIntakeNoteDraft", () => {
  it("builds every structured section from the snapshot", () => {
    const draft = buildIntakeNoteDraft(SNAPSHOT);
    expect(draft.sections.pmh).toContain("Type 2 diabetes (ICD10: E11.9)");
    expect(draft.sections.psh).toContain("Appendectomy");
    expect(draft.sections.medications).toContain("Metformin 500 mg");
    expect(draft.sections.medications).toContain("RxNorm 860975");
    expect(draft.sections.allergies).toContain("Penicillin — hives (moderate)");
    expect(draft.sections.familyHistory).toContain("mother: Hypertension");
    expect(draft.sections.socialHistory).toContain("Tobacco: former (10 pack-years)");
    expect(draft.sections.socialHistory).toContain("Alcohol (AUDIT-C): 3");
    expect(draft.sections.ros).toContain("Positive: cardiovascular");
    expect(draft.sections.ros).toContain("Negative: respiratory");
  });

  it("renders content as markdown with section headings and pre-fills SOAP fields", () => {
    const draft = buildIntakeNoteDraft(SNAPSHOT);
    expect(draft.content).toContain("## Past Medical History");
    expect(draft.content).toContain("## Review of Systems");
    expect(draft.subjective).toContain("## Past Surgical History");
    expect(draft.subjective).not.toContain("## Medications"); // meds go to content, not subjective
    expect(draft.assessment).toContain("Problem list:");
    expect(draft.assessment).toContain("Type 2 diabetes");
  });

  it("renders NKDA when any allergy row is nkda", () => {
    const draft = buildIntakeNoteDraft({ ...SNAPSHOT, allergies: [{ nkda: true }] });
    expect(draft.sections.allergies).toBe("No known drug allergies (NKDA)");
  });

  it("excludes provider-REJECTED first-class rows from the note draft (P3-CRIT-2)", () => {
    // The signed snapshot now records rejected rows (disposition, not omission);
    // the clinical note must show only the accepted clinical picture.
    const draft = buildIntakeNoteDraft({
      ...SNAPSHOT,
      problems: [
        {
          id: "p1",
          code: "E11.9",
          code_system: "icd10",
          display: "Type 2 diabetes",
          reconciled: true,
          rejected: false,
        },
        {
          id: "p2",
          code: "",
          display: "Not actually a problem",
          reconciled: false,
          rejected: true,
        },
      ],
      medications: [
        { id: "m1", name: "Metformin", strength: "500 mg", rxnorm_code: "860975", rejected: false },
        { id: "m2", name: "Rejected med", rejected: true },
      ],
    });
    expect(draft.sections.pmh).toContain("Type 2 diabetes");
    expect(draft.sections.pmh).not.toContain("Not actually a problem");
    expect(draft.sections.medications).toContain("Metformin");
    expect(draft.sections.medications).not.toContain("Rejected med");
  });

  it("returns empty sections + empty content for an empty snapshot", () => {
    const draft = buildIntakeNoteDraft({});
    expect(draft.content).toBe("");
    expect(draft.subjective).toBe("");
    expect(draft.assessment).toBe("");
    expect(draft.sections.pmh).toBe("");
  });

  it("tolerates a null / non-object snapshot", () => {
    expect(buildIntakeNoteDraft(null).content).toBe("");
    expect(buildIntakeNoteDraft("garbage").content).toBe("");
  });
});
