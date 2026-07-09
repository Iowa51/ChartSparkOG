// Boundary schema for the portal intake write body (Sprint 1 / P2-FIXES,
// CODEX-REVIEW-P2 P2-API-1). Hardens the previously shape-only
// `z.record(z.string(), z.record(z.string(), z.unknown()))` with:
//   * strict, bounded section/field KEY format (rejects junk keys)
//   * caps on section/field counts, string length, array length, nesting depth,
//     and total node count (bounds payload size + blocks deep/pathological JSON)
//   * on final submit, every consent-shaped value must carry its template_version
//     (the version the decision was made against); an AFFIRMED consent must
//     additionally carry the agreement timestamp `at`. A DECLINED consent has no
//     agreement instant (the client sends at:null by design; submitted_at records
//     when the decline was finalized), so `at` is not required for value:false.
//
// These checks are TEMPLATE-INDEPENDENT: they make the HTTP boundary safe on
// their own. TEMPLATE-AWARE validation (allowlisting keys against the SELECTED
// template's sections/fields + per-field-type coercion) runs at the write path
// once the portal session loads the template from the DB -- that path is still
// the fail-closed stub in src/app/api/portal/intake/route.ts (see its header
// and SCHEMA-NOTES "Sprint 1 / P2").

import { z } from "zod";

// Structural limits. Deliberately generous vs. a real FM intake, but finite:
// they exist to reject hostile/malformed bodies, not to constrain legitimate
// forms. maxTotalNodes bounds the whole tree even if per-level caps are met.
export const INTAKE_RESPONSE_LIMITS = {
  maxSections: 100,
  maxKeysPerObject: 300,
  maxStringLength: 10_000,
  maxArrayItems: 500,
  maxDepth: 6,
  maxTotalNodes: 20_000,
} as const;

// Section and field keys mirror template keys: identifier-like, short.
const KEY_RE = /^[A-Za-z0-9_]{1,64}$/;

const sectionKeySchema = z.string().regex(KEY_RE, "invalid section key");
const fieldKeySchema = z.string().regex(KEY_RE, "invalid field key");

// responses[sectionKey][fieldKey] = arbitrary (bounded below) value.
const rawResponsesSchema = z.record(sectionKeySchema, z.record(fieldKeySchema, z.unknown()));

/** Recursively bound a response value; pushes messages onto `errors`. */
function boundValue(
  value: unknown,
  depth: number,
  state: { nodes: number },
  path: string,
  errors: string[],
): void {
  if (errors.length > 0) return; // fail fast; one message is enough to reject
  state.nodes += 1;
  if (state.nodes > INTAKE_RESPONSE_LIMITS.maxTotalNodes) {
    errors.push(`${path}: payload has too many values`);
    return;
  }
  if (depth > INTAKE_RESPONSE_LIMITS.maxDepth) {
    errors.push(`${path}: nesting too deep`);
    return;
  }
  if (typeof value === "string") {
    if (value.length > INTAKE_RESPONSE_LIMITS.maxStringLength) {
      errors.push(`${path}: string too long`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > INTAKE_RESPONSE_LIMITS.maxArrayItems) {
      errors.push(`${path}: too many array items`);
      return;
    }
    for (let i = 0; i < value.length; i += 1) {
      boundValue(value[i], depth + 1, state, `${path}[${i}]`, errors);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length > INTAKE_RESPONSE_LIMITS.maxKeysPerObject) {
      errors.push(`${path}: too many keys`);
      return;
    }
    for (const k of keys) {
      if (k.length > 64) {
        errors.push(`${path}.${k}: key too long`);
        return;
      }
      boundValue((value as Record<string, unknown>)[k], depth + 1, state, `${path}.${k}`, errors);
    }
  }
  // number / boolean / null: leaves, nothing more to bound.
}

// A consent value is recognized structurally as an object carrying a boolean
// `value` (raw boolean fields store a bare boolean, never an object -- so this
// never false-matches a checkbox field).
function isConsentShaped(
  v: unknown,
): v is { value: boolean; at?: unknown; template_version?: unknown } {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    typeof (v as Record<string, unknown>).value === "boolean"
  );
}

const responsesSchema = rawResponsesSchema.superRefine((responses, ctx) => {
  const sectionKeys = Object.keys(responses);
  if (sectionKeys.length > INTAKE_RESPONSE_LIMITS.maxSections) {
    ctx.addIssue({ code: "custom", message: "too many sections" });
    return;
  }
  const errors: string[] = [];
  const state = { nodes: 0 };
  for (const sk of sectionKeys) {
    boundValue((responses as Record<string, unknown>)[sk], 1, state, sk, errors);
    if (errors.length > 0) break;
  }
  for (const message of errors) {
    ctx.addIssue({ code: "custom", message });
  }
});

/**
 * Portal intake write body. `submit=true` is the final, form-locking write.
 *
 * Consent enforcement on submit (medico-legal record; DELTA-API-1):
 *   - EVERY consent-shaped value (affirmed OR declined) must carry its
 *     `template_version` (a number) — the version of the consent the patient
 *     decided against. A declined consent is part of the legal record too, so it
 *     is version-stamped, not silently accepted.
 *   - An AFFIRMED consent (value:true) must additionally carry `at` (the
 *     agreement timestamp). A DECLINED consent (value:false) has no agreement
 *     instant — the client sends at:null by design and the submission's
 *     submitted_at records when the decline was finalized — so `at` is not
 *     required for declines. (Product decision: declines are version-stamped,
 *     not time-stamped.)
 *
 * Draft saves (submit=false) allow partial consents so save-and-resume is not
 * blocked.
 */
export const IntakeWriteSchema = z
  .object({
    template_id: z.string().uuid().nullable(),
    submission_id: z.string().uuid().nullable(),
    responses: responsesSchema,
    submit: z.boolean(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (!body.submit) return;
    for (const [sk, section] of Object.entries(body.responses)) {
      if (section === null || typeof section !== "object") continue;
      for (const [fk, value] of Object.entries(section as Record<string, unknown>)) {
        if (!isConsentShaped(value)) continue;
        // template_version is required for every consent decision (affirmed or
        // declined) — it anchors the decision to a specific consent version.
        if (typeof value.template_version !== "number") {
          ctx.addIssue({
            code: "custom",
            path: ["responses", sk, fk, "template_version"],
            message: "consent requires a template_version on submit",
          });
        }
        // `at` (agreement timestamp) is required only for an AFFIRMED consent.
        if (value.value === true && (typeof value.at !== "string" || value.at.trim() === "")) {
          ctx.addIssue({
            code: "custom",
            path: ["responses", sk, fk, "at"],
            message: "consent requires a timestamp on submit",
          });
        }
      }
    }
  });

export type IntakeWriteBody = z.infer<typeof IntakeWriteSchema>;
