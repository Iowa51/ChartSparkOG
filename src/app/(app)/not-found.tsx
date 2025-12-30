"use client";

import Link from "next/link";
import { Header } from "@/components/layout";
import { AlertCircle, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function AppNotFound() {
    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Page Missing"
                description="The clinical resource you are looking for is unavailable."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "404 Error" }
                ]}
            />

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="h-20 w-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-10 w-10" />
                </div>

                <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Oops! Resource Not Found</h2>
                <p className="text-muted-foreground mb-10 max-w-md text-base leading-relaxed">
                    We couldn't find the specific record or page you requested. It might have been deleted, or you may have entered the wrong URL.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold text-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
