"use client";

// Repeating coded group (meds list, problem list, allergy list, family history,
// ...). Each row is a coded picker (bound to field.code_binding) plus a free-
// text detail. Generic over any code_binding -- no specialty-specific row shape.

import { cn } from "@/lib/utils";
import type { CodedRow, CodedValue, IntakeField } from "@/lib/intake/types";
import type { FieldComponentProps } from "./types";
import { CodedSearchField } from "./coded-search";
import { TextControl } from "./controls";
import { CSButton } from "@/components/cs";

function asRows(value: unknown): CodedRow[] {
  return Array.isArray(value) ? (value as CodedRow[]) : [];
}

export function RepeatingGroupField({
  field,
  value,
  onChange,
  disabled,
  idBase,
}: FieldComponentProps) {
  const rows = asRows(value);

  const setRow = (index: number, next: CodedRow) => {
    onChange(rows.map((r, i) => (i === index ? next : r)));
  };
  const addRow = () => onChange([...rows, { coded: null, detail: "" }]);
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));

  // Pseudo-field so each row reuses the coded_search component unchanged.
  const codedField: IntakeField = {
    key: `${field.key}_row`,
    type: "coded_search",
    label: "",
    required: false,
    code_binding: field.code_binding,
    placeholder: "Search or add...",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {field.label}
          {field.required ? <span className="ml-0.5 text-[var(--cs-danger)]">*</span> : null}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid={`${idBase}-empty`}>
          None added.
        </p>
      ) : null}

      <ul className="space-y-3" data-testid={idBase}>
        {rows.map((row, index) => (
          <li
            key={index}
            className={cn(
              "space-y-2 rounded-[var(--cs-radius-card)] border border-border bg-card p-3",
              disabled && "opacity-60",
            )}
            data-testid={`${idBase}-row-${index}`}
          >
            <CodedSearchField
              field={codedField}
              value={row.coded}
              onChange={(coded) => setRow(index, { ...row, coded: coded as CodedValue | null })}
              disabled={disabled}
              idBase={`${idBase}-${index}-code`}
            />
            <TextControl
              type="text"
              data-testid={`${idBase}-${index}-detail`}
              value={row.detail ?? ""}
              placeholder="Details (dose, frequency, reaction, ...)"
              disabled={disabled}
              onChange={(e) => setRow(index, { ...row, detail: e.target.value })}
            />
            <button
              type="button"
              className="text-sm text-[var(--cs-danger)] underline"
              disabled={disabled}
              onClick={() => removeRow(index)}
              data-testid={`${idBase}-remove-${index}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <CSButton type="button" variant="secondary" size="sm" disabled={disabled} onClick={addRow}>
        + Add
      </CSButton>
    </div>
  );
}
