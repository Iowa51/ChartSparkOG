"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface CSBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "coral" | "muted";
}

export function CSBadge({ className, variant = "default", children, ...props }: CSBadgeProps) {
  const variantStyle = {
    default: "bg-[var(--cs-teal-light)] text-[var(--cs-teal)]",
    success: "bg-[var(--cs-success-light)] text-[var(--cs-success)]",
    warning: "bg-[var(--cs-warning-light)] text-[var(--cs-warning)]",
    danger:  "bg-[var(--cs-danger-light)] text-[var(--cs-danger)]",
    info:    "bg-[var(--cs-info-light)] text-[var(--cs-info)]",
    coral:   "bg-[var(--cs-coral-light)] text-[var(--cs-coral)]",
    muted:   "bg-[var(--cs-card-border)] text-[var(--cs-text-muted)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--cs-radius-pill)] text-[11px] font-medium",
        variantStyle[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
