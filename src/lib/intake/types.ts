// Template-engine types (Sprint 1 / P2). These describe the intake_templates
// `definition` JSONB contract:
//   { sections: [ { key, label, conditional?, fields: [ { key, type, label,
//     required, options?, code_binding?, ... } ] } ] }
// The renderer is 100% data-driven over these types -- ZERO specialty logic.

// Field types the renderer can render. `field.type` is stored as a raw string
// (see IntakeField) so an unknown type degrades to a safe fallback rather than
// breaking the whole form; this union names the ones with a component.
export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "select"
  | "multiselect"
  | "boolean"
  | "coded_search"
  | "group"
  | "oldcarts"
  | "ros_grid"
  | "consent";

export const KNOWN_FIELD_TYPES: ReadonlySet<string> = new Set<FieldType>([
  "text",
  "textarea",
  "date",
  "number",
  "select",
  "multiselect",
  "boolean",
  "coded_search",
  "group",
  "oldcarts",
  "ros_grid",
  "consent",
]);

// Coding system a coded_search / group field binds to. Drives which terminology
// source the picker queries. 'allergen' uses the curated in-app allergen list.
export type CodeBinding = "icd10" | "snomed" | "rxnorm" | "cvx" | "allergen";

// Show a section/field only when another field equals a value. `field` is a
// dotted path "sectionKey.fieldKey" (e.g. the seed's "demographics.sex").
export interface IntakeConditional {
  field: string;
  equals: string | number | boolean;
}

export interface IntakeField {
  key: string;
  type: string; // raw type; render maps known types, falls back otherwise
  label: string;
  required: boolean;
  options?: string[]; // select / multiselect
  code_binding?: string; // coded_search / group
  placeholder?: string;
  help?: string;
  conditional?: IntakeConditional; // optional field-level conditional
}

export interface IntakeSection {
  key: string;
  label: string;
  conditional?: IntakeConditional;
  fields: IntakeField[];
}

export interface IntakeTemplate {
  sections: IntakeSection[];
}

// Responses are keyed responses[sectionKey][fieldKey]. This maps 1:1 to
// intake_submissions.responses JSONB.
export type IntakeResponses = Record<string, Record<string, unknown>>;

// A coded value captured by a picker. `code` is null for a free-text fallback
// (patients are never blocked; code-less rows are flagged for P3 reconciliation).
export interface CodedValue {
  code: string | null;
  display: string;
  system: string;
}

// One coded_search / group row: a coded value plus optional free-text detail.
export interface CodedRow {
  coded: CodedValue | null;
  detail?: string;
}

// A consent field value: the checkbox + the moment + the template version it
// was captured against (medico-legal record).
export interface ConsentValue {
  value: boolean;
  at: string | null;
  template_version: number | null;
}

export type RosFinding = "positive" | "negative";
export type RosValue = Record<string, { finding: RosFinding | null; note?: string }>;
