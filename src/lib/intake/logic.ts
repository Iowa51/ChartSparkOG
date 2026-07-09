// Pure form logic over an IntakeTemplate + responses: conditional visibility,
// required-field enforcement, and small value helpers. No React. This is the
// heart of the "definition JSONB -> plan" split and is unit-tested directly.

import type {
  IntakeTemplate,
  IntakeSection,
  IntakeField,
  IntakeResponses,
  IntakeConditional,
} from "./types";

/** Read a dotted "sectionKey.fieldKey" path out of responses. */
export function getResponseAt(responses: IntakeResponses, path: string): unknown {
  const dot = path.indexOf(".");
  if (dot <= 0) return undefined;
  const section = path.slice(0, dot);
  const field = path.slice(dot + 1);
  return responses[section]?.[field];
}

function normalize(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

/** A missing conditional evaluates to visible=true (no gate). */
export function evaluateConditional(
  conditional: IntakeConditional | undefined,
  responses: IntakeResponses,
): boolean {
  if (!conditional) return true;
  return normalize(getResponseAt(responses, conditional.field)) === normalize(conditional.equals);
}

export function visibleSections(
  template: IntakeTemplate,
  responses: IntakeResponses,
): IntakeSection[] {
  return template.sections.filter((s) => evaluateConditional(s.conditional, responses));
}

export function visibleFields(section: IntakeSection, responses: IntakeResponses): IntakeField[] {
  return section.fields.filter((f) => evaluateConditional(f.conditional, responses));
}

/** Reserved key: an `nkda` boolean set true suppresses sibling `group` fields. */
export const NKDA_KEY = "nkda";

export function isNkdaActive(section: IntakeSection, responses: IntakeResponses): boolean {
  const hasNkda = section.fields.some((f) => f.type === "boolean" && f.key === NKDA_KEY);
  return hasNkda && responses[section.key]?.[NKDA_KEY] === true;
}

function isEmptyValue(field: IntakeField, value: unknown): boolean {
  switch (field.type) {
    case "boolean":
      return value !== true; // a required checkbox/consent must be affirmatively checked
    case "consent":
      return (value as { value?: boolean } | null)?.value !== true;
    case "multiselect":
    case "group":
      return !Array.isArray(value) || value.length === 0;
    case "coded_search": {
      const display = (value as { display?: string } | null)?.display;
      return display === undefined || display === null || String(display).trim() === "";
    }
    case "number":
      return value === undefined || value === null || value === "";
    case "ros_grid":
      return value === undefined || value === null || Object.keys(value as object).length === 0;
    default:
      return value === undefined || value === null || String(value).trim() === "";
  }
}

export interface MissingField {
  section: string;
  field: string;
  label: string;
}

/**
 * Required-field violations across CURRENTLY VISIBLE sections/fields (a hidden
 * conditional section imposes no requirements). Fields suppressed by an active
 * NKDA flag are also exempt.
 */
export function missingRequired(
  template: IntakeTemplate,
  responses: IntakeResponses,
): MissingField[] {
  const missing: MissingField[] = [];
  for (const section of visibleSections(template, responses)) {
    const nkda = isNkdaActive(section, responses);
    for (const field of visibleFields(section, responses)) {
      if (!field.required) continue;
      if (nkda && field.type === "group") continue; // NKDA clears/blocks allergy rows
      if (isEmptyValue(field, responses[section.key]?.[field.key])) {
        missing.push({ section: section.key, field: field.key, label: field.label });
      }
    }
  }
  return missing;
}

export function isComplete(template: IntakeTemplate, responses: IntakeResponses): boolean {
  return missingRequired(template, responses).length === 0;
}
