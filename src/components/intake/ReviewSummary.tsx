"use client";

// Read-only review-before-submit screen. Renders every visible field's captured
// value in human-readable form, grouped by section. Generic over field types.

import type {
  IntakeTemplate,
  IntakeResponses,
  IntakeField,
  CodedRow,
  CodedValue,
  ConsentValue,
  RosValue,
} from "@/lib/intake/types";
import { visibleSections, visibleFields, isNkdaActive } from "@/lib/intake/logic";

function summarize(field: IntakeField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  switch (field.type) {
    case "boolean":
      return value === true ? "Yes" : "No";
    case "consent": {
      const c = value as ConsentValue;
      return c.value
        ? `Agreed${c.at ? ` (${new Date(c.at).toLocaleDateString()})` : ""}`
        : "Not agreed";
    }
    case "multiselect":
      return Array.isArray(value) ? (value as string[]).join(", ") || "—" : "—";
    case "coded_search": {
      const c = value as CodedValue;
      return c.code ? `${c.display} [${c.system}:${c.code}]` : `${c.display} (free text)`;
    }
    case "group": {
      const rows = value as CodedRow[];
      if (!Array.isArray(rows) || rows.length === 0) return "None";
      return rows
        .map((r) => {
          const name = r.coded?.display ?? "(unspecified)";
          const code = r.coded?.code ? ` [${r.coded.system}:${r.coded.code}]` : " (free text)";
          return `${name}${code}${r.detail ? ` — ${r.detail}` : ""}`;
        })
        .join("; ");
    }
    case "ros_grid": {
      const grid = value as RosValue;
      const entries = Object.entries(grid).filter(([, v]) => v.finding);
      if (entries.length === 0) return "None reported";
      return entries
        .map(([sys, v]) => `${sys}: ${v.finding}${v.note ? ` (${v.note})` : ""}`)
        .join("; ");
    }
    default:
      return String(value);
  }
}

export function ReviewSummary({
  template,
  responses,
}: {
  template: IntakeTemplate;
  responses: IntakeResponses;
}) {
  return (
    <div className="space-y-6" data-testid="intake-review">
      {visibleSections(template, responses).map((section) => {
        const nkda = isNkdaActive(section, responses);
        return (
          <section
            key={section.key}
            className="rounded-[var(--cs-radius-card)] border border-border bg-card p-4"
          >
            <h3 className="mb-3 text-base font-semibold text-foreground">{section.label}</h3>
            <dl className="space-y-2">
              {visibleFields(section, responses).map((field) => {
                const suppressed = nkda && field.type === "group";
                return (
                  <div key={field.key} className="grid grid-cols-1 gap-0.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">{field.label || field.key}</dt>
                    <dd
                      className="text-sm text-foreground sm:col-span-2"
                      data-testid={`review-${section.key}.${field.key}`}
                    >
                      {suppressed
                        ? "N/A (no known drug allergies)"
                        : summarize(field, responses[section.key]?.[field.key])}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
