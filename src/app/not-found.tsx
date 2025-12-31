"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function RootNotFound() {
    const [returnPath, setReturnPath] = useState("/dashboard");
    const [returnLabel, setReturnLabel] = useState("Return to Dashboard");

    useEffect(() => {
        const path = window.location.pathname;
        if (path.includes('/super-admin')) {
            setReturnPath('/super-admin');
            setReturnLabel('Return to Super Admin');
        } else if (path.includes('/admin')) {
            setReturnPath('/admin');
            setReturnLabel('Return to Admin Console');
        } else {
            setReturnPath('/dashboard');
            setReturnLabel('Return to Dashboard');
        }
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
            {/* Background decorative element */}
            <h1 className="text-[12rem] font-black text-slate-100 dark:text-slate-900 absolute -z-10 select-none">
                404
            </h1>

            <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <img
                        src="/ChartSparkLogo.png"
                        alt="ChartSpark"
                        className="h-8 w-auto grayscale brightness-0 dark:invert"
                    />
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-3">
                    Page Not Found
                </h2>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                    The requested page doesn't exist or has been moved to a new location in the clinical suite.
                </p>

                <div className="flex flex-col gap-3">
                    <Link
                        href={returnPath}
                        className="inline-flex w-full items-center justify-center bg-primary text-white py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                    >
                        {returnLabel}
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex w-full items-center justify-center bg-transparent text-muted-foreground py-3 rounded-xl font-bold hover:text-foreground hover:bg-muted/50 transition-all text-sm gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
