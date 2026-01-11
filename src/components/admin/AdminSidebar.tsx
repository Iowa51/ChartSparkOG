"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    Percent,
    Settings,
    ChevronLeft,
    Stethoscope,
    Shield,
    TrendingUp,
    DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/admin/organizations", icon: Building2 },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Submissions", href: "/submissions", icon: FileText },
    { label: "Billing", href: "/admin/billing", icon: FileText },
    { label: "System Health", href: "/admin/system-health", icon: Stethoscope },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

// Super Admin uses anchor links since it's a single-page dashboard
const superAdminNavItems = [
    { label: "Overview", href: "#overview", icon: LayoutDashboard },
    { label: "Organizations", href: "#organizations", icon: Building2 },
    { label: "Users", href: "#users", icon: Users },
    { label: "Insurance Claims", href: "#claims", icon: Shield },
    { label: "All Submissions", href: "/submissions", icon: FileText },
    { label: "Revenue", href: "#revenue", icon: DollarSign },
];

interface AdminSidebarProps {
    role?: string;
    context?: "admin" | "super-admin";
}

export function AdminSidebar({ role = "ADMIN", context = "admin" }: AdminSidebarProps) {
    const pathname = usePathname();

    // Use different nav items based on context
    const navItems = context === "super-admin" ? superAdminNavItems : adminNavItems;

    const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href.startsWith("#")) {
            e.preventDefault();
            const element = document.querySelector(href);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    return (
        <aside className={cn(
            "hidden lg:flex flex-col w-60 h-screen sticky top-0 text-white transition-colors duration-300",
            context === "super-admin" ? "bg-slate-950" : "bg-slate-900"
        )}>
            <div className="px-6 pb-6 pt-6">
                <Link href={context === "super-admin" ? "/super-admin" : "/admin"} className="block mb-6 -ml-1">
                    <div className="relative h-14 w-full flex items-center pt-2">
                        <img
                            src="/ChartSparkLogo.png"
                            alt="ChartSpark"
                            className="w-[140%] h-auto max-w-none -translate-x-4"
                            style={{ filter: "brightness(0) invert(1)" }}
                        />
                    </div>
                </Link>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">
                    <Shield className={cn("h-3 w-3", context === "super-admin" ? "text-purple-500" : "text-primary")} />
                    <span>{context === "super-admin" ? "Platform Command" : "Admin Console"}</span>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item, index) => {
                    const isActive = context === "super-admin"
                        ? index === 0 // First item is always "active" for super-admin since it's single page
                        : (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)));
                    const Icon = item.icon;

                    if (context === "super-admin") {
                        // Use regular anchor for super-admin (smooth scroll)
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                onClick={(e) => handleAnchorClick(e, item.href)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm cursor-pointer",
                                    index === 0
                                        ? "bg-purple-600 text-white font-bold"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </a>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm",
                                isActive
                                    ? "bg-primary text-white font-bold"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Back to App Link */}
            <div className="p-4 border-t border-slate-700/50">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to ChartSpark App
                </Link>
            </div>


            {/* Admin Profile & Logout */}
            <div className="p-4 border-t border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        context === "super-admin" ? "bg-purple-600" : "bg-primary"
                    )}>
                        {role === "SUPER_ADMIN" ? "SA" : "AD"}
                    </div>
                    <div className="flex flex-col">
                        <p className="text-white text-sm font-semibold">
                            {role === "SUPER_ADMIN" ? "Super Admin" : "Clinic Admin"}
                        </p>
                        <p className="text-slate-400 text-xs truncate max-w-[120px]">
                            {role === "SUPER_ADMIN" ? "admin@chartspark.io" : "ad@mountainview.com"}
                        </p>
                    </div>
                </div>
                <form action="/api/auth/signout" method="POST">
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                    >
                        Sign Out
                    </button>
                </form>
            </div>
        </aside>
    );
}

