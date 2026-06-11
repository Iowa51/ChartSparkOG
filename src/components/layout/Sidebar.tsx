"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserProfile } from "@/components/layout/use-current-user-profile";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Settings,
  Stethoscope,
  ClipboardList,
  BookOpen,
  Mic,
  Video,
  Pill,
  LogOut,
  Award,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tier?: "starter" | "pro" | "complete";
}

const navSections = [
  {
    title: "Clinical Care",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Encounters", href: "/encounters", icon: ClipboardList },
      { label: "Calendar", href: "/calendar", icon: Calendar, tier: "pro" as const },
      { label: "Telehealth", href: "/telehealth", icon: Video, tier: "pro" as const },
    ],
  },
  {
    title: "Clinical Notes",
    items: [
      { label: "Notes", href: "/notes", icon: FileText },
      { label: "AI Scribe", href: "/scribe", icon: Mic, tier: "complete" as const },
      {
        label: "AI Assistant",
        href: "/ai-assistant",
        icon: Stethoscope,
        tier: "complete" as const,
      },
      { label: "Templates", href: "/templates", icon: BookOpen },
    ],
  },
  {
    title: "Medications & Safety",
    items: [
      { label: "E-Prescribe", href: "/e-prescribe", icon: Pill, tier: "complete" as const },
      {
        label: "Smart Triage",
        href: "/smart-triage",
        icon: ShieldCheck,
        tier: "complete" as const,
      },
      {
        label: "Treatment Plan",
        href: "/treatment-planner",
        icon: ClipboardList,
        tier: "complete" as const,
      },
      { label: "References", href: "/references", icon: BookOpen },
      { label: "Geriatric Guide", href: "/references/geriatric", icon: BookOpen },
    ],
  },
  {
    title: "Outcomes & Analytics",
    items: [
      {
        label: "Analytics",
        href: "/analytics/relapse",
        icon: LayoutDashboard,
        tier: "complete" as const,
      },
      { label: "Integration", href: "/integrations", icon: Settings, tier: "complete" as const },
    ],
  },
  {
    title: "Billing & Practice",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      {
        label: "Claims Manager",
        href: "/billing/claims",
        icon: ClipboardList,
        tier: "complete" as const,
      },
      { label: "License Tracking", href: "/licensing", icon: Award, tier: "pro" as const },
    ],
  },
];

const bottomNavItems: NavItem[] = [{ label: "Settings", href: "/settings", icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const supabase = createClient();
  const profile = useCurrentUserProfile();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleLogout = async () => {
    // 1. Clear Demo Mode session data
    localStorage.removeItem("demoMode");
    document.cookie = "demoMode=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";

    // 2. Perform Supabase Sign Out if available
    if (supabase) {
      await supabase.auth.signOut();
    }

    // 3. Clear application states
    localStorage.removeItem("cs_notifications");
    localStorage.removeItem("cs_licenses");

    // 4. Force navigation and refresh
    router.push("/login");
    router.refresh();
  };

  if (!hasMounted) return null;

  return (
    <div
      className="flex flex-col w-full h-full"
      role="navigation"
      aria-label="Main sidebar navigation"
    >
      {/* Navigation */}
      <div className="px-3 pb-4 pt-4">
        <nav
          className="flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar max-h-[calc(100vh-220px)]"
          aria-label="Main navigation"
        >
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              <h3
                className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--cs-text-muted)] mb-1.5"
                id={`nav-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {section.title}
              </h3>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--cs-teal-light)] text-[var(--cs-teal)] border-l-[3px] border-[var(--cs-teal)]"
                        : "text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.tier && (
                      <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--cs-teal-light)] text-[var(--cs-teal)]">
                        {item.tier === "complete" ? "ELITE" : "PRO"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto">
        <div className="px-3 pb-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--cs-teal-light)] text-[var(--cs-teal)] border-l-[3px] border-[var(--cs-teal)]"
                    : "text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-[var(--cs-border)]">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-[var(--cs-teal)] flex items-center justify-center text-white text-xs font-semibold">
              {profile.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--cs-text-primary)] truncate">
                {profile.fullName}
              </p>
              <p className="text-xs text-[var(--cs-text-muted)] truncate">{profile.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-[var(--cs-text-muted)] hover:text-[var(--cs-danger)] hover:bg-[var(--cs-danger-light)] rounded-md transition-colors"
            aria-label="Log out of your account"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
