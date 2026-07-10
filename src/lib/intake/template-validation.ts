// Template-AWARE validation for the portal intake write path (Sprint 2 / P3).
//
// The boundary schema (responses-schema.ts) is template-INDEPENDENT: it bounds
// size/shape/keys so the HTTP boundary is safe before any DB read. This layer
// runs AFTER the portal session loads the SELECTED template from the DB and:
//   * ALLOWLISTS response keys against the template definition — a section or
//     field key not declared by the template is rejected (junk keys blocked).
//   * COERCES / validates each value per the field's declared type, so what we
//     persist to intake_submissions.responses is clean, typed data (numbers not
//     numeric-strings, in-range selects, well-formed coded rows).
//
// It NEVER widens what the boundary already accepted — it only narrows. Unknown
// field TYPES are passed through leniently (the engine itself does not constrain
// field.type to the FieldType union — see types.ts), so a forward-compat
// template renders and validates without a code change.

import type { IntakeField, IntakeSection, IntakeTemplate } from "./types";

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  /** The coerced, allowlisted responses — safe to persist. Present iff valid. */
  coerced: Record<string, Record<string, unknown>>;
}

type CoerceResult = { ok: true; value: unknown; drop?: boolean } | { ok: false; error: string };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function isCodedValue(v: unknown): boolean {
  if (v === null) return true; // cleared coded field
  if (typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const codeOk = o.code === null || typeof o.code === "string";
  const displayOk = o.display === undefined || typeof o.display === "string";
  const systemOk = o.system === undefined || typeof o.system === "string";
  return codeOk && displayOk && systemOk;
}

// Coerce/validate one value against one field's declared type. `drop:true` means
// the value is an empty/unanswered scalar and should be omitted from the output.
function coerceField(field: IntakeField, value: unknown): CoerceResult {
  const type = field.type;
  const at = `${field.key}`;

  switch (type) {
    case "text":
    case "textarea": {
      if (value === "" || value === undefined || value === null)
        return { ok: true, value: "", drop: value == null };
      if (typeof value !== "string") return { ok: false, error: `${at}: expected text` };
      return { ok: true, value };
    }
    case "number": {
      if (value === "" || value === undefined || value === null)
        return { ok: true, value: undefined, drop: true };
      const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
      if (!Number.isFinite(n)) return { ok: false, error: `${at}: expected a number` };
      return { ok: true, value: n };
    }
    case "boolean":
    case "consent": {
      // consents in the FM seed are bare booleans; the ConsentValue object form
      // (value/at/template_version) is also accepted.
      if (typeof value === "boolean") return { ok: true, value };
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof (value as Record<string, unknown>).value === "boolean"
      ) {
        return { ok: true, value };
      }
      if (value === undefined || value === null) return { ok: true, value: false, drop: true };
      return { ok: false, error: `${at}: expected a boolean` };
    }
    case "select": {
      if (value === "" || value === undefined || value === null)
        return { ok: true, value: undefined, drop: true };
      if (typeof value !== "string") return { ok: false, error: `${at}: expected a choice` };
      if (field.options && field.options.length > 0 && !field.options.includes(value)) {
        return { ok: false, error: `${at}: "${value}" is not an allowed option` };
      }
      return { ok: true, value };
    }
    case "multiselect": {
      if (value === undefined || value === null) return { ok: true, value: [], drop: true };
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        return { ok: false, error: `${at}: expected a list of choices` };
      }
      if (field.options && field.options.length > 0) {
        const bad = value.find((v) => !field.options!.includes(v as string));
        if (bad !== undefined)
          return { ok: false, error: `${at}: "${bad}" is not an allowed option` };
      }
      return { ok: true, value };
    }
    case "date": {
      if (value === "" || value === undefined || value === null)
        return { ok: true, value: undefined, drop: true };
      if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
        return { ok: false, error: `${at}: expected an ISO date (YYYY-MM-DD)` };
      }
      return { ok: true, value };
    }
    case "coded_search": {
      if (!isCodedValue(value)) return { ok: false, error: `${at}: malformed coded value` };
      return { ok: true, value };
    }
    case "group": {
      if (value === undefined || value === null) return { ok: true, value: [], drop: true };
      if (!Array.isArray(value)) return { ok: false, error: `${at}: expected a list` };
      for (const row of value) {
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
          return { ok: false, error: `${at}: malformed group row` };
        }
        const r = row as Record<string, unknown>;
        if (!isCodedValue(r.coded ?? null))
          return { ok: false, error: `${at}: malformed coded row` };
        if (r.detail !== undefined && typeof r.detail !== "string") {
          return { ok: false, error: `${at}: group detail must be text` };
        }
      }
      return { ok: true, value };
    }
    default:
      // Unknown / forward-compat type (oldcarts, ros_grid, or a future type):
      // the engine renders these leniently, so accept the bounded value as-is.
      return { ok: true, value };
  }
}

/**
 * Validate + coerce `responses` against the selected `template`. Rejects any
 * section/field key not declared by the template and any value that fails its
 * declared field type. Returns the coerced, allowlisted responses when valid.
 */
export function validateResponsesAgainstTemplate(
  template: IntakeTemplate,
  responses: Record<string, Record<string, unknown>>,
): TemplateValidationResult {
  const errors: string[] = [];
  const coerced: Record<string, Record<string, unknown>> = {};

  const sectionByKey = new Map<string, IntakeSection>(template.sections.map((s) => [s.key, s]));

  for (const [sectionKey, sectionValue] of Object.entries(responses)) {
    const section = sectionByKey.get(sectionKey);
    if (!section) {
      errors.push(`unknown section: ${sectionKey}`);
      continue;
    }
    if (sectionValue === null || typeof sectionValue !== "object" || Array.isArray(sectionValue)) {
      errors.push(`${sectionKey}: expected an object of fields`);
      continue;
    }
    const fieldByKey = new Map<string, IntakeField>(section.fields.map((f) => [f.key, f]));
    const outSection: Record<string, unknown> = {};

    for (const [fieldKey, raw] of Object.entries(sectionValue as Record<string, unknown>)) {
      const field = fieldByKey.get(fieldKey);
      if (!field) {
        errors.push(`unknown field: ${sectionKey}.${fieldKey}`);
        continue;
      }
      const result = coerceField(field, raw);
      if (!result.ok) {
        errors.push(`${sectionKey}.${result.error}`);
        continue;
      }
      if (!result.drop) outSection[fieldKey] = result.value;
    }
    coerced[sectionKey] = outSection;
  }

  return { valid: errors.length === 0, errors, coerced };
}
