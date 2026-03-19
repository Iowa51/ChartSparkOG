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
            // C6: Use getUser() for server-side verification (getSession() is client-only and spoofable)
            if (supabase) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setIsAuthorized(true);
                        return;
                    }
                } catch {
                    // Auth check failed — fall through to redirect
                }
            }

            // If neither, and we've given it a moment to stabilize
            // Increased to 800ms to allow for session recovery on back button
            const timer = setTimeout(() => {
                setIsAuthorized(false);
                router.push("/login");
            }, 800);

            return () => clearTimeout(timer);
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
