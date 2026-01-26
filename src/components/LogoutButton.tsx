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
            className="w-full mt-2 flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
            {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                <LogOut className="h-5 w-5" />
            )}
            Sign Out
        </button>
    );
}
