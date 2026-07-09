"use client";

// The type -> component registry: the single point where a field.type becomes a
// React control. ZERO specialty logic -- the renderer only knows field types,
// never field meanings. An unknown type degrades to a safe, non-blocking
// fallback so a template can never crash the form.

import type { FieldComponent, FieldComponentProps } from "./types";
import {
  TextField,
  TextAreaField,
  DateField,
  NumberField,
  SelectField,
  MultiSelectField,
  BooleanField,
} from "./fields";
import { CodedSearchField } from "./coded-search";
import { RepeatingGroupField } from "./repeating-group";
import { OldcartsField } from "./oldcarts";
import { RosGridField } from "./ros-grid";
import { ConsentField } from "./consent";

export const FIELD_COMPONENTS: Record<string, FieldComponent> = {
  text: TextField,
  textarea: TextAreaField,
  date: DateField,
  number: NumberField,
  select: SelectField,
  multiselect: MultiSelectField,
  boolean: BooleanField,
  coded_search: CodedSearchField,
  group: RepeatingGroupField,
  oldcarts: OldcartsField,
  ros_grid: RosGridField,
  consent: ConsentField,
};

export function FallbackField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  // Unknown type -> render as plain text so data is still captured, and mark it
  // so a reviewer notices the template used an unsupported type.
  return (
    <div className="space-y-1.5" data-testid={`${idBase}-fallback`}>
      <label htmlFor={idBase} className="block text-sm font-medium text-foreground">
        {field.label || field.key}
      </label>
      <input
        id={idBase}
        type="text"
        className="w-full min-h-11 rounded-[var(--cs-radius-btn)] border border-border bg-card px-3 py-2 text-base text-foreground"
        value={value === undefined || value === null ? "" : String(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-[var(--cs-warning)]">Unsupported field type: {field.type}</p>
    </div>
  );
}

export function FieldRenderer(props: FieldComponentProps) {
  const Component = FIELD_COMPONENTS[props.field.type] ?? FallbackField;
  return <Component {...props} />;
}
