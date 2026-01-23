"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AdminPageHeaderProps {
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    actions?: React.ReactNode;
}

export function AdminPageHeader({
    title,
    subtitle,
    backHref = "/admin",
    backLabel = "Back to Dashboard",
    actions,
}: AdminPageHeaderProps) {
    return (
        <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={backHref}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">{backLabel}</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-widest opacity-70">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    {actions && (
                        <div className="flex items-center gap-3">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
