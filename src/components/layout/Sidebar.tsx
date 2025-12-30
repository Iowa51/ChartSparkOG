"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Video,
  Pill,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tier?: "starter" | "pro" | "complete";
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Encounters", href: "/encounters", icon: ClipboardList },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "References", href: "/references", icon: BookOpen },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Calendar", href: "/calendar", icon: Calendar, tier: "pro" },
  { label: "Telehealth", href: "/telehealth", icon: Video, tier: "pro" },
  { label: "E-Prescribe", href: "/e-prescribe", icon: Pill, tier: "complete" },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0">
      {/* Logo & Brand */}
      <div className="pt-6 px-6 pb-6">
        <Link href="/dashboard" className="block mb-6 -ml-1">
          <div className="relative h-14 w-full flex items-center">
            <img
              src="/ChartSparkLogo.png"
              alt="ChartSpark"
              className="w-[140%] h-auto max-w-none -translate-x-4 -translate-y-2"
            />
          </div>
        </Link>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                {item.tier && (
                  <span className={cn(
                    "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    item.tier === "pro"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  )}>
                    {item.tier.toUpperCase()}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-6 border-t border-border">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}

        {/* User Profile */}
        <div className="flex flex-col items-center gap-2 mt-4 px-4 py-4 bg-muted/30 rounded-2xl border border-border/50">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-base border-2 border-primary/10">
              SK
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-foreground text-sm font-bold">Dr. Sarah K.</p>
            <Link
              href="/settings"
              className="text-primary text-xs font-medium hover:underline mt-0.5"
            >
              View Profile
            </Link>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('demoMode');
              document.cookie = "demoMode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = '/login';
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-xs font-semibold"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
