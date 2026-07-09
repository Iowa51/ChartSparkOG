"use client";

// Primitive field components. Each maps one field.type to a control and is
// registered in registry.tsx. Kept intentionally dumb: value in, onChange out.

import { cn } from "@/lib/utils";
import type { FieldComponentProps } from "./types";
import { FieldShell, TextControl, TextAreaControl, SelectControl } from "./controls";

function asString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function TextField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  return (
    <FieldShell label={field.label} htmlFor={idBase} required={field.required} help={field.help}>
      <TextControl
        id={idBase}
        data-testid={idBase}
        type="text"
        value={asString(value)}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function TextAreaField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  return (
    <FieldShell label={field.label} htmlFor={idBase} required={field.required} help={field.help}>
      <TextAreaControl
        id={idBase}
        data-testid={idBase}
        value={asString(value)}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function DateField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  return (
    <FieldShell label={field.label} htmlFor={idBase} required={field.required} help={field.help}>
      <TextControl
        id={idBase}
        data-testid={idBase}
        type="date"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function NumberField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  return (
    <FieldShell label={field.label} htmlFor={idBase} required={field.required} help={field.help}>
      <TextControl
        id={idBase}
        data-testid={idBase}
        type="number"
        inputMode="decimal"
        value={asString(value)}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </FieldShell>
  );
}

export function SelectField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  const options = field.options ?? [];
  return (
    <FieldShell label={field.label} htmlFor={idBase} required={field.required} help={field.help}>
      <SelectControl
        id={idBase}
        data-testid={idBase}
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </SelectControl>
    </FieldShell>
  );
}

export function MultiSelectField({
  field,
  value,
  onChange,
  disabled,
  idBase,
}: FieldComponentProps) {
  const options = field.options ?? [];
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
  return (
    <FieldShell label={field.label} required={field.required} help={field.help}>
      <div className="flex flex-col gap-2" data-testid={idBase}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <label
              key={opt}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--cs-radius-btn)] border px-3",
                on ? "border-primary bg-primary/5" : "border-border bg-card",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--cs-teal)]"
                checked={on}
                disabled={disabled}
                onChange={() => toggle(opt)}
              />
              <span className="text-base text-foreground">{opt}</span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function BooleanField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--cs-radius-btn)] border px-3 py-2",
        value === true ? "border-primary bg-primary/5" : "border-border bg-card",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        data-testid={idBase}
        className="h-5 w-5 accent-[var(--cs-teal)]"
        checked={value === true}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-base text-foreground">
        {field.label}
        {field.required ? <span className="ml-0.5 text-[var(--cs-danger)]">*</span> : null}
      </span>
    </label>
  );
}
