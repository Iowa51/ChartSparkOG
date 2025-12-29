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
      <div className="p-6">
        <Link href="/dashboard" className="block mb-6 -ml-1">
          <div className="relative h-14 w-full overflow-hidden">
            <img
              src="/ChartSparkLogo.png"
              alt="ChartSpark"
              className="absolute top-0 left-0 w-[140%] h-auto max-w-none -translate-x-4 -translate-y-1"
              style={{ clipPath: 'inset(0 0 38% 0)' }}
            />
          </div>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-0 ml-1 opacity-80">
            Practitioner Portal
          </p>
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
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.label}</span>
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
        <div className="flex items-center gap-3 mt-4 px-4 py-2">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            SK
          </div>
          <div className="flex flex-col flex-1">
            <p className="text-foreground text-sm font-semibold">Dr. Sarah K.</p>
            <p className="text-muted-foreground text-xs">View Profile</p>
          </div>
          <button
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
