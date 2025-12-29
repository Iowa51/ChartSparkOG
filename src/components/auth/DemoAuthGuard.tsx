"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DemoAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAuth = async () => {
            // Priority 1: Check Demo Mode
            const isDemo = localStorage.getItem("demoMode") === "true";
            if (isDemo) {
                setIsAuthorized(true);
                return;
            }

            // Priority 2: Check Real Supabase Session
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setIsAuthorized(true);
                    return;
                }
            }

            // If neither, send to login
            setIsAuthorized(false);
            router.push("/login");
        };

        checkAuth();
    }, [router, supabase]);

    if (isAuthorized === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return isAuthorized ? <>{children}</> : null;
}
