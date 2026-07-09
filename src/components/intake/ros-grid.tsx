"use client";

// 14-system Review of Systems grid. Each row: positive / negative + optional
// note. Value is keyed by system: { [system]: { finding, note } }, mapping onto
// ros_responses rows at reconciliation. The system list is the standard 14 (also
// the ros_responses.system CHECK domain) -- a clinical standard, not specialty
// logic; a template with no ros_grid field never renders it.

import { cn } from "@/lib/utils";
import type { RosValue, RosFinding } from "@/lib/intake/types";
import type { FieldComponentProps } from "./types";
import { TextControl } from "./controls";

const SYSTEMS: { key: string; label: string }[] = [
  { key: "constitutional", label: "Constitutional" },
  { key: "eyes", label: "Eyes" },
  { key: "ent", label: "ENT" },
  { key: "cardiovascular", label: "Cardiovascular" },
  { key: "respiratory", label: "Respiratory" },
  { key: "gi", label: "Gastrointestinal" },
  { key: "gu", label: "Genitourinary" },
  { key: "musculoskeletal", label: "Musculoskeletal" },
  { key: "integumentary", label: "Integumentary" },
  { key: "neurological", label: "Neurological" },
  { key: "psychiatric", label: "Psychiatric" },
  { key: "endocrine", label: "Endocrine" },
  { key: "heme_lymphatic", label: "Heme / Lymphatic" },
  { key: "allergic_immunologic", label: "Allergic / Immunologic" },
];

const FINDINGS: RosFinding[] = ["negative", "positive"];

export function RosGridField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  const grid = (value as RosValue | null) ?? {};

  const setFinding = (system: string, finding: RosFinding) => {
    const current = grid[system] ?? { finding: null };
    const next: RosValue = {
      ...grid,
      [system]: { ...current, finding: current.finding === finding ? null : finding },
    };
    onChange(next);
  };
  const setNote = (system: string, note: string) => {
    const current = grid[system] ?? { finding: null };
    onChange({ ...grid, [system]: { ...current, note } });
  };

  return (
    <fieldset className="space-y-3" data-testid={idBase}>
      {field.label ? (
        <legend className="text-sm font-medium text-foreground">{field.label}</legend>
      ) : null}
      <ul className="space-y-2">
        {SYSTEMS.map((sys) => {
          const row = grid[sys.key] ?? { finding: null };
          return (
            <li
              key={sys.key}
              className="rounded-[var(--cs-radius-btn)] border border-border bg-card p-3"
              data-testid={`${idBase}-${sys.key}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base text-foreground">{sys.label}</span>
                <div className="flex gap-2">
                  {FINDINGS.map((f) => {
                    const on = row.finding === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        disabled={disabled}
                        onClick={() => setFinding(sys.key, f)}
                        data-testid={`${idBase}-${sys.key}-${f}`}
                        className={cn(
                          "min-h-11 rounded-[var(--cs-radius-pill)] border px-4 text-sm capitalize",
                          on
                            ? f === "positive"
                              ? "border-[var(--cs-coral)] bg-[var(--cs-coral)] text-white"
                              : "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
              {row.finding === "positive" ? (
                <TextControl
                  type="text"
                  className="mt-2"
                  data-testid={`${idBase}-${sys.key}-note`}
                  value={row.note ?? ""}
                  placeholder="Details (optional)"
                  disabled={disabled}
                  onChange={(e) => setNote(sys.key, e.target.value)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
