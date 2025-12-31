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
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/admin/organizations", icon: Building2 },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Billing Admin", href: "/super-admin/revenue", icon: FileText },
    { label: "Platform Fees", href: "/super-admin/fees", icon: Percent },
    { label: "System Health", href: "/super-admin/health", icon: Stethoscope },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
    role?: string;
    context?: "admin" | "super-admin";
}

export function AdminSidebar({ role = "ADMIN", context = "admin" }: AdminSidebarProps) {
    const pathname = usePathname();

    const navItems = adminNavItems.filter(item => {
        // Hide Platform Fees and Dashboard (super-admin) if not Super Admin
        if (role !== "SUPER_ADMIN" && (item.label === "Platform Fees" || item.href === "/super-admin")) return false;

        // Custom logic for Dashboard link based on context
        if (item.label === "Dashboard") {
            if (context === "admin" && item.href === "/super-admin") return false;
            if (context === "super-admin" && item.href === "/admin") return false;
        }

        return true;
    });

    // Add Admin Dashboard link if not present and context is admin
    const finalNavItems = [...navItems];
    if (context === "admin" && !finalNavItems.some(i => i.href === "/admin")) {
        finalNavItems.unshift({ label: "Dashboard", href: "/admin", icon: LayoutDashboard });
    }

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
                {finalNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/super-admin" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm",
                                isActive
                                    ? (context === "super-admin" ? "bg-purple-600 text-white font-bold" : "bg-primary text-white font-bold")
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

            {/* Admin Profile */}
            <div className="p-4 border-t border-slate-700/50">
                <div className="flex items-center gap-3">
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
            </div>
        </aside>
    );
}
