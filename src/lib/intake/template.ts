// Parse + validate the intake_templates `definition` JSONB into a typed
// IntakeTemplate. Zod at the boundary (global rule): every template that
// reaches the renderer is validated first. Unknown field types are preserved
// (the renderer degrades them to a safe fallback), and unknown object keys are
// stripped for forward-compatibility rather than rejected.

import { z } from "zod";
import type { IntakeTemplate } from "./types";

const conditionalSchema = z
  .object({
    field: z.string().min(1),
    equals: z.union([z.string(), z.number(), z.boolean()]),
  })
  .strip();

const fieldSchema = z
  .object({
    key: z.string().min(1),
    type: z.string().min(1),
    label: z.string().default(""),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    code_binding: z.string().optional(),
    placeholder: z.string().optional(),
    help: z.string().optional(),
    conditional: conditionalSchema.optional(),
  })
  .strip();

const sectionSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().default(""),
    conditional: conditionalSchema.optional(),
    fields: z.array(fieldSchema).default([]),
  })
  .strip();

const templateSchema = z
  .object({
    sections: z.array(sectionSchema).min(1),
  })
  .strip();

export type TemplateParseResult =
  | { success: true; template: IntakeTemplate }
  | { success: false; errors: string[] };

/**
 * Validate a definition JSONB. Never throws.
 */
export function safeParseTemplate(definition: unknown): TemplateParseResult {
  const result = templateSchema.safeParse(definition);
  if (result.success) {
    return { success: true, template: result.data as IntakeTemplate };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

/**
 * Validate a definition JSONB, throwing on invalid input. Use where an invalid
 * template is a programmer/data error (e.g. after a trusted DB read).
 */
export function parseTemplate(definition: unknown): IntakeTemplate {
  return templateSchema.parse(definition) as IntakeTemplate;
}
