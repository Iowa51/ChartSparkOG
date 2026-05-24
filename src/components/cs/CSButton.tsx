"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface CSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "coral";
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function CSButton({
  className,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  ...props
}: CSButtonProps) {
  const variantStyle = {
    primary:   "bg-[var(--cs-teal)] text-white hover:bg-[var(--cs-teal-mid)] active:opacity-90 disabled:opacity-50",
    secondary: "bg-[var(--cs-teal-light)] text-[var(--cs-teal)] hover:bg-[var(--cs-card-border)] disabled:opacity-50",
    ghost:     "bg-transparent text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)] disabled:opacity-50",
    danger:    "bg-[var(--cs-danger)] text-white hover:opacity-90 disabled:opacity-50",
    coral:     "bg-[var(--cs-coral)] text-white hover:opacity-90 disabled:opacity-50",
  };
  const sizeStyle = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-sm gap-2",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--cs-radius-btn)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cs-teal)] focus-visible:ring-offset-2",
        variantStyle[variant],
        sizeStyle[size],
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
