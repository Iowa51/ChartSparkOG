"use client";

// OLDCARTS composite (Onset, Location, Duration, Character, Aggravating,
// Relieving, Timing, Severity). A generic labelled group; the value is a flat
// object keyed by the 8 slots. Templates may instead encode these as 8 primitive
// fields (the seed FM template does) -- both paths are supported.

import type { FieldComponentProps } from "./types";
import { FieldShell, TextControl } from "./controls";

const SLOTS: { key: string; label: string; type: "text" | "number" }[] = [
  { key: "onset", label: "Onset", type: "text" },
  { key: "location", label: "Location", type: "text" },
  { key: "duration", label: "Duration", type: "text" },
  { key: "character", label: "Character", type: "text" },
  { key: "aggravating", label: "Aggravating factors", type: "text" },
  { key: "relieving", label: "Relieving factors", type: "text" },
  { key: "timing", label: "Timing", type: "text" },
  { key: "severity", label: "Severity (0-10)", type: "number" },
];

export function OldcartsField({ field, value, onChange, disabled, idBase }: FieldComponentProps) {
  const obj = (value as Record<string, unknown> | null) ?? {};
  const set = (key: string, v: unknown) => onChange({ ...obj, [key]: v });

  return (
    <fieldset className="space-y-3" data-testid={idBase}>
      {field.label ? (
        <legend className="text-sm font-medium text-foreground">{field.label}</legend>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <FieldShell key={slot.key} label={slot.label} htmlFor={`${idBase}-${slot.key}`}>
            <TextControl
              id={`${idBase}-${slot.key}`}
              data-testid={`${idBase}-${slot.key}`}
              type={slot.type}
              inputMode={slot.type === "number" ? "decimal" : undefined}
              value={
                obj[slot.key] === undefined || obj[slot.key] === null ? "" : String(obj[slot.key])
              }
              disabled={disabled}
              onChange={(e) =>
                set(
                  slot.key,
                  slot.type === "number"
                    ? e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          </FieldShell>
        ))}
      </div>
    </fieldset>
  );
}
