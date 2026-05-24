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
    UserCog,
    PieChart,
    ShieldAlert,
    Database,
    Fingerprint,
    Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const adminNavItems = [
    { label: "Admin Home", href: "/admin", icon: LayoutDashboard },
    { label: "Analytics", href: "/admin/analytics", icon: Activity },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Profile Approvals", href: "/admin/profile-approvals", icon: UserCog },
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
    { label: "Billing Overview", href: "/super-admin/managed-billing", icon: Receipt },
    { label: "Revenue Analytics", href: "/super-admin/managed-billing/analytics", icon: PieChart },
    { label: "Denial Forensics", href: "/super-admin/managed-billing/denials", icon: ShieldAlert },
    { label: "Fee Schedules", href: "/super-admin/managed-billing/schedules", icon: Database },
    { label: "ERA Verification", href: "/super-admin/managed-billing/era-audit", icon: Fingerprint },
    { label: "Org Benchmarking", href: "/super-admin/managed-billing/organizations", icon: Layers },
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
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[var(--cs-sidebar-bg)] border-r border-[var(--cs-border)]">
            {/* Role badge */}
            <div className="px-4 py-3 border-b border-[var(--cs-border)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--cs-teal-light)] text-[var(--cs-teal)]">
                    {context === "super-admin" ? "Super Admin" : "Admin"}
                </span>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
                <h3 className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--cs-text-muted)] mb-1.5">
                    {context === "super-admin" ? "Platform Master" : "Management Console"}
                </h3>
                <div className="flex flex-col gap-0.5">
                    {primaryNavItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/super-admin" && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-[var(--cs-teal-light)] text-[var(--cs-teal)] border-l-[3px] border-[var(--cs-teal)]"
                                        : "text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)]"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* User Profile & Logout */}
            <div className="p-3 border-t border-[var(--cs-border)]">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="h-8 w-8 rounded-full bg-[var(--cs-teal)] flex items-center justify-center text-white text-xs font-semibold">
                        {role === "SUPER_ADMIN" ? "SA" : "AD"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--cs-text-primary)] truncate">
                            {role === "SUPER_ADMIN" ? "Platform Admin" : "Clinic Director"}
                        </p>
                        <p className="text-xs text-[var(--cs-text-muted)] truncate">
                            {context === "super-admin" ? "Platform console" : "Admin console"}
                        </p>
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
        </aside>
    );
}
