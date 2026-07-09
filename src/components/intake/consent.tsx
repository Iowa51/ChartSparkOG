"use client";

// Consent block: checkbox + captured timestamp + template version. Checking it
// stamps { value:true, at:<ISO>, template_version } so the affirmative consent
// carries when and against which template version it was given.

import { cn } from "@/lib/utils";
import type { ConsentValue } from "@/lib/intake/types";
import type { FieldComponentProps } from "./types";
import { useIntakeMeta } from "./context";

export function ConsentField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  const meta = useIntakeMeta();
  const consent = (value as ConsentValue | null) ?? null;
  const checked = consent?.value === true;

  const toggle = (next: boolean) => {
    const captured: ConsentValue = next
      ? { value: true, at: new Date().toISOString(), template_version: meta.templateVersion }
      : { value: false, at: null, template_version: meta.templateVersion };
    onChange(captured);
  };

  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--cs-radius-card)] border px-3 py-3",
        checked ? "border-primary bg-primary/5" : "border-border bg-card",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        data-testid={idBase}
        className="mt-0.5 h-5 w-5 accent-[var(--cs-teal)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => toggle(e.target.checked)}
      />
      <span className="text-base text-foreground">
        {field.label}
        {field.required ? <span className="ml-0.5 text-[var(--cs-danger)]">*</span> : null}
        {checked && consent?.at ? (
          <span
            className="mt-1 block text-xs text-muted-foreground"
            data-testid={`${idBase}-stamp`}
          >
            Agreed {new Date(consent.at).toLocaleString()}
            {consent.template_version ? ` (v${consent.template_version})` : ""}
          </span>
        ) : null}
      </span>
    </label>
  );
}
