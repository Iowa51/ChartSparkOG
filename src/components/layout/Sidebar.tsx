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
  Shield,
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
    title: "Care Standards",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Encounters", href: "/encounters", icon: ClipboardList },
      { label: "Templates", href: "/templates", icon: FileText },
      { label: "References", href: "/references", icon: BookOpen },
    ]
  },
  {
    title: "Intelligence & Hub",
    items: [
      { label: "Clinical AI", href: "/ai-assistant", icon: Stethoscope, tier: "complete" },
      { label: "Treatment Plan", href: "/treatment-planner", icon: ClipboardList, tier: "complete" },
      { label: "Analytics", href: "/analytics/relapse", icon: LayoutDashboard, tier: "complete" },
      { label: "Integration", href: "/integrations", icon: Settings, tier: "complete" },
    ]
  },
  {
    title: "Practice Operations",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Calendar", href: "/calendar", icon: Calendar, tier: "pro" },
      { label: "Telehealth", href: "/telehealth", icon: Video, tier: "pro" },
      { label: "E-Prescribe", href: "/e-prescribe", icon: Pill, tier: "complete" },
    ]
  }
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Admin Console", href: "/admin", icon: Shield },
  { label: "Super Admin", href: "/super-admin", icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0">
      {/* Logo & Brand */}
      <div className="px-6 pb-6 pt-6">
        <Link href="/dashboard" className="block mb-6 -ml-1">
          <div className="relative h-14 w-full flex items-center pt-2">
            <img
              src="/ChartSparkLogo.png"
              alt="ChartSpark"
              className="w-[140%] h-auto max-w-none -translate-x-4"
            />
          </div>
        </Link>

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-320px)]">
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <h3 className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 pl-4">
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
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-sm border border-primary/10"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full shadow-lg shadow-primary/40" />
                    )}
                    <Icon className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
                    )} />
                    <span className="text-[13px] font-semibold whitespace-nowrap">{item.label}</span>
                    {item.tier && (
                      <span className={cn(
                        "ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-tighter shadow-sm",
                        item.tier === "pro"
                          ? "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
                          : "bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30"
                      )}>
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
      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
        <div className="space-y-1 mb-6">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[13px] font-bold",
                  isActive
                    ? "bg-primary/5 text-primary border border-primary/10"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Profile Card */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                SK
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-lg shadow-sm" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-slate-900 dark:text-white text-xs font-black truncate">Dr. Sarah K.</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-tight">Active Session</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('demoMode');
              document.cookie = "demoMode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800 hover:border-red-100 dark:hover:border-red-900/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
