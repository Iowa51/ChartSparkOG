"use client";

// Mobile-first form primitives. The design system (src/components/cs) has no
// input primitives, so these are the intake form's controls: full-width, 44px+
// tap targets, 16px text (no iOS zoom), semantic tokens (light/dark + Tebra
// palette for free). No cva -- variant-free, matching the repo convention.

import type {
  ReactNode,
  SelectHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

// data-* attributes are only auto-allowed on intrinsic elements, not on custom
// components, so opt into a test id explicitly on these wrappers.
type WithTestId<T> = T & { "data-testid"?: string };

export const controlClass =
  "w-full min-h-11 rounded-[var(--cs-radius-btn)] border border-border bg-card px-3 py-2 " +
  "text-base text-foreground placeholder:text-muted-foreground " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function FieldShell({
  label,
  htmlFor,
  required,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ml-0.5 text-[var(--cs-danger)]">*</span> : null}
        </label>
      ) : null}
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

export function TextControl(props: WithTestId<InputHTMLAttributes<HTMLInputElement>>) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function TextAreaControl(props: WithTestId<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return <textarea {...props} className={cn(controlClass, "min-h-24 resize-y", props.className)} />;
}

export function SelectControl(props: WithTestId<SelectHTMLAttributes<HTMLSelectElement>>) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}
