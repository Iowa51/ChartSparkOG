"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserProfile } from "@/components/layout/use-current-user-profile";
import { Search, Bell, HelpCircle, Settings, LogOut, User } from "lucide-react";

export function CSTopNavbar() {
  const router = useRouter();
  const supabase = createClient();
  const profile = useCurrentUserProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("demoMode");
    document.cookie = "demoMode=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("cs_notifications");
    localStorage.removeItem("cs_licenses");
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-4 px-4 lg:px-6 border-b"
      style={{
        height: "var(--cs-nav-height)",
        background: "var(--cs-nav-bg)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo / wordmark */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[var(--cs-coral)] text-white text-[11px] font-bold">CS</span>
        <span className="text-white text-[13px] font-semibold tracking-tight">ChartSpark</span>
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-xl ml-4">
        <div className="flex items-center gap-2 px-3 h-8 rounded-md bg-white/10 text-white/70 text-xs">
          <Search className="h-3.5 w-3.5" />
          <input
            type="search"
            placeholder="Search patients, notes, claims…"
            className="flex-1 bg-transparent outline-none placeholder:text-white/50 text-white"
          />
        </div>
      </div>

      {/* Icon row */}
      <div className="flex items-center gap-1 text-white/80 ml-auto">
        <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <Link href="/settings" className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Link>

        {/* Profile menu */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-[var(--cs-coral)] text-white text-[11px] font-semibold"
            aria-label="Profile menu"
          >
            {profile.initials}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-[var(--cs-radius-card)] border border-[var(--cs-card-border)] bg-[var(--cs-card-bg)] py-1 z-50"
              style={{ boxShadow: "var(--cs-shadow-popover)" }}
            >
              <div className="px-3 py-2 border-b border-[var(--cs-card-border)]">
                <p className="text-sm font-medium text-[var(--cs-text-primary)] truncate">{profile.fullName}</p>
                <p className="text-xs text-[var(--cs-text-muted)] truncate">{profile.subtitle}</p>
              </div>
              <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)]">
                <User className="h-3.5 w-3.5" /> Profile & Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--cs-danger)] hover:bg-[var(--cs-danger-light)]"
              >
                <LogOut className="h-3.5 w-3.5" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
