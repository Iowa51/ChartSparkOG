"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface CSPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function CSPageHeader({ title, subtitle, actions, className }: CSPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4 pb-4 mb-6 border-b border-[var(--cs-border)]",
        className
      )}
    >
      <div>
        <h1 className="text-xl font-semibold text-[var(--cs-text-primary)]">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--cs-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
