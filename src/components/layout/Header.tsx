"use client";

import { Menu, Bell } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: { label: string; href?: string }[];
    actions?: React.ReactNode;
}

export function Header({ title, description, breadcrumbs, actions }: HeaderProps) {
    return (
        <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border px-6 py-4 lg:px-10 shadow-sm">
            <div className="max-w-7xl mx-auto w-full">
                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={index} className="flex items-center gap-2">
                                {index > 0 && (
                                    <span className="text-border">/</span>
                                )}
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-primary font-medium">{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {/* Title Row */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-muted-foreground text-base mt-1">{description}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mobile menu toggle */}
                        <button className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted/50 transition-colors lg:hidden">
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Notifications */}
                        <button className="relative flex items-center justify-center h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
                        </button>

                        {/* Custom actions */}
                        {actions}
                    </div>
                </div>
            </div>
        </header>
    );
}
