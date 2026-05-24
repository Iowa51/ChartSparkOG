"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
            // Force redirect even on error
            window.location.href = "/login";
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-[var(--cs-text-muted)] hover:text-[var(--cs-danger)] hover:bg-[var(--cs-danger-light)] rounded-md transition-colors disabled:opacity-50"
            aria-label="Log out of your account"
        >
            {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <LogOut className="h-3.5 w-3.5" />
            )}
            Log out
        </button>
    );
}
