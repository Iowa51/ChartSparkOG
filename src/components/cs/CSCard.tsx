"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface CSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted" | "outline";
  padding?: "none" | "sm" | "md" | "lg";
}

export function CSCard({
  className,
  variant = "default",
  padding = "md",
  children,
  ...props
}: CSCardProps) {
  const paddingMap = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };
  const variantStyle = {
    default: "bg-[var(--cs-card-bg)] border border-[var(--cs-card-border)] shadow-[var(--cs-shadow-card)]",
    muted: "bg-[var(--cs-teal-xlight)] border border-[var(--cs-card-border)]",
    outline: "bg-transparent border border-[var(--cs-card-border)]",
  };
  return (
    <div
      className={cn(
        "rounded-[var(--cs-radius-card)]",
        variantStyle[variant],
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CSCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CSCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-sm font-semibold text-[var(--cs-text-primary)]", className)} {...props}>
      {children}
    </h3>
  );
}
