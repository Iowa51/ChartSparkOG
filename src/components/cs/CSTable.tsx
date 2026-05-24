"use client";

import { cn } from "@/lib/utils";
import React from "react";

export function CSTable({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--cs-radius-card)] border border-[var(--cs-card-border)] bg-[var(--cs-card-bg)]">
      <table className={cn("w-full text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function CSTHead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-[var(--cs-teal-xlight)] border-b border-[var(--cs-card-border)]", className)} {...props}>
      {children}
    </thead>
  );
}

export function CSTH({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--cs-text-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function CSTR({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--cs-card-border)] last:border-0 hover:bg-[var(--cs-teal-xlight)] transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function CSTD({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-sm text-[var(--cs-text-secondary)]", className)} {...props}>
      {children}
    </td>
  );
}
