"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    Percent,
    Settings,
    Stethoscope,
    Shield,
    TrendingUp,
    DollarSign,
    Award,
    Pill,
    Video,
    Calendar,
    BookOpen,
    ClipboardList,
    LogOut,
    CreditCard,
    Receipt,
    Activity,
    UserPlus,
    Plug,
    BarChart3,
    Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const adminNavItems = [
    { label: "Admin Home", href: "/admin", icon: LayoutDashboard },
    { label: "Analytics", href: "/admin/analytics", icon: Activity },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Invitations", href: "/admin/invitations", icon: UserPlus },
    { label: "Templates", href: "/admin/templates", icon: FileText },
    { label: "Submissions", href: "/admin/submissions", icon: ClipboardList },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Scheduled Reports", href: "/admin/scheduled-reports", icon: Calendar },
    { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
    { label: "Security Logs", href: "/admin/security/audit-logs", icon: Shield },
    { label: "Integrations", href: "/admin/integrations", icon: Plug },
    { label: "Billing Console", href: "/admin/billing", icon: CreditCard },
    { label: "Admin Settings", href: "/admin/settings", icon: Settings },
];

const superAdminNavItems = [
    { label: "Platform Overview", href: "/super-admin", icon: LayoutDashboard },
    { label: "All Organizations", href: "/super-admin/organizations", icon: Building2 },
    { label: "Platform Users", href: "/super-admin/users", icon: Users },
    { label: "Analytics", href: "/super-admin/analytics", icon: Activity },
    { label: "Invitations", href: "/super-admin/invitations", icon: UserPlus },
    { label: "Templates", href: "/super-admin/templates", icon: FileText },
    { label: "Reports", href: "/super-admin/reports", icon: BarChart3 },
    { label: "Scheduled Reports", href: "/super-admin/scheduled-reports", icon: Calendar },
    { label: "Webhooks", href: "/super-admin/webhooks", icon: Webhook },
    { label: "Security Logs", href: "/super-admin/audit-logs", icon: Shield },
    { label: "Auditors Hub", href: "/super-admin/auditors", icon: ClipboardList },
    { label: "Integrations", href: "/super-admin/integrations", icon: Plug },
    { label: "Managed Billing", href: "/super-admin/managed-billing", icon: Receipt },
    { label: "Platform Billing", href: "/super-admin/financials", icon: DollarSign },
];

const clinicianNavSections = [
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
            { label: "Integration", href: "/integrations", icon: Settings, tier: "complete" },
        ]
    },
    {
        title: "Practice Operations",
        items: [
            { label: "E-Prescribe", href: "/e-prescribe", icon: Pill, tier: "complete" },
            { label: "License Tracking", href: "/licensing", icon: Award, tier: "pro" },
            { label: "Billing", href: "/billing", icon: CreditCard },
            { label: "Calendar", href: "/calendar", icon: Calendar, tier: "pro" },
            { label: "Telehealth", href: "/telehealth", icon: Video, tier: "pro" },
        ]
    }
];

interface AdminSidebarProps {
    role?: string;
    context?: "admin" | "super-admin";
}

export function AdminSidebar({ role = "ADMIN", context = "admin" }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const supabase = createClient();

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

    // Use different nav items based on context
    const primaryNavItems = context === "super-admin" ? superAdminNavItems : adminNavItems;

    return (
        <aside className={cn(
            "hidden lg:flex flex-col w-64 h-screen sticky top-0 text-white transition-colors duration-300 shadow-2xl z-40",
            context === "super-admin" ? "bg-slate-950" : "bg-slate-900"
        )}>
            {/* Logo area */}
            <div className="px-6 pb-6 pt-6">
                <Link href={context === "super-admin" ? "/super-admin" : "/admin"} className="block mb-6 -ml-1">
                    <div className="relative h-14 w-full flex items-center pt-2">
                        <img
                            src="/assets/logo.svg"
                            alt="ChartSpark"
                            className="w-[140%] h-auto max-w-none -translate-x-4"
                            style={{ filter: "brightness(0) invert(1)" }}
                        />
                    </div>
                </Link>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-70">
                    <Shield className={cn("h-3.5 w-3.5", context === "super-admin" ? "text-purple-500" : "text-primary")} />
                    <span>{context === "super-admin" ? "Platform Control" : "Administrative Console"}</span>
                </div>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
                {/* Admin/SuperAdmin Specific Section */}
                <div className="mb-6 mt-2">
                    <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                        {context === "super-admin" ? "Platform Master" : "Management Console"}
                    </h3>
                    <div className="space-y-1">
                        {primaryNavItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/super-admin" && pathname.startsWith(item.href));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm group relative",
                                        isActive
                                            ? (context === "super-admin" ? "bg-purple-600/20 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]" : "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]")
                                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                    )}
                                >
                                    {isActive && (
                                        <div className={cn(
                                            "absolute left-0 w-1 h-5 rounded-r-full shadow-lg",
                                            context === "super-admin" ? "bg-purple-500 shadow-purple-500/40" : "bg-primary shadow-primary/40"
                                        )} />
                                    )}
                                    <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110", isActive ? (context === "super-admin" ? "text-purple-400" : "text-primary") : "text-slate-500")} />
                                    <span className="font-bold tracking-tight">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* User Profile & Global Actions */}
            <div className="p-4 border-t border-slate-800 bg-black/20">
                <Link
                    href={context === "super-admin" ? "/super-admin/settings" : "/admin/settings"}
                    className="flex items-center gap-3 mb-4 px-2 py-2 -mx-2 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-inner",
                        context === "super-admin" ? "bg-gradient-to-br from-purple-600 to-indigo-700" : "bg-gradient-to-br from-blue-600 to-primary"
                    )}>
                        {role === "SUPER_ADMIN" ? "SA" : "AD"}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-white text-[13px] font-black truncate leading-tight group-hover:text-primary transition-colors">
                            {role === "SUPER_ADMIN" ? "Platform Admin" : "Clinic Director"}
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            Click for Settings
                        </p>
                    </div>
                </Link>

                <div className="grid grid-cols-1 gap-2">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Terminate Session
                    </button>
                </div>
            </div>
        </aside>
    );
}
